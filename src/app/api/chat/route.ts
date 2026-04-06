import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { agentGraph } from "@/lib/agents/graph";
import { HumanMessage } from "@langchain/core/messages";
import { getGitHubUsername } from "@/lib/auth0-management";

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
    const refreshToken = (session.tokenSet as any)?.refreshToken as string | undefined;

    const config = {
      configurable: {
        thread_id: `${session.user.sub}-${chatId}`,
        auth0RefreshToken: refreshToken,
        auth0UserId: session.user.sub as string,
        auth0UserName: (session.user.name || session.user.nickname || session.user.email || "A developer") as string,
      }
    };

    //  4. THE RESUME FLOW (Human clicked Approve or Reject)
    if (actionResponse) {
      // ── Auth0 Step-Up Verification (server-side) ───────────────────────────
      if (actionResponse === "approved") {
        const graphState = await agentGraph.getState({
          configurable: { thread_id: `${session.user.sub}-${body.chatId || "default"}` }
        });
        const currentRiskLevel = graphState?.values?.risk_level;

        if (currentRiskLevel === "critical") {
          const authTime = (session.user as any).auth_time as number | undefined;
          const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600;

          if (authTime && authTime < tenMinutesAgo) {
            console.warn(`[API] Step-up required: auth_time ${authTime} is older than 10 minutes.`);
            return NextResponse.json(
              { error: "step_up_required", message: "Please re-verify your identity before executing this critical action." },
              { status: 403 }
            );
          }
        }
      }

      await agentGraph.updateState(config, { approval_status: actionResponse });

      const finalState = await agentGraph.invoke(null, config);

      return NextResponse.json({ state: finalState });
    }

    // --- 5. THE STANDARD CHAT FLOW ---
    if (messages && messages.length > 0) {
      const latestText = messages[messages.length - 1].content;
      const humanMessage = new HumanMessage(latestText);

      // Resolve GitHub username (cached).
      const currentState = await agentGraph.getState(config);
      let githubUsername: string | null = currentState?.values?.github_username ?? null;
      if (!githubUsername) {
        githubUsername = await getGitHubUsername(session.user.sub as string).catch(() => null);
      }

      const initialState: Record<string, any> = { messages: [humanMessage] };
      if (githubUsername) initialState.github_username = githubUsername;

      let finalState = await agentGraph.invoke(initialState, config);

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
