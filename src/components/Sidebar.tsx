"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, PanelLeftClose, PanelLeft, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentChatId = searchParams.get("chatId");

  const [isOpen, setIsOpen] = useState(true);
  const [history, setHistory] = useState<{ id: string; title: string; date: number }[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, title: string } | null>(null);

  const loadHistory = () => {
    const raw = localStorage.getItem("chat_history");
    if (raw) setHistory(JSON.parse(raw));
  };

  useEffect(() => {
    loadHistory();
    const handleStorage = () => loadHistory();
    window.addEventListener("chatHistoryUpdated", handleStorage);
    return () => window.removeEventListener("chatHistoryUpdated", handleStorage);
  }, []);

  const handleNewChat = () => {
    const newId = Math.random().toString(36).substring(2, 10);
    const newHistory = [{ id: newId, title: "New Conversation", date: Date.now() }, ...history];
    localStorage.setItem("chat_history", JSON.stringify(newHistory));
    setHistory(newHistory);
    router.push(`/?chatId=${newId}`);
    window.dispatchEvent(new Event("chatHistoryUpdated"));
  };

  const requestDelete = (e: any, id: string, title: string) => {
    e.stopPropagation();
    setDeleteTarget({ id, title });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const newHistory = history.filter(h => h.id !== deleteTarget.id);

    if (currentChatId === deleteTarget.id) {
      if (newHistory.length > 0) {
        localStorage.setItem("chat_history", JSON.stringify(newHistory));
        setHistory(newHistory);
        router.push(`/?chatId=${newHistory[0].id}`);
      } else {
        const newId = Math.random().toString(36).substring(2, 10);
        const freshHistory = [{ id: newId, title: "New Conversation", date: Date.now() }];
        localStorage.setItem("chat_history", JSON.stringify(freshHistory));
        setHistory(freshHistory);
        router.push(`/?chatId=${newId}`);
      }
    } else {
      localStorage.setItem("chat_history", JSON.stringify(newHistory));
      setHistory(newHistory);
    }

    window.dispatchEvent(new Event("chatHistoryUpdated"));
    setDeleteTarget(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute z-40 top-[80px] left-4 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500 group"
        title="Open Sidebar"
      >
        <PanelLeft size={18} className="group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div className={`w-72 shrink-0 border-r border-slate-200/70 dark:border-slate-800/70 bg-white/30 dark:bg-[#0B0C10]/60 backdrop-blur-xl flex flex-col h-full transition-all relative z-40`}>
      <div className="p-4 flex gap-2 items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50">
        <button
          onClick={handleNewChat}
          className="flex-1 flex flex-row items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-500/20 font-semibold text-sm"
        >
          <Plus size={16} /> New Chat
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2.5 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm"
          title="Close Sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 scroll-smooth">
        <span className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Chat History</span>

        {history.map(chat => (
          <button
            key={chat.id}
            onClick={() => router.push(`/?chatId=${chat.id}`)}
            className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm transition-all ${currentChatId === chat.id
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm ring-1 ring-slate-200 dark:ring-slate-700/50'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/30'
              }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <MessageSquare size={16} className={currentChatId === chat.id ? "text-indigo-500 shrink-0" : "shrink-0 opacity-50"} />
              <span className="truncate align-middle pt-0.5">{chat.title}</span>
            </div>
            <div onClick={(e) => requestDelete(e, chat.id, chat.title)} title="Delete memory" className="opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2" role="button">
              <Trash2 size={14} className="text-slate-400 hover:text-red-500" />
            </div>
          </button>
        ))}

        {history.length === 0 && (
          <div className="text-center p-4 text-xs text-slate-400 font-medium">
            No history. Start a new chat!
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Chat?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-300">"{deleteTarget.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
