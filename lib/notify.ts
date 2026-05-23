/**
 * High-level notification delivery — one entry point for the rest of
 * the codebase. Always writes to the on-site inbox; opportunistically
 * fires a DM if the user opted in AND we have their xId.
 *
 * Usage from anywhere:
 *   import { notify } from "@/lib/notify";
 *   await notify({
 *     wallet: "0x...",
 *     eventKey: `decay-warning:${todayUTC}`,
 *     kind: "decay-warning",
 *     body: "⚠ 3 days until your hex meter cools. One claim resets it.",
 *     href: "/carrier",
 *   });
 */

import {
  deliver,
  getPrefs,
  type NotifKind,
} from "@/lib/notifications-store";
import { getXVerification } from "@/lib/x-store";
import { sendDM, dmCapable } from "@/lib/x-dm";

const SITE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.freeloncity.com";

export type NotifyInput = {
  wallet: string;
  eventKey: string;
  kind: NotifKind;
  body: string;
  href: string;
};

export type NotifyResult = {
  inboxed: boolean;
  dmSent: boolean;
  reason?: string;
};

export async function notify(input: NotifyInput): Promise<NotifyResult> {
  // 1. Write to on-site inbox (dedupe + LPUSH)
  const isNew = await deliver(input.wallet, {
    eventKey: input.eventKey,
    kind: input.kind,
    body: input.body,
    href: input.href,
    ts: Date.now(),
  });
  if (!isNew) return { inboxed: false, dmSent: false, reason: "deduped" };

  // 2. Best-effort DM if user opted in
  let dmSent = false;
  let reason: string | undefined;
  try {
    const prefs = await getPrefs(input.wallet);
    if (!prefs.dmEnabled) reason = "dm_opt_out";
    else if (prefs.optOut.includes(input.kind)) reason = "kind_opt_out";
    else if (!dmCapable()) reason = "x_creds_missing";
    else {
      const v = await getXVerification(input.wallet);
      if (!v?.xId) reason = "no_x_session";
      else {
        // Format DM body — include the on-site URL so it's a one-tap return
        const dmText = `${input.body}\n\n${SITE}${input.href}`;
        const r = await sendDM(v.xId, dmText);
        if (r.ok) dmSent = true;
        else reason = `dm_${r.reason}`;
      }
    }
  } catch (e) {
    reason = e instanceof Error ? e.message.slice(0, 40) : "unknown";
  }

  return { inboxed: true, dmSent, reason };
}
