"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertTriangle, ShieldAlert, Key, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";

interface ApprovalCardProps {
  actionName: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  requestedScopes: string[];
  actionDetails: Record<string, any>;
  confirmationTarget?: string;
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalCard({
  actionName,
  riskLevel,
  requestedScopes,
  actionDetails,
  confirmationTarget,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const [status, setStatus] = useState<"pending" | "approving" | "rejecting">("pending");
  const [confirmInput, setConfirmInput] = useState("");
  const [shakeError, setShakeError] = useState(false);

  const requiresConfirmation = riskLevel === "medium" || riskLevel === "high" || riskLevel === "critical";
  const isConfirmed = !requiresConfirmation || (confirmationTarget && confirmInput === confirmationTarget);

  const handleApprove = () => {
    if (!isConfirmed) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 600);
      return;
    }
    setStatus("approving");
    setTimeout(onApprove, 800);
  };

  const handleReject = () => {
    setStatus("rejecting");
    setTimeout(onReject, 800);
  };

  const getRiskConfig = () => {
    switch (riskLevel) {
      case "critical":
        return {
          border: "border-red-500/40 bg-red-500/10",
          text: "text-red-600 dark:text-red-400",
          badge: "bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400",
          btn: "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20",
          icon: ShieldAlert,
          label: "CRITICAL RISK",
        };
      case "high":
        return {
          border: "border-orange-500/40 bg-orange-500/10",
          text: "text-orange-600 dark:text-orange-400",
          badge: "bg-orange-500/10 border-orange-500/40 text-orange-600 dark:text-orange-400",
          btn: "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20",
          icon: TriangleAlert,
          label: "HIGH RISK",
        };
      case "medium":
        return {
          border: "border-yellow-500/40 bg-yellow-500/10",
          text: "text-yellow-600 dark:text-yellow-400",
          badge: "bg-yellow-500/10 border-yellow-500/40 text-yellow-600 dark:text-yellow-400",
          btn: "bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/20",
          icon: AlertTriangle,
          label: "MEDIUM RISK",
        };
      default:
        return {
          border: "border-blue-500/40 bg-blue-500/10",
          text: "text-blue-600 dark:text-blue-400",
          badge: "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400",
          btn: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20",
          icon: ShieldCheck,
          label: "LOW RISK",
        };
    }
  };

  const cfg = getRiskConfig();
  const RiskIcon = cfg.icon;

  const inputMatchColor =
    confirmInput.length === 0
      ? "border-border"
      : confirmInput === confirmationTarget
        ? "border-green-500 ring-1 ring-green-500/30"
        : "border-red-400 ring-1 ring-red-400/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className={`px-5 py-3 flex items-center justify-between border-b ${cfg.border}`}>
        <div className={`flex items-center gap-2 ${cfg.text}`}>
          <RiskIcon size={18} />
          <h3 className="font-semibold text-sm">Action Requires Approval</h3>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <h4 className="text-xl font-bold text-card-foreground mb-1 font-mono">
            {actionName.replace(/_/g, " ")}
          </h4>
          <p className="text-xs text-muted-foreground font-mono opacity-60 mt-0.5 mb-2">{actionName}</p>
          <p className="text-sm text-muted-foreground">
            The AI agent wants to execute this action on your behalf. Review details below before approving.
          </p>
        </div>

        {/* Scopes */}
        {requestedScopes && requestedScopes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <Key size={15} className="text-primary" />
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
        )}

        {/* Action Details — only shown when there are actual parameters */}
        {actionDetails && Object.keys(actionDetails).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-card-foreground">Action Parameters</p>
            <div className="rounded-lg bg-zinc-950 p-4 overflow-x-auto border border-zinc-800 shadow-inner">
              <pre className="text-xs text-green-400 font-mono leading-relaxed">
                {JSON.stringify(actionDetails, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Type-to-Confirm (medium / high / critical) */}
        {requiresConfirmation && confirmationTarget && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-card-foreground">
              {riskLevel === "critical"
                ? "⚠️ Type the repository name to confirm this destructive action:"
                : "Type the action name to confirm:"}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {confirmationTarget}
            </p>
            <AnimatePresence>
              <motion.input
                key="confirm-input"
                animate={shakeError ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                disabled={status !== "pending"}
                placeholder={`Type "${confirmationTarget}"`}
                spellCheck={false}
                autoComplete="off"
                className={`w-full px-3 py-2 rounded-lg bg-background border text-sm font-mono transition-all focus:outline-none disabled:opacity-50 ${inputMatchColor}`}
              />
            </AnimatePresence>
            {riskLevel === "critical" && (
              <p className="text-xs text-red-500/80 font-medium">
                This action is irreversible. Proceed only if you are absolutely certain.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
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
          disabled={status !== "pending" || !isConfirmed}
          className={`px-5 py-2 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${cfg.btn}`}
        >
          {status === "approving" ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-4 h-4 rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Check size={16} />
          )}
          {riskLevel === "critical" ? "Confirm & Delete" : riskLevel === "high" ? "Confirm Action" : "Approve Action"}
        </button>
      </div>
    </motion.div>
  );
}
