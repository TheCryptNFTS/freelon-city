"use client";

import { Citizen } from "@/lib/citizens";

export function ShareButtons({ citizen, siteUrl }: { citizen: Citizen; siteUrl: string }) {
  const tokenUrl = `${siteUrl}/citizens/${citizen.id}`;
  const tagLine = citizen.honoree_handle
    ? `${citizen.honoree_handle} — your citizen of FREELON CITY:`
    : `Citizen #${citizen.id.toString().padStart(4, "0")} of FREELON CITY:`;
  const text = encodeURIComponent(`${tagLine}\n\n${citizen.shape} · ${citizen.civilization.replace("-", " ")} · ${citizen.tier}\n\n${tokenUrl}\n\n#FreelonCity #404HEXNOTFOUND`);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${text}`;

  function copy() {
    navigator.clipboard.writeText(tokenUrl);
  }

  return (
    <>
      <a href={twitterUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
        <span className="lbl">SHARE</span>
        <span className="ttl">POST TO X <span className="ar">↗</span></span>
      </a>
      <button onClick={copy} className="btn" type="button">
        <span className="ttl">COPY LINK</span>
      </button>
    </>
  );
}
