"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User as UserIcon } from "lucide-react";
import { ApprovalCard } from "./ApprovalCard";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ChatInterface({ user }: { user: any }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentState, setAgentState] = useState<any>(null);
  const [localHistory, setLocalHistory] = useState<any[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get("chatId");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentState, localHistory]);

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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

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
          {/* Welcome Block */}
          {displayMessages.length === 0 && (
            <div className="flex gap-5 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl mx-auto mt-10 sm:mt-20">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="text-white font-bold font-mono text-lg">AC</span>
              </div>
              <div className="flex flex-col justify-center">
                <h2 className="text-xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">Welcome to Copilot</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  I act as your intelligent middleware. I can perform complex backend tasks, but before I execute anything high-risk, I will automatically pause and explicitly ask for your secure approval.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-[11px] font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">Try: "Delete the legacy-api repo"</span>
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
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* The Human-in-the-Loop Approval UI! */}
          {agentState?.pending_action && (
            <div className="w-full flex justify-center py-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <ApprovalCard
                actionName={agentState.pending_action.name}
                riskLevel={agentState.risk_level || "low"}
                requestedScopes={agentState.requested_scopes || []}
                actionDetails={agentState.pending_action.args}
                onApprove={() => handleApprovalDecision("approved")}
                onReject={() => handleApprovalDecision("rejected")}
              />
            </div>
          )}

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
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-center bg-white dark:bg-slate-900 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:shadow-[0_0_15px_rgba(0,0,0,0.4)] ring-1 ring-slate-200 dark:ring-slate-800 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || agentState?.pending_action}
            placeholder={agentState?.pending_action ? "Action securely paused. Please review the Approval Card 👆" : "How can I assist you today?"}
            className="w-full pl-6 pr-14 py-4 rounded-full bg-transparent focus:outline-none transition-all disabled:opacity-50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || agentState?.pending_action}
            className="absolute right-2 p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md transition-all shadow-sm disabled:opacity-50 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed group"
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
