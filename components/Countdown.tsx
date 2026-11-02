"use client";

import { useEffect, useState } from "react";
import { msUntilMidnight } from "@/lib/daily";

/** Time left until the next daily word, as HH:MM:SS */
export default function Countdown({ className }: { className?: string }) {
  const [ms, setMs] = useState(() => msUntilMidnight(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setMs(msUntilMidnight(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  const total = Math.max(0, Math.floor(ms / 1000));
  const text = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60].map((n) => String(n).padStart(2, "0")).join(":");
  return (
    <span role="timer" className={className}>
      {text}
    </span>
  );
}
