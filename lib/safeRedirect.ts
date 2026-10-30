// Ohne Node-Abhängigkeiten, damit auch Client-Komponenten (Login) es nutzen können.

/** Nur relative Pfade derselben Anwendung als Rücksprungziel zulassen (kein Open Redirect). */
export function safeCallbackPath(callbackUrl: string | null | undefined, origin: string): string {
  if (!callbackUrl) return "/dashboard";
  try {
    const target = new URL(callbackUrl, origin);
    if (target.origin !== origin) return "/dashboard";
    return target.pathname + target.search;
  } catch {
    return "/dashboard";
  }
}
