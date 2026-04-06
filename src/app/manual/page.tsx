import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { MessageSquare, ArrowRight, ShieldCheck, Github, Slack, Info } from "lucide-react";

export default async function ManualPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0C10] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* Sticky Header with Massive Return Button */}
      <header className="sticky top-0 z-50 flex items-center justify-between p-4 px-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-[#0B0C10]/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-bold font-mono text-sm leading-none">AC</span>
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              Copilot Manual
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Documentation</p>
          </div>
        </div>
        
        {/* Prominent Back to Chat Button */}
        <div>
          <a href="/" className="group flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:-translate-y-0.5">
            <MessageSquare size={16} /> 
            <span>Return to AI Chat</span>
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16 space-y-16">
        
        {/* Intro */}
        <section className="space-y-4 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">System Manual</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
            Welcome to the AI Action Approval Copilot. This system acts as your secure AI delegate, capable of autonomously interfacing with developers tools while strictly enforcing human-in-the-loop approval gates.
          </p>
        </section>

        {/* Security Framework */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-2xl font-bold">The Security Framework</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-6 shadow-sm shadow-blue-100 dark:shadow-none">
               <div className="w-3 h-3 bg-blue-500 rounded-full mb-4 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
               <h4 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-2">Low Risk</h4>
               <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-4">Read operations (e.g., listing repos) and non-destructive broadcasts.</p>
               <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs font-mono text-slate-500 border border-slate-100 dark:border-slate-800">
                 Requires standard Appover UI click.
               </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 shadow-sm shadow-amber-100 dark:shadow-none">
               <div className="w-3 h-3 bg-amber-500 rounded-full mb-4 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
               <h4 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-2">Medium Risk</h4>
               <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-4">Moderate write actions (e.g., creating issues, assigning tickets).</p>
               <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs font-mono text-slate-500 border border-slate-100 dark:border-slate-800">
                 Requires typing "approve" to confirm.
               </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/50 rounded-2xl p-6 shadow-sm shadow-orange-100 dark:shadow-none">
               <div className="w-3 h-3 bg-orange-500 rounded-full mb-4 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
               <h4 className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-2">High Risk</h4>
               <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-4">Major write operations (e.g., creating PRs, merging code).</p>
               <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs font-mono text-slate-500 border border-slate-100 dark:border-slate-800">
                 Requires typing the specific Action Target.
               </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 shadow-sm shadow-red-100 dark:shadow-none">
               <div className="w-3 h-3 bg-red-500 rounded-full mb-4 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
               <h4 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Critical Risk</h4>
               <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-4">Destructive operations (e.g., permanently deleting a repo).</p>
               <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs font-mono text-slate-500 border border-slate-100 dark:border-slate-800">
                 Requires full Auth0 biometric/WebAuthn Step-Up flow.
               </div>
            </div>
          </div>
        </section>

        {/* Integration: GitHub */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl">
              <Github size={24} />
            </div>
            <h3 className="text-2xl font-bold">GitHub Integration</h3>
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
               <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                 The AI agent connects directly to the GitHub API using token revocation vaults. It can act autonomously on your repositories.
               </p>
             </div>
             
             <div className="divide-y divide-slate-100 dark:divide-slate-800">
               <div className="p-6 flex flex-col md:flex-row gap-6">
                 <div className="md:w-1/3">
                   <h5 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Read Actions</h5>
                   <p className="text-xs text-slate-500 leading-relaxed">Commands that fetch state natively without mutating history.</p>
                 </div>
                 <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Queue Management</p>
                      <p className="text-xs text-slate-500">Compiles your authored open PRs and issues assigned to you globally.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">AI Code Review</p>
                      <p className="text-xs text-slate-500">Passes PR diff payloads to the LLM to locate bugs, security risks, and regressions.</p>
                    </div>
                 </div>
               </div>

               <div className="p-6 flex flex-col md:flex-row gap-6">
                 <div className="md:w-1/3">
                   <h5 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Write Actions</h5>
                   <p className="text-xs text-slate-500 leading-relaxed">Commands that create or deploy changes to your repositories.</p>
                 </div>
                 <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Branching & PRs</p>
                      <p className="text-xs text-slate-500">Cut new branches and instantly open Pull Requests directly from natural language.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Issue Management</p>
                      <p className="text-xs text-slate-500">Submit bugs, reply with comments recursively, and securely close tickets.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Deploy / Tag</p>
                      <p className="text-xs text-slate-500">Draft, tag, and publish official GitHub Releases natively.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Merge PRs</p>
                      <p className="text-xs text-slate-500">Squash and merge a Pull Request safely via explicit human confirmation.</p>
                    </div>
                 </div>
               </div>

               <div className="p-6 flex flex-col md:flex-row gap-6">
                 <div className="md:w-1/3">
                   <h5 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Destructive Actions</h5>
                   <p className="text-xs text-slate-500 leading-relaxed">Commands that permanently delete data or revoke access limits.</p>
                 </div>
                 <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-1.5 bg-red-500 text-white text-[9px] font-bold tracking-widest uppercase rounded-bl-lg">Critical Step-Up Required</div>
                      <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1 mt-3">Delete Repository</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Permanently nuke an entire GitHub repository. Triggers hardware key validation.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-1.5 bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-[9px] font-bold tracking-widest uppercase rounded-bl-lg">High Risk</div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 mt-3">Remove Collaborator</p>
                      <p className="text-xs text-slate-500">Demote or completely remove a user's access to a repository.</p>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        </section>

        {/* Integration: Slack */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="p-2 bg-[#4A154B]/10 text-[#4A154B] dark:text-[#E01E5A] rounded-xl">
              <Slack size={24} />
            </div>
            <h3 className="text-2xl font-bold">Slack Integration</h3>
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm p-6">
             <div className="flex flex-col md:flex-row gap-8 items-center">
               <div className="flex-1 space-y-4">
                 <div className="flex items-start gap-3">
                   <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">1</div>
                   <div>
                     <h4 className="font-bold text-slate-800 dark:text-slate-200">Channel Dispatches</h4>
                     <p className="text-sm text-slate-500 mt-1">Send structured notifications regarding deployment workflows directly to your team channels without context-switching.</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">2</div>
                   <div>
                     <h4 className="font-bold text-slate-800 dark:text-slate-200">Identity Resolution</h4>
                     <p className="text-sm text-slate-500 mt-1">The system bypasses generic Bot tokens by using the Management API to resolve your explicit Slack display name inside the workspace, maintaining clear accountability.</p>
                   </div>
                 </div>
               </div>
               
               {/* Decorative Terminal */}
               <div className="w-full md:w-2/5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                 <div className="flex items-center gap-1.5 mb-3">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                 </div>
                 <p className="font-mono text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
                   {">"} Ping team in #demo that server is down<br/><br/>
                   <span className="text-slate-500 dark:text-slate-500">AI: Pending User Approval to send slack message to channel "demo"</span>
                 </p>
               </div>
             </div>
          </div>
        </section>

      </main>
    </div>
  );
}
