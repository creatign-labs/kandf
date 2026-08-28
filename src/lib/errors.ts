import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the real, human-readable reason from a failed request.
 * Supabase edge-function errors only say "Edge function returned a non-2xx
 * status code" — the actual reason lives in the response body, so we read it.
 */
export async function getDetailedErrorMessage(error: unknown): Promise<string> {
  const err = error as {
    message?: string;
    context?: Response;
    details?: string;
    hint?: string;
    code?: string;
  };

  // Edge function error: read the JSON body for the real reason
  const ctx = err?.context as (Response & { clone?: () => Response }) | undefined;
  if (ctx && typeof ctx.text === "function") {
    try {
      const raw = await (ctx.clone ? ctx.clone() : ctx).text();
      let reason = raw;
      try {
        const parsed = JSON.parse(raw);
        reason = parsed.error || parsed.message || raw;
      } catch {
        /* body was not JSON */
      }
      if (reason) {
        return ctx.status ? `${reason} (server responded ${ctx.status})` : reason;
      }
    } catch {
      /* body already consumed */
    }
  }

  // Postgres / PostgREST error
  if (err?.details || err?.hint || err?.code) {
    return [
      err.message,
      err.details ? `Details: ${err.details}` : null,
      err.hint ? `Hint: ${err.hint}` : null,
      err.code ? `Code: ${err.code}` : null,
    ]
      .filter(Boolean)
      .join(" — ");
  }

  return err?.message || "An unknown error occurred.";
}

/**
 * Invokes an edge function with the caller's session and throws an Error whose
 * message explains exactly what went wrong (instead of a generic non-2xx text).
 */
export async function invokeEdgeFunction<T = Record<string, unknown>>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error(
      "You are not signed in (your session expired). Please sign in again and retry."
    );
  }

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    throw new Error(await getDetailedErrorMessage(error));
  }
  const result = data as { success?: boolean; error?: string } | null;
  if (result && result.success === false) {
    throw new Error(result.error || `${name} failed for an unknown reason.`);
  }
  return data as T;
}
