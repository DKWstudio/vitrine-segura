"use client";

import { useEffect, useState } from "react";

interface AdminNoticeProps {
  error?: string;
  success?: string;
}

export default function AdminNotice({ error, success }: AdminNoticeProps) {
  const message = error || success;
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsVisible(false);
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!message || !isVisible) {
    return null;
  }

  return (
    <div
      role="status"
      className={`fixed right-4 top-4 z-[120] max-w-md rounded-xl border p-4 text-sm font-bold shadow-2xl ${
        error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-green-200 bg-green-50 text-green-700"
      }`}
    >
      {message}
    </div>
  );
}
