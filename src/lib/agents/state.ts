import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

/**
 * AgentState: The "Memory" of this AI application.
 * 
 * Think of this as a shared clipboard. As the AI moves from step to step 
 * (from planning -> risk classification -> execution), it reads from and writes to this state.
 */
export const AgentState = Annotation.Root({
  // 1. Conversation History: Keeps track of user inputs and AI responses.
  // Here, we tell it to append (concat) new messages to the existing list, rather than overwriting.
  messages: Annotation<BaseMessage[]>({
    reducer: (currentState, newMessages) => currentState.concat(newMessages),
    default: () => [],
  }),

  // 2. Risk Classification: How dangerous is the action the AI wants to take?
  risk_level: Annotation<"low" | "high" | "critical" | null>({
    reducer: (currentState, newValue) => newValue !== undefined ? newValue : currentState,
    default: () => null,
  }),

  // 3. Approval Workflow: Is the user currently looking at an approval prompt?
  approval_status: Annotation<"pending" | "approved" | "rejected" | null>({
    reducer: (currentState, newValue) => newValue !== undefined ? newValue : currentState,
    default: () => null,
  }),

  // 4. The Tool Call: What exact function/tool is the AI trying to run?
  pending_action: Annotation<any | null>({
    reducer: (currentState, newValue) => newValue !== undefined ? newValue : currentState,
    default: () => null,
  }),

  // 5. Auth0 Token Vault Scopes: What exact permissions do we need to ask the user for?
  requested_scopes: Annotation<string[]>({
    reducer: (currentState, newValue) => newValue !== undefined ? newValue : currentState,
    default: () => [],
  }),
});

export type AgentStateType = typeof AgentState.State;
