"use client";
import { SITE, tweetGeneric, tweetIntent } from "@/lib/share";

type Props = {
  text: string;
  ogPath: string;
  pagePath?: string;
  variant?: "primary" | "secondary" | "ghost";
  label?: string;
};

export function ShareOG({ text, ogPath, pagePath = "/", variant = "primary", label = "SHARE TO X ↗" }: Props) {
  function onShare(e: React.MouseEvent) {
    e.preventDefault();
    const url = `${SITE}${pagePath}`;
    window.open(tweetIntent(tweetGeneric(text, url)), "_blank", "noopener,noreferrer");
  }
  void ogPath; // referenced for documentation; image is rendered via page metadata
  return (
    <button type="button" className={`btn btn-${variant}`} onClick={onShare}>
      <span className="ttl">{label}</span>
    </button>
  );
}
