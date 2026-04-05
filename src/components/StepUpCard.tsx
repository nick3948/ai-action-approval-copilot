"use client";

import { motion } from "framer-motion";
import { ShieldAlert, Lock, ArrowRight, TriangleAlert } from "lucide-react";

interface StepUpCardProps {
  actionName: string;
  actionDetails: Record<string, any>;
  chatId: string;
}

export function StepUpCard({ actionName, actionDetails, chatId }: StepUpCardProps) {
  const handleStepUp = () => {
    window.location.href = `/auth/step-up?chatId=${encodeURIComponent(chatId)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-lg rounded-xl border border-red-500/40 bg-card shadow-2xl shadow-red-500/10 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-red-500/30 bg-red-500/10">
        <div className="flex items-center gap-2 text-red-500">
          <ShieldAlert size={18} />
          <h3 className="font-semibold text-sm">Identity Verification Required</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/10 text-red-500">
          CRITICAL RISK
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Action summary */}
        <div>
          <h4 className="text-xl font-bold text-card-foreground mb-1 font-mono">{actionName}</h4>
          <p className="text-sm text-muted-foreground">
            This is a <span className="font-semibold text-red-500">destructive, irreversible action</span>. Before the AI agent can execute this, Auth0 requires you to re-verify your identity.
          </p>
        </div>

        {/* Auth0 Step-Up explanation */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-primary shrink-0" />
            <p className="text-sm font-semibold text-card-foreground">Why is this required?</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Auth0 Step-Up Authentication ensures that even if someone has access to your browser session, they cannot execute destructive actions without proving they are <strong>you</strong> — right now.
          </p>
          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              Low risk — approve/reject
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              Medium/High risk — type to confirm
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              Critical risk — Auth0 identity re-verification
            </div>
          </div>
        </div>

        {/* Action preview */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-card-foreground">Pending Action Preview</p>
          <div className="rounded-lg bg-zinc-950 p-3 overflow-x-auto border border-zinc-800 shadow-inner">
            <pre className="text-xs text-red-400 font-mono leading-relaxed">
              {JSON.stringify(actionDetails, null, 2)}
            </pre>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <TriangleAlert size={15} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-500/90 leading-relaxed">
            This action is <strong>permanent and cannot be undone</strong>. After verifying your identity, you will be given a final confirmation screen.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-muted/40 border-t border-border flex items-center justify-between gap-3 rounded-b-xl">
        <p className="text-xs text-muted-foreground">
          Powered by{" "}
          <span className="font-semibold text-card-foreground">Auth0 Step-Up Auth</span>
        </p>
        <button
          onClick={handleStepUp}
          className="px-5 py-2.5 flex items-center gap-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-600/30"
        >
          Verify Identity
          <ArrowRight size={15} />
        </button>
      </div>
    </motion.div>
  );
}
