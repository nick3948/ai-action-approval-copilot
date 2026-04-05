import { Send } from "lucide-react";
import { auth0 } from "@/lib/auth0";
import { ChatInterface } from "@/components/ChatInterface";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sidebar } from "@/components/Sidebar";
import { Suspense } from "react";

export default async function Home() {
  const session = await auth0.getSession();

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#0B0C10] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30">
      <header className="flex items-center justify-between p-4 px-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-[#0B0C10]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold font-mono text-sm leading-none">AC</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Action Approval Copilot
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          {session ? (
            <>
              {session.user.picture && (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shrink-0">
                  <img src={session.user.picture} alt="Avatar" className="w-5 h-5 rounded-full" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">{session.user.nickname}</span>
                </div>
              )}
              <a
                href="/auth/logout"
                className="text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-1.5 rounded-full transition-colors shadow-sm text-slate-700 dark:text-slate-300"
              >
                Logout
              </a>
            </>
          ) : (
            <a
              href="/auth/login"
              className="text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full transition-all shadow-md shadow-indigo-500/20"
            >
              Log in / Sign up
            </a>
          )}
        </div>
      </header>

      {session ? (
        <div className="flex-1 flex overflow-hidden">
          <Suspense fallback={<div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-[#0B0C10]/60 p-4" />}>
            <Sidebar />
          </Suspense>
          <div className="flex-1 flex flex-col min-w-0 relative">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500">Loading workspace...</div>}>
              <ChatInterface user={session.user} />
            </Suspense>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-5 max-w-lg p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20 mb-2">
              <span className="text-white font-bold font-mono text-3xl">AC</span>
            </div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">Secure AI Action Approval Copilot</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed">
              Experience the future of intelligent middleware. All complex operations like Slack messaging and GitHub management are securely paused and subjected to your explicit approval before execution.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
