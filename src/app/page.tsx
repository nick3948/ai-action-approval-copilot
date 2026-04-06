import { auth0 } from "@/lib/auth0";
import { ChatInterface } from "@/components/ChatInterface";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sidebar } from "@/components/Sidebar";
import { getConnectedServices } from "@/lib/auth0-management";
import { Suspense } from "react";
import { LandingPage } from "@/components/LandingPage";
import { UserMenu } from "@/components/UserMenu";

export default async function Home() {
  const session = await auth0.getSession();

  // Count connected integrations to show badge
  let connectedCount = 0;
  if (session) {
    const connected = await getConnectedServices(session.user.sub).catch(() => ({}));
    connectedCount = Object.values(connected).filter(Boolean).length;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0B0C10] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30">
      {session && (
        <Suspense fallback={<div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-[#0B0C10]/60 p-4" />}>
          <Sidebar />
        </Suspense>
      )}

      <div className="flex-1 flex flex-col relative min-w-0 h-full">
        <header className="absolute top-0 left-0 right-0 p-4 px-6 w-full z-50 flex items-start justify-between pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto tour-step-welcome">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold font-mono text-sm leading-none">AC</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 hidden sm:block">
              Action Approval Copilot
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
            <ThemeToggle />
            {session ? (
              <>
                <a
                  href="/integrations"
                  className="tour-step-integrations relative text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-full transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.474l6.733-3.366A2.52 2.52 0 0 1 13 4.5Z" />
                  </svg>
                  Integrations
                  {connectedCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {connectedCount}
                    </span>
                  )}
                </a>

                <UserMenu user={session.user} />
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
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500">Loading workspace...</div>}>
            <ChatInterface user={session.user} />
          </Suspense>
        ) : (
          <LandingPage />
        )}
      </div>
    </div>
  );
}
