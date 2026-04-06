"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, User as UserIcon } from "lucide-react";

export function UserMenu({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative pointer-events-auto" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors shrink-0 shadow-sm ${
          isOpen 
            ? "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700" 
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80"
        }`}
      >
        {user.picture ? (
          <img src={user.picture} alt="Avatar" className="w-5 h-5 rounded-full" />
        ) : (
          <UserIcon size={16} className="text-slate-500" />
        )}
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">
          {user.nickname || user.name}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[280px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right duration-200">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            {user.picture ? (
              <img src={user.picture} alt="Avatar" className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                <UserIcon size={24} className="text-indigo-600 dark:text-indigo-400" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {user.name || user.nickname}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.email}
              </span>
            </div>
          </div>
          
          <div className="p-2 bg-white dark:bg-slate-900">
            <a
              href="/auth/logout"
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors group"
            >
              <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              Sign Out
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
