import { auth0 } from "@/lib/auth0";
import { getConnectedServices } from "@/lib/auth0-management";
import { redirect } from "next/navigation";

const INTEGRATIONS = [
  {
    id: "github",
    name: "GitHub",
    description: "Manage repos, issues, pull requests, branches, and releases using natural language.",
    icon: (
      <svg viewBox="0 0 16 16" className="w-7 h-7 fill-current">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    ),
    connectHref: "/auth/github",
    color: "#24292e",
    capabilities: ["List & manage repos", "Create & close issues", "Open & merge PRs", "Create branches & releases", "Delete repositories"],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send messages, post to channels, and manage notifications directly from the AI. (Tip: Type /invite @AI_Action_Approval_Copilot in any channel you want it to access!)",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
    ),
    connectHref: "/auth/slack",
    color: "#4A154B",
    capabilities: ["Send channel messages", "DM team members", "Post notifications", "Manage workflows"],
  },
  {
    id: "jira",
    name: "Jira",
    description: "Create tickets, update statuses, and manage sprints through conversational AI.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
        <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.001-1.005zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.058A5.218 5.218 0 0 0 24.016 12.49V1.005A1.001 1.001 0 0 0 23.013 0z" />
      </svg>
    ),
    connectHref: "#",
    color: "#0052CC",
    capabilities: ["Create & update tickets", "Manage sprints", "Track issues", "Update statuses"],
    comingSoon: true,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Create pages, update databases, and manage your workspace with AI assistance.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
      </svg>
    ),
    connectHref: "#",
    color: "#000000",
    capabilities: ["Create & edit pages", "Update databases", "Manage workspaces", "Search content"],
    comingSoon: true,
  },
];

export default async function IntegrationsPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  const connected = await getConnectedServices(session.user.sub).catch((err) => {
    console.error("[IntegrationsPage] Error fetching connected services:", err);
    return {
      github: false,
      slack: false,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0C10] text-slate-900 dark:text-slate-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-4 px-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-[#0B0C10]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold font-mono text-sm leading-none">AC</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              Action Approval Copilot
            </h1>
          </a>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            ← Back to Chat
          </a>
          <a href="/auth/logout" className="text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-1.5 rounded-full transition-colors text-slate-700 dark:text-slate-300">
            Logout
          </a>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold mb-2">Integrations</h2>
          <p className="text-slate-500 dark:text-slate-400 text-[15px]">
            Connect your tools and let AI perform actions on your behalf — every action requires your explicit approval.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {INTEGRATIONS.map((integration) => {
            const isConnected = (connected as any)[integration.id] ?? false;

            return (
              <div
                key={integration.id}
                className={`relative bg-white dark:bg-slate-900 rounded-2xl border p-6 flex flex-col gap-4 transition-all ${
                  isConnected
                    ? "border-indigo-300 dark:border-indigo-700 shadow-md shadow-indigo-100/50 dark:shadow-indigo-900/30"
                    : "border-slate-200 dark:border-slate-800 shadow-sm"
                }`}
              >
                {/* Service Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: integration.color }}
                    >
                      {integration.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">{integration.name}</h3>
                        {integration.comingSoon && (
                          <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                            SOON
                          </span>
                        )}
                      </div>
                      {isConnected ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          Connected
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Not connected</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {integration.description}
                </p>

                {/* Capabilities */}
                <ul className="flex flex-wrap gap-1.5">
                  {integration.capabilities.map((cap) => (
                    <li
                      key={cap}
                      className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg"
                    >
                      {cap}
                    </li>
                  ))}
                </ul>

                {/* Connect / Disconnect Button */}
                {isConnected ? (
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <div className="flex-1 text-center text-sm font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      ✓ Active
                    </div>
                  </div>
                ) : integration.comingSoon ? (
                  <button
                    disabled
                    className="mt-auto pt-2 text-sm font-medium text-center py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                  >
                    Coming soon
                  </button>
                ) : (
                  <a
                    href={integration.connectHref}
                    className="mt-auto pt-2 text-sm font-semibold text-center py-2 rounded-xl text-white transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: integration.color }}
                  >
                    Connect {integration.name}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
