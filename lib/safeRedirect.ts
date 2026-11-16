// Ohne Node-Abhängigkeiten, damit auch Client-Komponenten (Login) es nutzen können.

/** Nur relative Pfade derselben Anwendung als Rücksprungziel zulassen (kein Open Redirect). */
export function safeCallbackPath(callbackUrl: string | null | undefined, origin: string, ersatz = "/dashboard"): string {
  if (!callbackUrl) return ersatz;
  try {
    const target = new URL(callbackUrl, origin);
    if (target.origin !== origin) return ersatz;
    return target.pathname + target.search;
  } catch {
    return ersatz;
  }
}

/**
 * Dasselbe ohne bekannte eigene Adresse (Serverseite): Der Wert muss ein Pfad sein, der auch nach den Regeln des
 * Browsers auf derselben Seite bleibt. „/\\fremd.example“ oder „/<Tab>/fremd.example“ beginnen mit „/“, führen im
 * Browser aber auf einen fremden Host; sie fallen hier durch.
 */
export function sichererPfad(wert: unknown, ersatz = "/"): string {
  if (typeof wert !== "string" || !wert.startsWith("/") || wert.length > 2000) return ersatz;
  return safeCallbackPath(wert, "http://eigene-seite.invalid", ersatz);
}
