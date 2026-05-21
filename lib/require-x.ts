import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, X_SESSION_COOKIE, type XSession } from "@/lib/x-session";
import { normalizeHandle } from "@/lib/sync";

/**
 * Require a valid x-session cookie and (optionally) that it matches a handle
 * the caller is acting on. Returns the session payload or a 401/403 NextResponse.
 *
 * Usage:
 *   const r = await requireXSession(req, { handle: body.handle });
 *   if (r instanceof NextResponse) return r;
 *   const session = r;
 */
export async function requireXSession(
  _req: Request,
  opts: { handle?: string } = {},
): Promise<XSession | NextResponse> {
  const c = await cookies();
  const token = c.get(X_SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session) {
    return NextResponse.json(
      { error: "x_session_required", hint: "Sign in with X to perform this action." },
      { status: 401 },
    );
  }
  if (opts.handle != null) {
    const want = normalizeHandle(opts.handle);
    const have = normalizeHandle(session.xHandle);
    // bind can be the original carrier handle the user verified under
    const haveBind = normalizeHandle(session.bind);
    if (want && want !== have && want !== haveBind) {
      return NextResponse.json(
        { error: "x_session_handle_mismatch", session_handle: have },
        { status: 403 },
      );
    }
  }
  return session;
}
