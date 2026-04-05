"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, User as UserIcon, Copy, Check } from "lucide-react";
import { ApprovalCard } from "./ApprovalCard";
import { StepUpCard } from "./StepUpCard";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ChatInterface({ user }: { user: any }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentState, setAgentState] = useState<any>(null);
  const [localHistory, setLocalHistory] = useState<any[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get("chatId");
  const stepUpParam = searchParams.get("stepUpCompleted");

  // Auth0 Step-Up: timestamp-based validity (10 minutes)
  // We store the unix timestamp (ms) when step-up was completed in sessionStorage.
  // This lets us:
  //   a) survive a router.replace() that clears the URL param
  //   b) allow multiple critical actions in a session without re-prompting every time
  //   c) naturally expire after 10 minutes
  const STEP_UP_TTL_MS = 10 * 60 * 1000;

  const isStepUpValid = (id: string): boolean => {
    const stored = sessionStorage.getItem(`stepUp_${id}`);
    if (!stored) return false;
    return Date.now() - parseInt(stored, 10) < STEP_UP_TTL_MS;
  };

  const [stepUpCompleted, setStepUpCompleted] = useState(false);

  useEffect(() => {
    if (!chatId) return;

    if (stepUpParam === "1") {
      // Auth0 re-auth just completed — store timestamp and clean the URL
      sessionStorage.setItem(`stepUp_${chatId}`, Date.now().toString());
      setStepUpCompleted(true);
      router.replace(`/?chatId=${chatId}`);
    } else {
      setStepUpCompleted(isStepUpValid(chatId));
    }
  }, [chatId, stepUpParam]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentState, localHistory]);

  useEffect(() => {
    if (!isLoading && !agentState?.pending_action) {
      textareaRef.current?.focus();
    }
  }, [isLoading, agentState?.pending_action]);


  useEffect(() => {
    // If no specific chat URL, first try to resume the most recent chat from history
    if (!chatId) {
      const raw = localStorage.getItem("chat_history");
      if (raw) {
        const history = JSON.parse(raw);

        const latestId = history[0]?.id;

        if (latestId) {
          router.replace(`/?chatId=${latestId}`);
          return;
        }
      }

      // If no valid history found, kick down into a randomized new instance
      const newId = Math.random().toString(36).substring(2, 10);
      const currentRaw = localStorage.getItem("chat_history");
      const history = currentRaw ? JSON.parse(currentRaw) : [];
      localStorage.setItem("chat_history", JSON.stringify([{ id: newId, title: "New Conversation", date: Date.now() }, ...history]));
      window.dispatchEvent(new Event("chatHistoryUpdated"));
      router.replace(`/?chatId=${newId}`);
      return;
    }

    setAgentState(null);
    setLocalHistory([]);

    const loadState = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/chat?chatId=${chatId}`);
        const data = await res.json();
        if (data.state && data.state.messages && data.state.messages.length > 0) {
          setAgentState(data.state);
        } else {
          setAgentState(null);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, [chatId, router]);

  const updateChatTitle = (inputStr: string) => {
    const raw = localStorage.getItem("chat_history");
    if (!raw || !chatId) return;
    const history = JSON.parse(raw);
    const curr = history.find((h: any) => h.id === chatId);
    if (curr && curr.title === "New Conversation") {
      curr.title = inputStr.substring(0, 30) + (inputStr.length > 30 ? '...' : '');
      localStorage.setItem("chat_history", JSON.stringify(history));
      window.dispatchEvent(new Event("chatHistoryUpdated"));
    }
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Snapshot user input
    const userMessage = { role: "user", content: input };
    setLocalHistory((prev) => [...prev, userMessage]);

    updateChatTitle(input);

    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [userMessage], chatId }),
      });
      const data = await res.json();
      if (data.state) {
        setAgentState(data.state);
        setLocalHistory([]);
      }
    } catch (e) {
      console.error("Failed to send message", e);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, chatId]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleApprovalDecision = async (decision: "approved" | "rejected") => {
    setIsLoading(true);
    setAgentState((prev: any) => ({ ...prev, pending_action: null }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionResponse: decision, chatId }),
      });
      const data = await res.json();
      if (data.state) {
        setAgentState(data.state);
      }
    } catch (e) {
      console.error("Failed to submit approval", e);
    } finally {
      setIsLoading(false);
    }
  };

  const displayMessages = agentState?.messages ? [...agentState.messages, ...localHistory] : localHistory;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/30 dark:bg-[#0B0C10]">
      <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col scroll-smooth">

        <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 sm:gap-8 pb-10">
          {/* Welcome Screen */}
          {displayMessages.length === 0 && (
            <div className="flex flex-col items-center gap-8 mt-8 sm:mt-16 w-full max-w-2xl mx-auto">

              {/* Hero */}
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mx-auto">
                  <span className="text-white font-bold font-mono text-2xl">AC</span>
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 dark:from-white dark:via-indigo-200 dark:to-purple-300">
                  AI Action Approval Copilot
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
                  Your secure AI agent for GitHub &amp; Slack. Every action is classified by risk and requires your explicit approval before executing — nothing runs without your sign-off.
                </p>
              </div>

              {/* Security Model Visual */}
              <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 p-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">3-Tier Security Model</p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mb-1.5" />
                    <p className="font-bold text-blue-600 dark:text-blue-400 mb-0.5">Low Risk</p>
                    <p className="text-slate-500 text-[10px]">Approve / Reject</p>
                  </div>
                  <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mx-auto mb-1.5" />
                    <p className="font-bold text-orange-600 dark:text-orange-400 mb-0.5">High Risk</p>
                    <p className="text-slate-500 text-[10px]">Type to confirm</p>
                  </div>
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mx-auto mb-1.5" />
                    <p className="font-bold text-red-600 dark:text-red-400 mb-0.5">Critical</p>
                    <p className="text-slate-500 text-[10px]">Auth0 Step-Up Auth</p>
                  </div>
                </div>
              </div>

              {/* Suggested Prompts */}
              <div className="w-full space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Try these</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "📋 List my GitHub repos", prompt: "List all my GitHub repositories" },
                    { label: "🗂️ What's in my queue?", prompt: "What's in my queue? Show my open PRs, PRs to review, and assigned issues" },
                    { label: "🔍 AI Code Review", prompt: "Review PR #1 in my repo" },
                    { label: "💬 Comment on issue", prompt: "Add a comment 'Looking into this now' on issue #1 in my repo" },
                    { label: "🚀 Cut a release", prompt: "Create a new release v1.0.0 for my repo" },
                    { label: "🗑️ Delete a repo", prompt: "Delete my test repository" },
                  ].map(({ label, prompt }) => (
                    <button
                      key={label}
                      onClick={() => {
                        setInput(prompt);
                        setTimeout(() => handleSubmit(), 50);
                      }}
                      className="text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-indigo-50 dark:hover:bg-slate-800/60 hover:border-indigo-400 dark:hover:border-indigo-500/40 text-slate-700 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-slate-200 text-xs font-semibold transition-all group shadow-sm"
                    >
                      {label}
                      <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-500 mt-0.5 truncate">{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}



          {/* Dynamic Message Feed */}
          {displayMessages.map((msg: any, idx: number) => {
            // Safely determine if the message is from the Human or the AI Copilot
            const isUser = msg.role === "user" || msg.type === "human" || msg.id?.includes?.("HumanMessage");

            const isToolMessage = msg.type === "tool" || msg.id?.includes?.("ToolMessage") || msg.name === "ToolMessage" || msg.kwargs?.type === "tool";
            if (isToolMessage) return null;

            let text = "";
            if (typeof msg.content === 'string') {
              text = msg.content;
            } else if (typeof msg.kwargs?.content === 'string') {
              text = msg.kwargs.content;
            } else if (Array.isArray(msg.content) && msg.content[0]?.text) {
              text = msg.content[0].text;
            }

            if (!text) return null;

            return (
              <div key={idx} className={`flex gap-3 mt-4 w-full ${isUser ? 'flex-row-reverse pl-12 sm:pl-24' : 'flex-row pr-12 sm:pr-24'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center shadow-sm mt-auto sm:mt-0 ${isUser
                  ? 'bg-slate-200 dark:bg-slate-800'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30'
                  }`}>
                  {isUser
                    ? <UserIcon size={14} className="text-slate-600 dark:text-slate-300" />
                    : <span className="text-white font-bold font-mono text-[10px]">AC</span>}
                </div>

                {/* Bubble */}
                <div className={`px-5 py-4 rounded-[24px] relative group w-fit max-w-full break-words ${isUser
                  ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-sm shadow-md shadow-indigo-500/20'
                  : 'bg-white dark:bg-[#1A1C23] border border-slate-200 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 rounded-bl-sm shadow-sm'
                  }`}>
                  {!isUser && (
                    <p className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 mb-2 tracking-wider uppercase opacity-90">Copilot</p>
                  )}
                  {isUser ? (
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{text}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-pre:shadow-inner max-w-none marker:text-indigo-500 prose-a:text-indigo-500 hover:prose-a:text-indigo-600">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {text}
                      </ReactMarkdown>
                    </div>
                  )}

                  {!isUser && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(text);
                        setCopiedIdx(idx);
                        setTimeout(() => setCopiedIdx(null), 2000);
                      }}
                      title="Copy response"
                      className="absolute -bottom-2.5 -right-2.5 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                    >
                      {copiedIdx === idx
                        ? <Check size={13} className="text-green-500" />
                        : <Copy size={13} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* The Human-in-the-Loop Approval UI! */}
          {agentState?.pending_action && (() => {
            const riskLevel = agentState.risk_level || "low";
            const args = agentState.pending_action.args || {};
            const toolName = agentState.pending_action.name || "";

            // CRITICAL: Show Auth0 Step-Up card until identity is re-verified
            if (riskLevel === "critical" && !stepUpCompleted) {
              return (
                <div className="w-full flex justify-center py-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                  <StepUpCard
                    actionName={toolName}
                    actionDetails={args}
                    chatId={chatId || ""}
                  />
                </div>
              );
            }

            // MEDIUM / HIGH / CRITICAL (post step-up): type-to-confirm
            let confirmationTarget: string | undefined;
            if (riskLevel === "critical") {
              confirmationTarget = args.owner && args.repo ? `${args.owner}/${args.repo}` : args.repo;
            } else if (riskLevel === "high" || riskLevel === "medium") {
              confirmationTarget = toolName;
            }

            return (
              <div className="w-full flex justify-center py-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                <ApprovalCard
                  actionName={toolName}
                  riskLevel={riskLevel}
                  requestedScopes={agentState.requested_scopes || []}
                  actionDetails={args}
                  confirmationTarget={confirmationTarget}
                  onApprove={() => handleApprovalDecision("approved")}
                  onReject={() => handleApprovalDecision("rejected")}
                />
              </div>
            );
          })()}

          {/* Loading Indicator */}
          {isLoading && !agentState?.pending_action && (
            <div className="flex gap-3 w-full self-start">
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm opacity-50">
                <span className="text-white font-bold font-mono text-[10px]">AC</span>
              </div>
              <div className="flex gap-1.5 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl rounded-tl-sm w-fit items-center shadow-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-75" />
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-150" />
              </div>
            </div>
          )}

          {/* Invisible div for Auto Scroll targeting */}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Chat Input Footer */}
      <div className="p-4 md:p-6 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-end bg-white dark:bg-slate-900 rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:shadow-[0_0_15px_rgba(0,0,0,0.4)] ring-1 ring-slate-200 dark:ring-slate-800 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading || agentState?.pending_action}
            placeholder={agentState?.pending_action ? "Action securely paused. Please review the Approval Card 👆" : "How can I assist you today? (Shift+Enter for new line)"}
            className="w-full pl-6 pr-14 py-4 rounded-3xl bg-transparent focus:outline-none transition-all disabled:opacity-50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium resize-none leading-relaxed"
            style={{ minHeight: "56px", maxHeight: "200px" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || agentState?.pending_action}
            className="absolute right-2 bottom-2 p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md transition-all shadow-sm disabled:opacity-50 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed group"
          >
            <Send size={18} className="translate-x-[1px] translate-y-[-1px] group-hover:scale-110 transition-transform" />
          </button>
        </form>
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-3 font-semibold tracking-wider flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          AGENT EXECUTION IS SECURELY SANDBOXED
        </p>
      </div>
    </div>
  );
}
