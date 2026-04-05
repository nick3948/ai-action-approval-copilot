import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { AgentState, AgentStateType } from "./state";
import { TOOLS, TOOLS_MAP } from "./tools";
import { getGitHubToken } from "@/lib/auth0-management";
import * as gh from "@/lib/github-api";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

// ─── LLM Setup ────────────────────────────────────────────────────────────────

const llm = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });
const llmWithTools = llm.bindTools(TOOLS);

const SYSTEM_PROMPT = `You are the Action Approval Copilot — a secure AI assistant that performs GitHub and Slack actions on behalf of the user.

Available tools (always use them, never say you can't):
${TOOLS.map((t) => `- ${t.name}: ${t.description.split(".")[0]}`).join("\n")}

Rules:
1. ALWAYS use a tool when the user requests an action. Never describe what you would do — just do it.
2. For owner/repo parameters, ALWAYS split them into separate fields (owner: "nick3948", repo: "my-app").
3. If the user does not specify owner, assume their username based on context.
4. You can chain multiple tool calls in a conversation.
5. All actions are safe because a human reviews and approves each one before execution.`;

// ─── Graph Nodes ──────────────────────────────────────────────────────────────

async function agentNode(state: AgentStateType) {
  console.log("[agent] Thinking...");
  const response = await llmWithTools.invoke([new SystemMessage(SYSTEM_PROMPT), ...state.messages]);
  const toolCalls = (response as AIMessage).tool_calls || [];

  if (toolCalls.length > 0) {
    console.log("[agent] Tool chosen:", toolCalls[0].name);
    return { messages: [response], pending_action: toolCalls[0] };
  }

  console.log("[agent] Text response.");
  return { messages: [response], pending_action: null };
}

async function riskClassifierNode(state: AgentStateType) {
  const action = state.pending_action;
  if (!action?.name) return {};

  const tool = TOOLS_MAP[action.name];
  const risk_level = tool?.risk_level ?? "low";
  const requested_scopes = tool?.scopes ?? [];

  console.log(`[risk_classifier] "${action.name}" → ${risk_level}`);
  return { risk_level, requested_scopes };
}

async function actionExecutionNode(state: AgentStateType, config: any) {
  const action = state.pending_action;
  const args = action?.args ?? {};

  // Handle rejection
  if (state.approval_status === "rejected") {
    console.log("[action_execution] Action REJECTED by user.");
    return toolResult(action, "The user rejected this action. Inform them and do not retry.");
  }

  // Get GitHub token if needed
  let githubToken: string | null = null;
  if (action?.name?.includes("github") || action?.name?.includes("repo") || action?.name?.includes("pull") || action?.name?.includes("branch") || action?.name?.includes("release") || action?.name?.includes("issue")) {
    const userId: string | undefined = config?.configurable?.auth0UserId;
    if (!userId) return toolResult(action, "Error: No Auth0 user session. Please log in.");

    try {
      githubToken = await getGitHubToken(userId);
      console.log("[action_execution] GitHub token retrieved via Auth0 Management API.");
    } catch (err: any) {
      return toolResult(action, `Error retrieving GitHub token: ${err.message}`);
    }
  }

  // Execute the tool
  try {
    const result = await executeTool(action!.name, args, githubToken);
    console.log("[action_execution] Success:", result.slice(0, 100));
    return toolResult(action, result);
  } catch (err: any) {
    console.error("[action_execution] Error:", err.message);
    return toolResult(action, `Action failed: ${err.message}`);
  }
}

// ─── Tool Executor ────────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, any>, token: string | null): Promise<string> {
  const t = token!; // GitHub token (non-null for all github tools)

  switch (name) {
    // Read-only
    case "list_github_repos":       return formatRepos(await gh.listRepos(t));
    case "get_github_repo":         return gh.getRepo(t, args.owner, args.repo);
    case "list_github_issues":      return gh.listIssues(t, args.owner, args.repo, args.state);
    case "list_pull_requests":      return gh.listPullRequests(t, args.owner, args.repo, args.state);
    case "list_branches":           return gh.listBranches(t, args.owner, args.repo);

    // Write
    case "create_github_issue":     return gh.createIssue(t, args.owner, args.repo, args.title, args.body);
    case "close_github_issue":      return gh.closeIssue(t, args.owner, args.repo, args.issue_number);
    case "create_pull_request":     return gh.createPullRequest(t, args.owner, args.repo, args.title, args.head, args.base, args.body);
    case "create_branch":           return gh.createBranch(t, args.owner, args.repo, args.branch, args.from_branch);
    case "create_release":          return gh.createRelease(t, args.owner, args.repo, args.tag, args.name, args.body);

    // Destructive
    case "merge_pull_request":      return gh.mergePullRequest(t, args.owner, args.repo, args.pr_number);
    case "delete_github_repo":      return gh.deleteRepo(t, args.owner, args.repo);

    // Slack
    case "send_slack_message":
      return `[Demo] Slack message sent to ${args.channel}: "${args.message}"`;

    default:
      return `Unknown tool: ${name}`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toolResult(action: any, content: string) {
  return {
    messages: [new ToolMessage({ tool_call_id: action.id, name: action.name, content })],
    approval_status: null,
    risk_level: null,
    pending_action: null,
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

// ─── Graph Construction ───────────────────────────────────────────────────────

const builder = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("risk_classifier", riskClassifierNode)
  .addNode("action_execution", actionExecutionNode)
  .addEdge(START, "agent")
  .addEdge("agent", "risk_classifier")
  .addConditionalEdges("risk_classifier", routeAfterClassification)
  .addEdge("action_execution", "agent");

export const checkpointer = new MemorySaver();

export const agentGraph = builder.compile({
  checkpointer,
  interruptBefore: ["action_execution"],
});
