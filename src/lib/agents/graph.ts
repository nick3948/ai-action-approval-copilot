import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { AgentState, AgentStateType } from "./state";

// 1. Define the Nodes (The Functions)
// Each node is simply a TypeScript function that receives the current `state`
// and returns an object showing what part of the state it wants to update.

async function agentNode(state: AgentStateType) {
  console.log("[Node: agent] AI is thinking and deciding which tool to use...");

  // OpenAI logic will be written here later.
  return {
    // pending_action: { name: "send_slack_message", args: { message: "Hello!" } } 
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
