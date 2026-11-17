"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RundgangKarte, fokusZurueck } from "@/components/RundgangKarte";
import { RUNDGANG_PARAM, appStationHref, rundgangNummer, type AppStationFertig } from "@/lib/rundgang";

// Rundgang durch die App der Praxis (lib/rundgang.ts, RUNDGANG_APP). Der Stand steht in der Adresse
// (?rundgang=n), nicht im Speicher des Browsers. Zurück und Weiter wechseln die Seite; wer anders weiterklickt,
// verlässt den Rundgang einfach. Die Stationen kommen vom Server, schon nach den Rechten des Kontos gefiltert.
export function AppRundgang({ stationen }: { stationen: AppStationFertig[] }) {
  const params = useSearchParams();
  const pfad = usePathname();
  const router = useRouter();
  const nr = rundgangNummer(params.get(RUNDGANG_PARAM), stationen.length);
  const station = nr ? stationen[nr - 1] : null;
  // Von wo aus der Rundgang geöffnet wurde (für den Fokus am Ende). Die Karte meldet es beim Aufbau, bevor sie den
  // Fokus nimmt (onStart). Ein eigener Effekt hier käme zu spät: Effekte der Karte laufen vor denen dieser Komponente.
  const ausloeser = useRef<HTMLElement | null>(null);

  // Adresse mit Station, aber andere Seite (z. B. von Hand eingegeben): zur Seite der Station wechseln.
  useEffect(() => {
    if (station && nr && pfad !== station.pfad) router.replace(appStationHref(stationen, nr));
  }, [station, nr, pfad, router, stationen]);

  // Menüpunkt der Station in der Seitenleiste markieren (nur am Desktop sichtbar).
  const ziel = station?.pfad;
  useEffect(() => {
    if (!ziel) return;
    const link = document.querySelector<HTMLElement>(`[data-testid="app-sidebar"] nav a[href="${ziel}"]`);
    link?.classList.add("rundgang-ziel");
    return () => link?.classList.remove("rundgang-ziel");
  }, [ziel]);

  if (!station || !nr) return null;

  const gehe = (n: number) => router.push(appStationHref(stationen, n));
  const beenden = () => {
    const rest = new URLSearchParams(params.toString());
    rest.delete(RUNDGANG_PARAM);
    const q = rest.toString();
    router.replace(q ? `${pfad}?${q}` : pfad, { scroll: false });
    fokusZurueck(ausloeser.current);
    ausloeser.current = null;
  };

  return (
    <RundgangKarte
      variante="app"
      nr={nr}
      anzahl={stationen.length}
      titel={station.titel}
      text={station.text}
      onStart={(vorher) => {
        ausloeser.current = vorher;
      }}
      onZurueck={() => gehe(Math.max(1, nr - 1))}
      onWeiter={() => gehe(Math.min(stationen.length, nr + 1))}
      onEnde={beenden}
    />
  );
}
