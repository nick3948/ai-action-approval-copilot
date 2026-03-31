"use client";

import { ApprovalCard } from "./ApprovalCard";

export function CardPreview() {
  return (
    <div className="w-full max-w-lg mx-auto mt-6">
      <ApprovalCard
        actionName="Delete GitHub Repository"
        riskLevel="critical"
        requestedScopes={["repo:delete", "repo:invite"]}
        actionDetails={{
          repository: "nick3948/legacy-api",
          reason: "automated clean-up request",
          forceDelete: true
        }}
        onApprove={() => alert("Approved! (MFA flow would trigger here)")}
        onReject={() => alert("Action safely rejected.")}
      />
    </div>
  );
}
