"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Notification } from "@/lib/types";

const POLL_INTERVAL_MS = 30000;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export default function NotificationBell({
  enabled,
  onOpenTask,
}: {
  enabled: boolean;
  onOpenTask: (taskId: string) => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, load]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      setUnreadCount(0);
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    }
  }

  if (!enabled) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleOpen}
        className="relative transition-colors px-3 py-1.5 flex items-center justify-center bg-button hover:bg-button-hover"
        aria-label="Notificaciones"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="currentColor"
            className="text-ink"
            d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] leading-4 text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-80 max-h-96 overflow-y-auto bg-surface border border-line shadow-lg z-20 animate-fade-in-up">
          <div className="px-4 py-3 border-b border-line">
            <h3 className="font-display text-xs tracking-wider">Notificaciones</h3>
          </div>
          {notifications.length === 0 ? (
            <p className="text-[10px] text-muted px-4 py-6 text-center">
              No tienes notificaciones todavía.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setOpen(false);
                    onOpenTask(n.taskId);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-ink/[0.03] ${
                    !n.read ? "bg-ink/[0.02]" : ""
                  }`}
                >
                  <p className="text-xs">{n.message}</p>
                  <p className="text-[10px] text-muted mt-1">{timeAgo(n.createdAt)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
