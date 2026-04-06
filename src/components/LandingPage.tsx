import { ShieldCheck, Zap, GitPullRequest, MessageSquare, Terminal, Lock, CheckCircle2, ArrowRight, ShieldAlert, Cpu } from "lucide-react";

export function LandingPage() {
  return (
    <div className="flex-1 w-full overflow-y-auto scroll-smooth relative bg-slate-50 dark:bg-[#0B0C10]">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-purple-500/10 dark:bg-purple-500/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[150px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] dark:opacity-[0.03] mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-32 pb-24 md:pt-40 md:pb-32 flex flex-col items-center">

        {/* Hero Title */}
        <h1 className="text-4xl md:text-6xl text-center font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl leading-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          The Intelligent Copilot for
          <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500">
            High-Stakes Engineering Workflows
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base md:text-xl text-center text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          Delegating complex tasks to AI shouldn't mean compromising your infrastructure.
          Action Approval Copilot seamlessly integrates with GitHub and Slack, securely pausing execution until it receives your explicit sign-off.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <a
            href="/auth/login"
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-8 rounded-full shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            Start Building Securely
            <ArrowRight size={18} />
          </a>
          <a
            href="#features"
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold py-3.5 px-8 rounded-full transition-all w-full sm:w-auto"
          >
            Explore Integrations
          </a>
        </div>

        {/* Core Principles */}
        <div className="w-full mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Lock size={24} className="text-emerald-500" />,
              title: "Zero-Trust Architecture",
              desc: "No action runs without a human physically verifying the agent's proposed plan, parameters, and intent.",
            },
            {
              icon: <Zap size={24} className="text-amber-500" />,
              title: "Hyper-Productive Tooling",
              desc: "Automatically drafts PRs, scans code for bugs, and replies to GitHub issues in seconds.",
            },
            {
              icon: <ShieldAlert size={24} className="text-rose-500" />,
              title: "Strict 4-Tier Auditing",
              desc: "Risk is automatically classified into Low, Medium, High, or Critical, invoking Auth0 step-up authentication on destructive paths.",
            },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none relative group hover:-translate-y-1 transition-transform">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 mb-6 flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Bento Grid Showcase */}
        <div id="features" className="w-full mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">A unified developer control room</h2>
            <p className="text-slate-500 dark:text-slate-400">Everything you need to orchestrate complex operations, sandboxed dynamically.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
            {/* GitHub integration box */}
            <div className="md:col-span-2 row-span-1 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-sm flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="relative z-10 flex-1">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1A1F2E] text-slate-700 dark:text-slate-300 flex items-center justify-center mb-4">
                  <GitPullRequest size={20} />
                </div>
                <h3 className="text-2xl font-bold dark:text-white mb-2">Native GitHub Workflow</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[80%] leading-relaxed">
                  Your AI copilot can clone repos, merge code, create branches, format commit messages, and read your entire project queue autonomously—once approved.
                </p>
              </div>
              <div className="absolute bottom-6 right-6">
                <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" className="rounded-lg opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all" alt="GitHub Logo" />
              </div>
            </div>

            {/* AI Reasoning box */}
            <div className="col-span-1 row-span-1 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-400 p-8 shadow-lg shadow-indigo-500/20 text-white flex flex-col relative overflow-hidden group">
              <div className="relative z-10 flex-1 flex flex-col justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center mb-4 backdrop-blur-md">
                  <Cpu size={20} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Advanced Reasoning</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed">
                    Powered by state-of-the-art LLMs, interpreting vague "fix this" prompts into explicit Git commands.
                  </p>
                </div>
              </div>
            </div>

            {/* Slack box */}
            <div className="col-span-1 row-span-1 border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-sm flex flex-col relative overflow-hidden">
              <div className="relative z-10 flex-1">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1A1F2E] text-slate-700 dark:text-slate-300 flex items-center justify-center mb-4">
                  <MessageSquare size={20} />
                </div>
                <h3 className="text-xl font-bold dark:text-white mb-2">Team Syncing</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  Broadcast pipeline updates or ask teammates for PR reviews automatically via the Slack integration.
                </p>
              </div>
            </div>

            {/* Just In Time Access box */}
            <div className="md:col-span-2 row-span-1 border border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-900 dark:bg-[#08090C] p-8 shadow-sm flex flex-col relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:linear-gradient(to_bottom左右,black,transparent)]"></div>
              <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase">Security First</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Auth0 Token Vault Integration</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Never paste API keys again. Action Approval Copilot securely pulls short-lived tokens directly from your Auth0 session on-demand, executing commands with your explicit identity.
                  </p>
                </div>
                <div className="w-full md:w-1/3 bg-[#111218] rounded-xl border border-slate-800 p-4 font-mono text-[10px] text-slate-400 leading-loose shadow-inner h-full flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-purple-400">await</span> auth0.getSession();<br />
                  <span className="text-blue-400">const</span> token = <span className="text-purple-400">await</span> getGH();<br />
                  <span className="text-emerald-400">// Auth successful</span><br />
                  <span className="text-blue-400">if</span> (risk === <span className="text-amber-400">'high'</span>) {'{'} pause() {'}'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="w-full mt-32 mb-10 text-center relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-6">Ready to regain your focus?</h2>
          <a
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold py-3 px-8 rounded-full shadow-lg transition-all hover:scale-105"
          >
            Authenticate with Auth0
            <ShieldCheck size={18} />
          </a>
        </div>
      </div>
    </div>
  );
}
