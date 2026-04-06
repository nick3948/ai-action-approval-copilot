"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, User as UserIcon, Copy, Check, ArrowRight, Volume2, Mic, MicOff, Square } from "lucide-react";
import { ApprovalCard } from "./ApprovalCard";
import { StepUpCard } from "./StepUpCard";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TourGuide } from "./TourGuide";

export function ChatInterface({ user }: { user: any }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentState, setAgentState] = useState<any>(null);
  const [localHistory, setLocalHistory] = useState<any[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          console.log("[Voice] Microphone is active and listening...");
        };

        recognitionRef.current.onresult = (event: any) => {
          console.log("[Voice] Received speech result!", event);

          const latestResult = event.results[event.results.length - 1];
          if (latestResult.isFinal) {
            const transcriptChunk = latestResult[0].transcript.trim();
            console.log("[Voice] Extracted clean text:", transcriptChunk);
            setInput((prev) => (prev.trim() ? prev + ' ' + transcriptChunk : transcriptChunk));
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("[Voice] Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            alert("Microphone access was denied. Please click the system camera/mic icon in the URL bar to allow access.");
          }
        };

        recognitionRef.current.onend = () => {
          console.log("[Voice] Microphone disconnected/ended.");
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };


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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0B0C10]">
      <TourGuide />
      <main className="flex-1 overflow-y-auto flex flex-col scroll-smooth relative">
        {displayMessages.length > 0 && (
          <div className="sticky top-0 left-0 w-full h-28 bg-gradient-to-b from-slate-50/90 via-slate-50/50 to-transparent dark:from-[#0B0C10]/90 dark:via-[#0B0C10]/50 dark:to-transparent z-20 pointer-events-none shrink-0 backdrop-blur-[.5px] [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)]" />
        )}

        <div className="w-full max-w-4xl mx-auto flex flex-col pb-10 px-4 md:px-8 mt-4">
          {/* Welcome Screen */}
          {displayMessages.length === 0 && (
            <div className="flex flex-col items-center gap-6 mt-16 sm:mt-20 w-full max-w-4xl mx-auto px-2">

              {/* Hero */}
              <div className="text-center space-y-3">
                <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 dark:from-white dark:via-indigo-200 dark:to-purple-300 pb-1">
                  AI Action Approval Copilot
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-[15px] font-medium leading-relaxed max-w-[600px] mx-auto">
                  Your secure AI agent for GitHub &amp; Slack. Every action is classified by risk and requires your explicit approval before executing — nothing runs without your sign-off.
                </p>
              </div>

              {/* Security Model Visual */}
              <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 p-4 space-y-3 max-w-3xl mx-auto">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">4-Tier Security Model</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mb-1.5" />
                    <p className="font-bold text-blue-600 dark:text-blue-400 mb-0.5">Low Risk</p>
                    <p className="text-slate-500 text-[10px]">Approve / Reject</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mx-auto mb-1.5" />
                    <p className="font-bold text-amber-600 dark:text-amber-400 mb-0.5">Medium Risk</p>
                    <p className="text-slate-500 text-[10px]">Type to confirm</p>
                  </div>
                  <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-2.5">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mx-auto mb-1.5" />
                    <p className="font-bold text-orange-600 dark:text-orange-400 mb-0.5">High Risk</p>
                    <p className="text-slate-500 text-[10px]">Type to confirm</p>
                  </div>
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-2.5">
                    <div className="w-2 h-2 rounded-full bg-red-500 mx-auto mb-1.5" />
                    <p className="font-bold text-red-600 dark:text-red-400 mb-0.5">Critical</p>
                    <p className="text-slate-500 text-[10px]">Auth0 Step-Up Auth</p>
                  </div>
                </div>
              </div>

              {/* Suggested Prompts Grid */}
              <div className="w-full mt-4 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2 mb-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Quick Actions</p>
                  <a href="/manual" className="tour-step-manual flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full">
                    VIEW SYSTEM MANUAL <ArrowRight size={12} className="relative top-px" />
                  </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* GitHub Actions */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-lg bg-[#24292e] text-white flex items-center justify-center">
                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                      </span>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">GitHub Actions</h3>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      {[
                        { label: "List my repos", prompt: "List all my GitHub repositories" },
                        { label: "Check my queue", prompt: "What's in my queue? Show my open PRs and issues" },
                        { label: "AI Code Review", prompt: "Review PR #1 in my repo" },
                        { label: "Create repo", prompt: "Create a new private repository called 'demo-app'" },
                      ].map(({ label, prompt }) => (
                        <button key={label} onClick={() => { setInput(prompt); setTimeout(() => handleSubmit(), 50); }} className="text-left px-4 py-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/30 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/40 text-slate-700 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-slate-200 text-xs font-semibold transition-all group shadow-sm flex flex-col justify-center min-h-[64px] w-full">
                          {label}
                          <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-600 group-hover:text-slate-500 mt-1 truncate w-full">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slack Communication */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-lg bg-[#4A154B] text-white flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                        </svg>
                      </span>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Slack Communication</h3>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      {[
                        { label: "Broadcast updates", prompt: "Send a message to my team channel that the deployment has finished" },
                        { label: "Request review", prompt: "Send a slack message to my team channel asking for a review on PR #12" },
                      ].map(({ label, prompt }) => (
                        <button key={label} onClick={() => { setInput(prompt); setTimeout(() => handleSubmit(), 50); }} className="text-left px-4 py-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/30 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/40 text-slate-700 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-slate-200 text-xs font-semibold transition-all group shadow-sm flex flex-col justify-center min-h-[64px] w-full">
                          {label}
                          <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-600 group-hover:text-slate-500 mt-1 truncate w-full">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
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
              <div key={idx} className={`flex gap-4 mt-3 w-full group ${isUser ? 'justify-end pl-12 sm:pl-24' : 'pr-4 sm:pr-24'}`}>

                {/* Agent Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-white dark:bg-[#1A1C23] border border-slate-200 dark:border-slate-800 shadow-sm mt-0.5">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono text-[10px]">AC</span>
                  </div>
                )}

                {/* Message Content Container */}
                <div className={`relative flex flex-col w-fit max-w-full break-words ${isUser
                  ? 'bg-slate-100 dark:bg-[#2A2B32] text-slate-900 dark:text-slate-100 px-5 py-3 rounded-3xl rounded-tr-lg float-right'
                  : 'bg-transparent text-slate-800 dark:text-slate-200 py-1'
                  }`}>

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
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(text);
                          setCopiedIdx(idx);
                          setTimeout(() => setCopiedIdx(null), 2000);
                        }}
                        title="Copy response"
                        className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {copiedIdx === idx ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                      <button
                        title={speakingIdx === idx ? "Stop reading" : "Read aloud"}
                        onClick={() => {
                          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                            window.speechSynthesis.cancel();

                            if (speakingIdx === idx) {
                              setSpeakingIdx(null);
                            } else {
                              const utterance = new SpeechSynthesisUtterance(text);
                              utterance.onend = () => setSpeakingIdx(null);
                              utterance.onerror = () => setSpeakingIdx(null);
                              setSpeakingIdx(idx);
                              window.speechSynthesis.speak(utterance);
                            }
                          }
                        }}
                        className={`p-1.5 rounded-md transition-colors ${speakingIdx === idx ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'}`}
                      >
                        {speakingIdx === idx ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
                      </button>
                    </div>
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
        <form onSubmit={handleSubmit} className="tour-step-input max-w-4xl mx-auto relative flex items-end bg-white dark:bg-slate-900 rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:shadow-[0_0_15px_rgba(0,0,0,0.4)] ring-1 ring-slate-200 dark:ring-slate-800 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading || agentState?.pending_action}
            placeholder={agentState?.pending_action ? "Action securely paused. Please review the Approval Card 👆" : "How can I assist you today? (Shift+Enter for new line)"}
            className="w-full pl-6 pr-24 py-4 rounded-3xl bg-transparent focus:outline-none transition-all disabled:opacity-50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium resize-none leading-relaxed"
            style={{ minHeight: "56px", maxHeight: "200px" }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {recognitionRef.current && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-full transition-all group ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title={isListening ? "Stop listening" : "Start Voice Input"}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} className="group-hover:scale-110 transition-transform" />}
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim() || isLoading || agentState?.pending_action}
              className="p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md transition-all shadow-sm disabled:opacity-50 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed group"
            >
              <Send size={18} className="translate-x-[1px] translate-y-[-1px] group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </form>
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-3 font-semibold tracking-wider flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          AGENT EXECUTION IS SECURELY SANDBOXED
        </p>
      </div>
    </div>
  );
}
