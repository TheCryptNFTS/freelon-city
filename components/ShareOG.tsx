"use client";

type Props = {
  text: string;
  ogPath: string;  // e.g. "/api/og/rank/0x..."
  pagePath?: string; // optional — what URL to share in the tweet body. Defaults to home.
  variant?: "primary" | "secondary" | "ghost";
  label?: string;  // button text. Default: "SHARE TO X ↗"
};

const SITE = "https://freeloncity.com";

export function ShareOG({ text, ogPath, pagePath = "/", variant = "primary", label = "SHARE TO X ↗" }: Props) {
  function onShare(e: React.MouseEvent) {
    e.preventDefault();
    const url = `${SITE}${pagePath}`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text}\n\n${url}\n\n#FreelonCity #404HEXNOTFOUND`)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }
  // ogPath is referenced for documentation/intent — the OG image is rendered server-side
  // via the page's metadata, so the share intent only needs the page URL.
  void ogPath;
  return (
    <button type="button" className={`btn btn-${variant}`} onClick={onShare}>
      <span className="ttl">{label}</span>
    </button>
  );
}
