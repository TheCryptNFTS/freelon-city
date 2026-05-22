"use client";
import { useEffect } from "react";

export function ErrorReporter() {
  useEffect(() => {
    function send(message: string, stack: string) {
      try {
        fetch("/api/log-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            stack,
            url: window.location.href,
            ua: navigator.userAgent,
          }),
          keepalive: true,
        }).catch(() => {});
      } catch {}
    }
    const onErr = (e: ErrorEvent) => send(e.message, e.error?.stack || "");
    const onRej = (e: PromiseRejectionEvent) =>
      send(String(e.reason?.message || e.reason), e.reason?.stack || "");
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);
  return null;
}
