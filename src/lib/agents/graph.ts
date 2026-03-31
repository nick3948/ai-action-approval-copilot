import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { AgentState, AgentStateType } from "./state";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { SystemMessage, AIMessage } from "@langchain/core/messages";

const llm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
});

const tools = [
  {
    name: "send_slack_message",
    description: "Send a direct message or post to a Slack channel. Use this when the user asks to message someone or post on Slack.",
    schema: z.object({
      channel: z.string().describe("The slack channel or user ID"),
      message: z.string().describe("The message to send")
    })
  },
  {
    name: "create_github_issue",
    description: "Create a new issue in a GitHub repository. Use this when the user asks to create an issue, bug, or ticket on GitHub.",
    schema: z.object({
      repo: z.string().describe("The repository name (e.g. owner/repo)"),
      title: z.string().describe("The title of the issue"),
      body: z.string().describe("The body/description of the issue")
    })
  },
  {
    name: "delete_github_repo",
    description: "Delete an entire GitHub repository. This is a critical action.",
    schema: z.object({
      repo: z.string().describe("The repository name to delete (e.g. owner/repo)"),
    })
  }
];

const llmWithTools = llm.bindTools(tools);

const SYSTEM_PROMPT = `You are the Action Approval Copilot.
You can converse with the user and help them with tasks.
If they ask you to perform an action (like sending a Slack message, creating a GitHub issue, or deleting a repo), you MUST use the provided tools.
Do NOT pretend to do the action. Always output a tool call.
If the user is just chatting, respond normally.
Your actions are safe because they will be paused for human approval before execution.`;

// 1. Define the Nodes (The Functions)
// Each node is simply a TypeScript function that receives the current \`state\`
// and returns an object showing what part of the state it wants to update.

async function agentNode(state: AgentStateType) {
  console.log("[Node: agent] AI is thinking and deciding which tool to use...");

  const messages = [
    new SystemMessage(SYSTEM_PROMPT),
    ...state.messages
  ];

  const response = await llmWithTools.invoke(messages);

  // Check if the AI decided to call a tool
  const toolCalls = (response as AIMessage).tool_calls || [];

  if (toolCalls.length > 0) {
    // We only handle one pending action at a time for simplicity in this demo.
    const firstAction = toolCalls[0];
    console.log("[Node: agent] Tool call chosen:", firstAction.name);

    return {
      messages: [response],
      pending_action: firstAction
    };
  }

  // If no tool call, just return the AI's chat response
  console.log("[Node: agent] AI responded with text.");
  return {
    messages: [response],
    pending_action: null
  };
}

async function riskClassifierNode(state: AgentStateType) {
  console.log("[Node: risk_classifier] Checking if the planned action is dangerous...");

  // Here we check the pending_action. Is it safe or dangerous?
  return {
    // risk_level: "high" as const,
    // requested_scopes: ["chat:write"] 
  };
}

async function actionExecutionNode(state: AgentStateType) {
  console.log("[Node: action_execution] Fetching Auth0 token and running the tool...");

  // 1. Fetch token from Auth0 Token Vault
  // 2. Run the tool (e.g., call Slack API)

  // After it runs successfully, we clear the approval and risk states so the agent can continue.
  return {
    approval_status: null,
    risk_level: null,
    pending_action: null
  };
}

// 2. Define the Routing Logic (Conditional Edges)

function routeAfterClassification(state: AgentStateType) {
  // If the agent didn't want to run any tools, we are finished!
  if (!state.pending_action) {
    return END;
  }

  // Whether it is "low" or "high", we want to eventually go to 'action_execution'.
  // We will handle the "pause" mechanism when we compile the graph below.
  return "action_execution";
}

// 3. Build the StateGraph (The Flow-Chart)

const builder = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("risk_classifier", riskClassifierNode)
  .addNode("action_execution", actionExecutionNode)

  // 1. We start at the AI agent
  .addEdge(START, "agent")

  // 2. After the agent thinks, we ALWAYS classify the risk
  .addEdge("agent", "risk_classifier")

  // 3. After classification, we decide where to go (run the tool or end)
  .addConditionalEdges("risk_classifier", routeAfterClassification)

  // 4. After the tool executes, we go back to the agent so it can see the results
  .addEdge("action_execution", "agent");

// 4. Persistence & Compiling

// The Checkpointer ensures that if our graph pauses for human approval, 
// the memory doesn't disappear if the server restarts or the user closes the tab.
// (For local development we use MemorySaver, in prod we'd use Postgres).
export const checkpointer = new MemorySaver();

export const agentGraph = builder.compile({
  checkpointer: checkpointer,

  // We tell LangGraph to put a generic BREAKPOINT right before the 'action_execution' node runs.
  // Because of this, any time the graph reaches 'action_execution', it will physically stop running
  // and wait for you to call `.invoke(..., { resume: true })` from the next.js frontend.
  interruptBefore: ["action_execution"]
});
