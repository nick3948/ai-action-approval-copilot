"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, PanelLeftClose, PanelLeft, Trash2, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentChatId = searchParams.get("chatId");

  const [isOpen, setIsOpen] = useState(true);
  const [history, setHistory] = useState<{ id: string; title: string; date: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, title: string } | null>(null);

  const filteredHistory = history.filter(chat => chat.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (Array.isArray(data)) {
        setHistory(data);
      }
    } catch (e) {
      console.error("Failed to load history from DB", e);
    }
  };

  useEffect(() => {
    loadHistory();
    const handleStorage = () => loadHistory();
    window.addEventListener("chatHistoryUpdated", handleStorage);
    return () => window.removeEventListener("chatHistoryUpdated", handleStorage);
  }, []);

  const handleNewChat = async () => {
    if (history.length > 0 && history[0].title === "New Conversation" && currentChatId === history[0].id) {
      return;
    }

    const newId = Math.random().toString(36).substring(2, 10);
    const fakeNewChat = { id: newId, title: "New Conversation", date: Date.now() };
    setHistory(prev => [fakeNewChat, ...prev]);

    try {
      await fetch("/api/history", {
        method: "POST",
        body: JSON.stringify({ id: newId, title: "New Conversation" })
      });
      window.dispatchEvent(new Event("chatHistoryUpdated"));
    } catch (e) {
      console.error("Failed to save new chat to DB", e);
    }

    router.push(`/?chatId=${newId}`);
  };

  const requestDelete = (e: any, id: string, title: string) => {
    e.stopPropagation();
    setDeleteTarget({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const newHistory = history.filter(h => h.id !== deleteTarget.id);
    setHistory(newHistory);

    try {
      await fetch(`/api/history?id=${deleteTarget.id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Failed to delete chat from DB", e);
    }

    if (currentChatId === deleteTarget.id) {
      if (newHistory.length > 0) {
        router.push(`/?chatId=${newHistory[0].id}`);
      } else {
        router.push(`/`);
      }
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
      <div className="px-4 pt-4 pb-1">
        <div className="relative">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 font-medium"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

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

        {filteredHistory.map(chat => (
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

        {history.length > 0 && filteredHistory.length === 0 && (
          <div className="text-center p-4 text-xs text-slate-400 font-medium">
            No results found.
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
      {/* Security Model Legend */}
      <div className="p-4 border-t border-slate-800/50 space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Security Model</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
            <span className="text-[10px] text-slate-500 font-mono">Low → Approve / Reject</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
            <span className="text-[10px] text-slate-500 font-mono">Medium → Type to confirm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
            <span className="text-[10px] text-slate-500 font-mono">High → Type to confirm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <span className="text-[10px] text-slate-500 font-mono">Critical → Auth0 Step-Up</span>
          </div>
        </div>
      </div>
    </div>
  );
}
