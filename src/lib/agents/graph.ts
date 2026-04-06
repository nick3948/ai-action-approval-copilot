import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import pg from "pg";
import { AgentState, AgentStateType } from "./state";
import { TOOLS, TOOLS_MAP } from "./tools";
import { getServiceToken, getSlackProfileName } from "@/lib/auth0-management";
import * as gh from "@/lib/github-api";
import { getAuthenticatedUser } from "@/lib/github-api";
import * as slack from "@/lib/slack-api";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

// ─── In-process caches (survive across warm serverless invocations) ────────────

/** GitHub access token per Auth0 user — 15 min TTL (token rarely changes mid-session) */
const ghTokenCache = new Map<string, { token: string; cachedAt: number }>();
const GH_TOKEN_TTL_MS = 15 * 60 * 1000;

/** Repo list per GitHub token — 5 min TTL (repos don't change mid-session) */
const repoListCache = new Map<string, { names: string[]; cachedAt: number }>();
const REPO_LIST_TTL_MS = 5 * 60 * 1000;

async function getCachedGithubToken(userId: string): Promise<string> {
  const cached = ghTokenCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < GH_TOKEN_TTL_MS) return cached.token;
  const token = await getServiceToken(userId, "github");
  ghTokenCache.set(userId, { token, cachedAt: Date.now() });
  return token;
}

async function getCachedRepoNames(token: string): Promise<string[]> {
  const cached = repoListCache.get(token);
  if (cached && Date.now() - cached.cachedAt < REPO_LIST_TTL_MS) return cached.names;
  const repos = await gh.listRepos(token);
  const names = repos.map((r) => r.name.includes("/") ? r.name.split("/")[1] : r.name);
  repoListCache.set(token, { names, cachedAt: Date.now() });
  return names;
}

// ─── LLM Setup ────────────────────────────────────────────────────────────────

const llm = new ChatOpenAI({ modelName: process.env.GPT_MODEL || "gpt-4o-mini", temperature: 0 });
const llmWithTools = llm.bindTools(TOOLS);

function buildSystemPrompt(githubUsername?: string | null) {
  const ownerContext = githubUsername
    ? `
## Authenticated User
The currently authenticated GitHub user is **${githubUsername}**.
- When the user says "my repo", "my issues", "my PRs" etc., always use **${githubUsername}** as the owner.
- NEVER guess or infer a different owner. If a different owner is explicitly stated by the user, use that — otherwise always default to **${githubUsername}**.
`
    : `
## Authenticated User
The GitHub username is not yet known. If an action requires an owner and the user has not specified one, ask: "What is the GitHub username or org that owns this repo?". Do not guess.
`;

  return `You are the AI Action Approval Copilot — a secure AI copilot built for developer productivity. You help developers manage their GitHub workflows and team communication without leaving their chat interface.

Available tools (always use them, never say you can't):
${TOOLS.map((t) => `- ${t.name}: ${t.description.split(".")[0]}`).join("\n")}
${ownerContext}
## Behavior
1. **Always act when you have the right tool.** When the user requests an action that matches an available tool, invoke it immediately. Never say "I would do X" — just do X.
2. **CRITICAL — Never substitute tools.** If no tool exactly matches what the user asked for, clearly tell them: "I don't have a tool for that yet" and list what you CAN do. NEVER call a different tool as a workaround (e.g., do NOT call create_github_issue when the user asked to create a repository).
3. **Be a developer peer, not a robot.** Use concise, technical language. Reference concepts like PRs, branches, semver, CI/CD naturally.
4. **Infer missing context smartly.**
   - Owner: use the authenticated GitHub username above. Only override if the user explicitly names a different owner/org.
   - Always split "owner/repo" shorthand (e.g., "nick/my-app") into separate owner and repo fields.
   - For branch names, default to conventional formats: feat/, fix/, chore/, release/.
   - For release tags, default to semver: v1.0.0, v1.2.3, etc.
5. **Chain actions when it makes sense.** If a developer says "create a PR from feat/login to main", do it in one shot without asking for confirmation of each field.
6. **Proactively surface useful info.** After listing repos or issues, briefly note anything actionable (e.g., open PRs awaiting review, stale issues).
7. **All actions require human approval before execution.** This is a non-negotiable safety feature — every tool call pauses for user sign-off before running.

## Tool Selection Rules (follow exactly)
- "what's in my queue" / "my tasks" / "show my work" / "what do I have to do" → use \`get_my_queue\`
- "review PR" / "code review" / "review pull request #N" → use \`review_pull_request\`
- "comment on issue" / "add a note to PR" / "reply to #N" → use \`add_comment\`
- "create a repo" / "new repository" / "make a repo" → ALWAYS use \`create_github_repo\`
- "create an issue" / "open a bug" / "add a ticket" → use \`create_github_issue\`
- "delete a repo" / "remove a repository" → use \`delete_github_repo\`
- "open a PR" / "make a pull request" → use \`create_pull_request\`
- "cut a release" / "tag a version" → use \`create_release\`
- "new branch" / "create branch" → use \`create_branch\`
- "slack message" / "ping" → use \`send_slack_message\`
- If the user's intent doesn't match any tool — say so clearly, do NOT improvise with a wrong tool.

## Developer Workflow Mental Models
- "What's in my queue?" → get_my_queue (shows your open PRs, PRs to review, and assigned issues)
- "Review PR #3" → review_pull_request (fetches diff, AI generates detailed code review)
- "Comment on issue #5" → add_comment (posts your message to the issue/PR thread)
- "Create a repo" → create_github_repo (NEVER create_github_issue)
- "Open a PR" → infer base branch is main unless specified otherwise
- "Cut a release" → create a GitHub release with a semver tag
- "Close that issue" → refer to the most recently discussed issue number in context
- "Ping the team" → send a Slack message to #general or the channel they specify

## Senior Developer Guidance
- **Act like a senior developer with full-stack, system, and architecture expertise.** Always provide insight into best practices, design patterns, scalability, reliability, performance, and maintainability.
- **Be opinionated but practical.** Recommend solutions backed by experience, including trade-offs for time, cost, complexity, and risk.
- **Explain rationale when suggesting changes.** For example, explain why a database schema, caching strategy, or API design is chosen.
- **System and architecture guidance.** Suggest improvements for modularity, security, CI/CD pipelines, monitoring, logging, observability, cloud infra, and distributed systems.
- **Code review mentorship.** Highlight potential bugs, anti-patterns, performance issues, and security concerns in PRs.
- **Project and workflow optimization.** Recommend ways to speed up development, reduce technical debt, and improve team collaboration.
- **Always align suggestions with developer productivity.** Focus on solutions that save time, reduce repetitive work, and improve code quality without unnecessary complexity.
- **Do not compromise on security or maintainability** when giving advice.
- **Provide actionable next steps.** When pointing out issues or suggesting improvements, offer concrete steps or example code snippets if relevant.

You are a productivity multiplier. Be fast, accurate, and treat every developer like a senior engineer who knows what they're doing. Treat every user query as if you are mentoring a capable developer, not just automating actions. Combine practical execution with deep technical guidance.`;
}



// ─── Graph Nodes ──────────────────────────────────────────────────────────────

async function agentNode(state: AgentStateType, config: any) {
  console.log("[agent] Thinking...");
  const systemPrompt = buildSystemPrompt(state.github_username);
  const response = await llmWithTools.invoke([new SystemMessage(systemPrompt), ...state.messages]);
  const toolCalls = (response as AIMessage).tool_calls || [];

  if (toolCalls.length > 0) {
    console.log("[agent] Tool chosen:", toolCalls[0].name);
    const safeMessage = new AIMessage({
      content: response.content,
      tool_calls: [toolCalls[0]],
    });
    return { messages: [safeMessage], pending_action: toolCalls[0] };
  }

  console.log("[agent] Text response.");
  return { messages: [response], pending_action: null };
}

async function riskClassifierNode(state: AgentStateType, config: any) {
  const action = state.pending_action;
  if (!action?.name) return {};

  const tool = TOOLS_MAP[action.name];
  const risk_level = tool?.risk_level ?? "low";
  const requested_scopes = tool?.scopes ?? [];
  const isAuto = action.args?._auto === true;

  console.log(`[risk_classifier] "${action.name}" → ${risk_level}${isAuto ? " [auto/internal]" : ""}`);

  // Resolve fuzzy repo name BEFORE the interrupt so the approval card shows the correct name
  let correctedAction = action;
  if (action.args?.repo) {
    try {
      const userId: string | undefined = config?.configurable?.auth0UserId;
      if (userId) {
        const githubToken = await getCachedGithubToken(userId);
        const resolvedRepo = await resolveRepoName(githubToken, action.args.repo);
        if (resolvedRepo !== action.args.repo) {
          console.log(`[risk_classifier] Repo resolved: "${action.args.repo}" → "${resolvedRepo}"`);
          correctedAction = { ...action, args: { ...action.args, repo: resolvedRepo } };
        }
      }
    } catch (e) {
      console.warn("[risk_classifier] Could not resolve repo name:", e);
    }
  }

  return { risk_level, requested_scopes, pending_action: correctedAction, is_auto_action: isAuto };
}

async function actionExecutionNode(state: AgentStateType, config: any) {
  const action = state.pending_action;
  const args = action?.args ?? {};

  // Handle rejection
  if (state.approval_status === "rejected") {
    console.log("[action_execution] Action REJECTED by user.");
    return toolResult(action, "The user rejected this action. Inform them and do not retry.", state.github_username);
  }

  // Get GitHub token if needed
  let githubToken: string | null = null;
  let resolvedGithubUsername: string | null = state.github_username ?? null;

  if (action?.name?.includes("github") || action?.name?.includes("repo") || action?.name?.includes("pull") || action?.name?.includes("branch") || action?.name?.includes("release") || action?.name?.includes("issue") || action?.name?.includes("queue") || action?.name?.includes("comment")) {
    const userId: string | undefined = config?.configurable?.auth0UserId;
    if (!userId) return toolResult(action, "Error: No Auth0 user session. Please log in.", resolvedGithubUsername);

    try {
      githubToken = await getServiceToken(userId, "github");
      console.log("[action_execution] GitHub token retrieved via Auth0 Management API.");

      // Always resolve the real GitHub login from the token (not from Auth0 nickname)
      if (githubToken) {
        try {
          const ghUser = await getAuthenticatedUser(githubToken);
          resolvedGithubUsername = ghUser.login;

          // Auto-correct args.owner if the LLM guessed wrong or left it empty
          if (args.owner !== undefined && args.owner !== resolvedGithubUsername) {
            console.log(`[action_execution] Correcting owner: "${args.owner}" → "${resolvedGithubUsername}"`);
            args.owner = resolvedGithubUsername;
          } else if (!args.owner) {
            args.owner = resolvedGithubUsername;
          }
        } catch (e) {
          console.warn("[action_execution] Could not resolve GitHub username:", e);
        }
      }
    } catch (err: any) {
      return toolResult(action, `Error retrieving GitHub token: ${err.message}`, resolvedGithubUsername);
    }
  }

  // Get Slack token if needed
  let slackToken: string | null = null;
  if (action?.name?.includes("slack")) {
    const userId: string | undefined = config?.configurable?.auth0UserId;
    if (!userId) return toolResult(action, "Error: No Auth0 user session. Please log in.");

    if (action.name === "send_slack_message" && args.message) {
      let slackRealName: string | null = null;
      try {
        slackRealName = await getSlackProfileName(userId);
      } catch (e) { }

      const userName = slackRealName || config?.configurable?.auth0UserName || "A Developer";
      args.message = `*Message sent by ${userName} via Copilot:*\n${args.message}`;
    }

    try {
      slackToken = await getServiceToken(userId, "slack");
      console.log("[action_execution] Slack token retrieved via Auth0 Management API.");
    } catch (err: any) {
      return toolResult(action, `Error retrieving Slack token: ${err.message}`);
    }
  }

  // Execute the tool
  try {
    const result = await executeTool(action!.name, args, githubToken, slackToken);
    console.log("[action_execution] Success:", result.slice(0, 100));
    return toolResult(action, result, resolvedGithubUsername);
  } catch (err: any) {
    console.error("[action_execution] Error:", err.message);
    return toolResult(action, `Action failed: ${err.message}`, resolvedGithubUsername);
  }
}

// ─── Tool Executor ────────────────────────────────────────────────────────────

/**
 * Normalizes a repo name the user typed into a valid GitHub slug:
 * "ai action approval copilot" → "ai-action-approval-copilot"
 */
function slugify(name: string): string {
  return name
    .trim()
    // Split camelCase/PascalCase: "TextUtils" → "Text Utils", "myRepo" → "my Repo"
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Fuzzy-matches a user-provided repo name against the authenticated user's
 * actual repo list. Returns the best matching repo name, or the slugified
 * input if no good match is found.
 *
 * Strategy (in order):
 *  1. Exact match (after slugifying both sides)
 *  2. Slug of input is a substring of a real repo name (or vice versa)
 *  3. Falls back to the slugified input as-is
 */
async function resolveRepoName(token: string, inputRepo: string): Promise<string> {
  const slug = slugify(inputRepo);

  let repoNames: string[];
  try {
    repoNames = await getCachedRepoNames(token);
  } catch {
    return slug; // can't fetch repos, use best guess
  }

  // 1. Exact slug match
  const exact = repoNames.find((r) => slugify(r) === slug);
  if (exact) return exact;

  // 2. Substring match
  const partial = repoNames.find(
    (r) => slugify(r).includes(slug) || slug.includes(slugify(r))
  );
  if (partial) {
    console.log(`[resolveRepoName] Fuzzy matched "${inputRepo}" → "${partial}"`);
    return partial;
  }

  // 3. Token overlap (≥50%)
  const inputTokens = slug.split("-").filter(Boolean);
  let bestMatch: string | null = null;
  let bestScore = 0;
  for (const r of repoNames) {
    const repoTokens = slugify(r).split("-").filter(Boolean);
    const overlap = inputTokens.filter((t) => repoTokens.includes(t)).length;
    const score = overlap / Math.max(inputTokens.length, repoTokens.length);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = r;
    }
  }
  if (bestMatch) {
    console.log(`[resolveRepoName] Token-matched "${inputRepo}" → "${bestMatch}" (score: ${bestScore.toFixed(2)})`);
    return bestMatch;
  }

  return slug;
}

async function executeTool(name: string, args: Record<string, any>, githubToken: string | null, slackToken: string | null): Promise<string> {
  // Strip _auto meta-field — it's a signal to the approval system, not a real API arg
  const { _auto, ...cleanArgs } = args;
  args = cleanArgs;

  // Auto-resolve fuzzy repo names before any GitHub API call
  if (githubToken && args.repo) {
    args.repo = await resolveRepoName(githubToken, args.repo);
  }

  switch (name) {
    // Read-only
    case "list_github_repos": return formatRepos(await gh.listRepos(githubToken!));
    case "get_github_repo": return gh.getRepo(githubToken!, args.owner, args.repo);
    case "list_github_issues": return gh.listIssues(githubToken!, args.owner, args.repo, args.state);
    case "list_pull_requests": return gh.listPullRequests(githubToken!, args.owner, args.repo, args.state);
    case "list_branches": return gh.listBranches(githubToken!, args.owner, args.repo);
    case "get_my_queue": return gh.getMyQueue(githubToken!);
    case "review_pull_request": return gh.getPRForReview(githubToken!, args.owner, args.repo, args.pr_number);

    // Write
    case "create_github_repo": return gh.createRepo(githubToken!, args.name, args.description ?? "", args.private ?? false);
    case "create_github_issue": return gh.createIssue(githubToken!, args.owner, args.repo, args.title, args.body);
    case "close_github_issue": return gh.closeIssue(githubToken!, args.owner, args.repo, args.issue_number);
    case "add_comment": return gh.addComment(githubToken!, args.owner, args.repo, args.issue_number, args.body);
    case "create_pull_request": return gh.createPullRequest(githubToken!, args.owner, args.repo, args.title, args.head, args.base, args.body);
    case "create_branch": return gh.createBranch(githubToken!, args.owner, args.repo, args.branch, args.from_branch);
    case "create_release": return gh.createRelease(githubToken!, args.owner, args.repo, args.tag, args.name, args.body);


    // Destructive
    case "merge_pull_request": return gh.mergePullRequest(githubToken!, args.owner, args.repo, args.pr_number);
    case "delete_github_repo": return gh.deleteRepo(githubToken!, args.owner, args.repo);

    // Slack
    case "send_slack_message":
      return await slack.sendSlackMessage(slackToken!, args.channel, args.message);

    default:
      return `Unknown tool: ${name}`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toolResult(action: any, content: string, githubUsername?: string | null) {
  return {
    messages: [new ToolMessage({ tool_call_id: action.id, name: action.name, content })],
    approval_status: null,
    risk_level: null,
    pending_action: null,
    ...(githubUsername != null ? { github_username: githubUsername } : {}),
  };
}

function formatRepos(repos: any[]): string {
  if (repos.length === 0) return "No repositories found.";
  return repos.map((r) =>
    `• ${r.name} (${r.private ? "private" : "public"})${r.language ? ` [${r.language}]` : ""}${r.stars ? ` ⭐${r.stars}` : ""}`
  ).join("\n");
}

// ─── Graph Routing ────────────────────────────────────────────────────────────

function routeAfterClassification(state: AgentStateType) {
  return state.pending_action ? "action_execution" : END;
}

// ─── Checkpointer: Postgres (persistent) with MemorySaver fallback ───────────

async function createCheckpointer() {
  if (process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 5,
      });
      const pgCheckpointer = new PostgresSaver(pool);
      // Creates the required LangGraph tables if they don't exist yet
      await pgCheckpointer.setup();
      console.log("[checkpointer] ✅ Using Neon Postgres persistent storage.");
      return pgCheckpointer;
    } catch (err) {
      console.warn("[checkpointer] ⚠️ Postgres unavailable, falling back to MemorySaver:", err);
    }
  } else {
    console.log("[checkpointer] No DATABASE_URL set — using in-memory storage.");
  }
  return new MemorySaver();
}

// ─── Graph Construction ───────────────────────────────────────────────────────

const builder = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("risk_classifier", riskClassifierNode)
  .addNode("action_execution", actionExecutionNode)
  .addEdge(START, "agent")
  .addEdge("agent", "risk_classifier")
  .addConditionalEdges("risk_classifier", routeAfterClassification)
  .addEdge("action_execution", "agent");

let _agentGraph: ReturnType<typeof builder.compile> | null = null;

export async function getAgentGraph() {
  if (!_agentGraph) {
    const checkpointer = await createCheckpointer();
    _agentGraph = builder.compile({
      checkpointer,
      interruptBefore: ["action_execution"],
    });
  }
  return _agentGraph;
}

export const agentGraph = {
  invoke: async (...args: Parameters<ReturnType<typeof builder.compile>["invoke"]>) =>
    (await getAgentGraph()).invoke(...args),
  getState: async (...args: Parameters<ReturnType<typeof builder.compile>["getState"]>) =>
    (await getAgentGraph()).getState(...args),
  updateState: async (...args: Parameters<ReturnType<typeof builder.compile>["updateState"]>) =>
    (await getAgentGraph()).updateState(...args),
};
