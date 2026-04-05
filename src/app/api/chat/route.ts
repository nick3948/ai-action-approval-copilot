import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { agentGraph } from "@/lib/agents/graph";
import { HumanMessage } from "@langchain/core/messages";

export async function POST(req: Request) {
  try {
    // 1. Ensure the user is logged into Auth0
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const body = await req.json();
    const { messages, actionResponse, chatId = "default" } = body;

    // 2. Grab the Auth0 refresh token from the session.
    // This will be used by Auth0 AI SDK's Token Vault to exchange for a GitHub access token.
    const refreshToken = (session.tokenSet as any)?.refreshToken as string | undefined;

    // 3. Thread ID uniquely identifies this user + chat session for LangGraph's checkpointer.
    const config = {
      configurable: {
        thread_id: `${session.user.sub}-${chatId}`,
        auth0RefreshToken: refreshToken,
        auth0UserId: session.user.sub as string,
      }
    };

    // --- 4. THE RESUME FLOW (Human clicked Approve or Reject) ---
    if (actionResponse) {
      console.log(`[API] Resuming graph for user ${session.user.sub}. Action: ${actionResponse}`);

      await agentGraph.updateState(config, {
        approval_status: actionResponse
      });

      const finalState = await agentGraph.invoke(null, config);

      return NextResponse.json({ state: finalState });
    }

    // --- 5. THE STANDARD CHAT FLOW ---
    if (messages && messages.length > 0) {
      const latestText = messages[messages.length - 1].content;
      const humanMessage = new HumanMessage(latestText);

      console.log(`[API] Invoking agent for user ${session.user.sub} with: "${latestText}"`);

      const finalState = await agentGraph.invoke({ messages: [humanMessage] }, config);

      return NextResponse.json({ state: finalState });
    }

    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });

  } catch (error) {
    console.error("[API Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function GET(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId") || "default";

    const config = { configurable: { thread_id: `${session.user.sub}-${chatId}` } };

    // Checkpointer fetches the exact persisted state from the database/memory
    const finalState = await agentGraph.getState(config);

    return NextResponse.json({ state: finalState.values });
  } catch (error) {
    console.error("[API GET Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
