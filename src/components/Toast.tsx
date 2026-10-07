"use client";

import { useEffect } from "react";

export default function Toast({
  message,
  tone,
  onDone,
}: {
  message: string;
  tone: "ok" | "error";
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm shadow-lg ${
        tone === "error" ? "bg-red-600 text-white" : "bg-accent text-white"
      }`}
    >
      {message}
    </div>
  );
}
