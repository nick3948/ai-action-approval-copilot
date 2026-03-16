import { Send } from "lucide-react";
import { auth0 } from "@/lib/auth0";

export default async function Home() {
  const session = await auth0.getSession();
  
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex h-16 items-center px-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold font-mono">AC</span>
          </div>
          <h1 className="text-xl font-bold">Action Approval Copilot</h1>
        </div>
        <div className="ml-auto">
          {session ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {session.user.picture && (
                  <img src={session.user.picture} alt={session.user.nickname} className="w-8 h-8 rounded-full" />
                )}
                <span className="text-sm font-medium">{session.user.nickname}</span>
              </div>
              <a
                href="/auth/logout"
                className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Logout
              </a>
            </div>
          ) : (
            <a
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Login
            </a>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 flex flex-col gap-4">
        <div className="flex gap-4 p-4 rounded-xl bg-muted/50 max-w-[80%] self-start border border-border">
          <div className="w-8 h-8 shrink-0 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold font-mono text-xs">AC</span>
          </div>
          <div>
            <p className="font-semibold mb-1 text-sm">Copilot</p>
            <p className="text-gray-600 mb-6 text-center">
              I&apos;m your AI Action Approval Copilot. I help you automate tasks securely.
              Before executing any high-risk actions on your behalf, I&apos;ll explain my plan and ask for your approval.
              What would you like to do today?
            </p>
          </div>
        </div>
      </main>

      <div className="p-4 border-t border-border bg-card">
        <form className="max-w-4xl mx-auto relative flex items-center">
          <input
            type="text"
            placeholder="e.g. Create a GitHub issue about the login bug and notify the team on Slack..."
            className="w-full pl-4 pr-12 py-4 rounded-full border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-2">
          AI generated actions are paused for approval. Use wisely.
        </p>
      </div>
    </div>
  );
}
