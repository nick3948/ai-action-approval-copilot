"use client";

import { motion } from "framer-motion";
import { Check, X, AlertTriangle, ShieldAlert, Key } from "lucide-react";
import { useState } from "react";

interface ApprovalCardProps {
  actionName: string;
  riskLevel: "low" | "high" | "critical";
  requestedScopes: string[];
  actionDetails: Record<string, any>;
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalCard({
  actionName,
  riskLevel,
  requestedScopes,
  actionDetails,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const [status, setStatus] = useState<"pending" | "approving" | "rejecting">("pending");

  const handleApprove = () => {
    setStatus("approving");
    setTimeout(onApprove, 800);
  };

  const handleReject = () => {
    setStatus("rejecting");
    setTimeout(onReject, 800);
  };

  const getRiskColors = () => {
    if (riskLevel === "critical") return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400";
    if (riskLevel === "high") return "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400";
    return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
  };

  const RiskIcon = riskLevel === "critical" ? ShieldAlert : AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl overflow-hidden"
    >
      <div className={`px-5 py-3 flex items-center justify-between border-b ${getRiskColors()}`}>
        <div className="flex items-center gap-2">
          <RiskIcon size={18} />
          <h3 className="font-semibold text-sm">Action Requires Approval</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-background border border-current shadow-sm">
          {riskLevel} RISK
        </span>
      </div>

      <div className="p-5 space-y-6">
        <div>
          <h4 className="text-xl font-bold text-card-foreground mb-1">{actionName}</h4>
          <p className="text-sm text-muted-foreground">
            The AI agent wants to execute this tool on your behalf. Please review the details below.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
            <Key size={16} className="text-primary" />
            <p>Access Scopes Requested</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {requestedScopes.map((scope) => (
              <span key={scope} className="px-2.5 py-1 rounded-md bg-muted text-xs font-mono border border-border">
                {scope}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-card-foreground">Action Details (Preview)</p>
          <div className="rounded-lg bg-zinc-950 p-4 overflow-x-auto border border-zinc-800 shadow-inner">
            <pre className="text-xs text-green-400 font-mono leading-relaxed">
              {JSON.stringify(actionDetails, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted/40 border-t border-border flex items-center justify-end gap-3 rounded-b-xl">
        <button
          onClick={handleReject}
          disabled={status !== "pending"}
          className="px-4 py-2 flex items-center gap-2 text-sm font-medium rounded-lg border border-input bg-background hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors disabled:opacity-50"
        >
          {status === "rejecting" ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-4 h-4 rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <X size={16} />
          )}
          Reject
        </button>
        <button
          onClick={handleApprove}
          disabled={status !== "pending"}
          className="px-5 py-2 flex items-center justify-center gap-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
        >
          {status === "approving" ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-4 h-4 rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Check size={16} />
          )}
          {riskLevel === "critical" ? "Approve & Authenticate" : "Approve Action"}
        </button>
      </div>
    </motion.div>
  );
}
