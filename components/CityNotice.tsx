"use client";
import { useEffect, useState } from "react";
import type { CityNoticeDetail } from "@/lib/city-notice";

type Notice = CityNoticeDetail & { id: string };

export function CityNotice() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    function onNotice(ev: Event) {
      const e = ev as CustomEvent<CityNoticeDetail>;
      if (!e.detail?.title) return;
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const notice: Notice = {
        id,
        title: e.detail.title,
        body: e.detail.body,
        delta: e.detail.delta,
        href: e.detail.href,
      };
      setNotices((prev) => [...prev, notice]);
      setTimeout(() => {
        setNotices((prev) => prev.filter((n) => n.id !== id));
      }, 6000);
    }
    window.addEventListener("freelon:city-notice", onNotice);
    return () => window.removeEventListener("freelon:city-notice", onNotice);
  }, []);

  if (notices.length === 0) return null;

  return (
    <div className="city-notice-stack" role="status" aria-live="polite">
      {notices.map((n) => {
        const body = (
          <>
            <div className="cn-stripe" />
            <div className="cn-body">
              <span className="cn-title">{n.title}</span>
              {n.body && <span className="cn-text">{n.body}</span>}
            </div>
            {n.delta && <span className="cn-delta">{n.delta}</span>}
          </>
        );
        const dismiss = (
          <button
            type="button"
            className="cn-close"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setNotices((prev) => prev.filter((x) => x.id !== n.id));
            }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        );
        if (n.href) {
          return (
            <a key={n.id} className="city-notice" href={n.href}>
              {body}
              {dismiss}
            </a>
          );
        }
        return (
          <div key={n.id} className="city-notice">
            {body}
            {dismiss}
          </div>
        );
      })}
    </div>
  );
}
