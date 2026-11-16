"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Link in der Kopfzeile am Tablet: markiert die aktuelle Seite für das Auge und für Vorleseprogramme. */
export function KopfLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pfad = usePathname();
  // Gleiche Regel wie in der Seitenleiste: Unterseiten zählen zum Bereich.
  const aktiv = pfad === href || (href !== "/dashboard" && pfad.startsWith(`${href}/`));
  return (
    <Link href={href} aria-current={aktiv ? "page" : undefined} className="hover:text-white aria-[current=page]:font-semibold aria-[current=page]:text-white">
      {children}
    </Link>
  );
}
