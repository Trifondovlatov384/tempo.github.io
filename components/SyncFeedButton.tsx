"use client";

import { useState } from "react";

type Props = {
  onSuccess?: () => void;
  variant?: "default" | "empty";
};

export function SyncFeedButton({ onSuccess, variant = "default" }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSync = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/feed/sync", { method: "GET" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка синхронизации");
        return;
      }
      setMessage(
        `Обновлено: ${data.totalBuildings} корпусов, ${data.totalUnits} квартир`
      );
      onSuccess?.();
      if (typeof window !== "undefined") window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "empty") {
    return (
      <div className="flex flex-col items-center gap-4 mt-6">
        <button
          type="button"
          onClick={runSync}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-[#2a515f] text-white font-medium hover:bg-[#2a515f]/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Синхронизация…" : "Обновить фид"}
        </button>
        {message && (
          <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 max-w-md text-center">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={runSync}
        disabled={loading}
        className="px-3 py-1.5 text-sm rounded-md border border-[#2a515f]/30 text-[#2a515f] hover:bg-[#2a515f]/5 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? "Синхронизация…" : "Обновить фид"}
      </button>
      {message && (
        <span className="text-xs text-green-600 dark:text-green-400">
          {message}
        </span>
      )}
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
