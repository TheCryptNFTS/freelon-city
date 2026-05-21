"use client";

import { CIVILIZATIONS } from "@/lib/constants";

type CivDef = {
  name: string;
  doctrine: string;
  color: string;
  rival?: string;
  rivalLine?: string;
};

const SITE = "https://freeloncity.com";

function tweetIntent(text: string, url: string): string {
  const params = new URLSearchParams({ text, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function PropagandaShareButtons({ slug }: { slug: string }) {
  const civs = CIVILIZATIONS as Record<string, CivDef>;
  const civ = civs[slug];
  if (!civ) return null;

  const rival = civ.rival ? civs[civ.rival] : null;

  const propagandaPageUrl = `${SITE}/civilizations/${slug}`;
  const propagandaTweet = `${civ.name} carries the signal. ${civ.doctrine}. ${propagandaPageUrl}`;
  const propagandaHref = tweetIntent(propagandaTweet, propagandaPageUrl);

  const rivalryTweet = rival
    ? `${civ.name} has overtaken ${rival.name}. The signal has shifted. ${SITE}`
    : "";
  const rivalryPageUrl = `${SITE}/civilizations/${slug}`;
  const rivalryHref = rival ? tweetIntent(rivalryTweet, rivalryPageUrl) : "#";

  return (
    <div className="propaganda-share">
      <a
        href={propagandaHref}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary"
      >
        <span className="lbl">SIGNAL</span>
        <span className="ttl">
          GENERATE PROPAGANDA <span className="ar">→</span>
        </span>
      </a>
      {rival && (
        <a
          href={rivalryHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ borderColor: rival.color, color: rival.color }}
        >
          <span className="lbl">WAR</span>
          <span className="ttl">
            CHALLENGE {rival.name.toUpperCase()}{" "}
            <span className="ar">→</span>
          </span>
        </a>
      )}
    </div>
  );
}

export default PropagandaShareButtons;
