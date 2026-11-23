import { getServerSession } from "next-auth";
import { nurMitEinstellungen } from "@/lib/permissions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConnectorSettings } from "@/components/ConnectorSettings";
import { PVS_GUIDES_HINWEIS, anbindungGruppe, guideVermerk, pvsGuidesFuer } from "@/lib/pvsGuides";
import { systemGruppe } from "@/lib/fachprofile";

import { praxisText } from "@/lib/praxisFach";
export default async function ConnectorSettingsPage() {
  const ft = await praxisText();
  await nurMitEinstellungen();
  const session = await getServerSession(authOptions);
  const keys = await prisma.connectorKey.findMany({
    where: { practiceId: session!.user.practiceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true, gdtKennung: true, connectorInfo: true },
  });
  const server = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  const practice = await prisma.practice.findUnique({ where: { id: session!.user.practiceId }, select: { specialty: true } });
  // Drei Fassungen: Zahnmedizin mit VDDS-media, Arztpraxen mit GDT, alle anderen neutral (GDT nur als Möglichkeit).
  const gruppe = anbindungGruppe(practice?.specialty, systemGruppe);
  const zahn = gruppe === "zahn";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">{ft("Praxissoftware anbinden")}</h1>
        <p className="mt-1 text-sm text-slate-500" data-testid="connector-einleitung">
          {gruppe === "andere"
            ? ft("Sorrida läuft im Browser neben Ihrer Praxissoftware, ohne Installation. Bietet Ihre Software die Schnittstelle GDT an, kann sie Sorrida mit der gerade gewählten Akte öffnen: Bericht schreiben, Vorschlag erstellen, Verlauf ansehen. Ohne GDT brauchen Sie die Schritte auf dieser Seite nicht.")
            : ft("Sorrida öffnet sich als eigenes Fenster direkt aus Ihrer Praxissoftware, mit dem gerade gewählten Patienten: Bericht schreiben, Behandlungsvorschlag erstellen, Verlauf ansehen.")}
          {zahn
            ? ft(" Zahnarztpraxen werden über die Standardschnittstelle VDDS-media angebunden. Programme, die sie anbieten, können Sorrida mit dem aktuellen Patienten öffnen.")
            : gruppe === "arzt"
              ? ft(" Die Anbindung läuft über GDT, die Standardschnittstelle der Arztsoftware. Programme, die sie anbieten, können Sorrida mit dem aktuellen Patienten öffnen. Freigegebene Berichte gibt Sorrida über GDT an die Karteikarte zurück. Unterstützt Ihre Software kein GDT, nutzen Sie Sorrida im Browser daneben.")
              : ""}
        </p>
      </div>

      <ol className="space-y-6">
        <li className="card space-y-3">
          <h2 className="font-medium text-slate-900">1. Schlüssel für den Praxis-PC erzeugen</h2>
          {session!.user.role !== "admin" ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {ft("Nur Admin-Konten der Praxis können Schlüssel erzeugen oder widerrufen.")}
            </p>
          ) : null}
          <ConnectorSettings
            initialKeys={keys.map((k) => ({
              ...k,
              createdAt: k.createdAt.toISOString(),
              lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
              revokedAt: k.revokedAt?.toISOString() ?? null,
            }))}
            server={server}
            readOnly={session!.user.role !== "admin"}
            gruppe={gruppe}
          />
        </li>

        <li className="card space-y-3">
          <h2 className="font-medium text-slate-900">{ft("2. Connector auf jedem PC mit Praxissoftware installieren")}</h2>
          <p className="text-sm text-slate-600">
            Beide Dateien in denselben Ordner laden, PowerShell als Administrator öffnen und den oben
            angezeigten Befehl ausführen. Der Connector wird dabei mit dem in Windows enthaltenen
            .NET-Compiler übersetzt; es wird keine fremde Programmdatei heruntergeladen.
          </p>
          <div className="flex flex-wrap gap-2">
            <a className="btn-secondary" href="/connector/SorridaConnector.cs" download>SorridaConnector.cs</a>
            <a className="btn-secondary" href="/connector/install.ps1" download>install.ps1</a>
            <a className="btn-secondary" href="/connector/uninstall.ps1" download>uninstall.ps1</a>
          </div>
          <p className="text-sm text-slate-600">
            Am Ende prüft die Installation die Verbindung und zeigt das Ergebnis an. Den Test können Sie
            jederzeit wiederholen: <code className="break-all rounded bg-slate-100 px-1 text-xs">&quot;C:\Program Files\Sorrida\SorridaConnector.exe&quot; --test</code>.
            Hier oben sehen Sie danach „zuletzt verbunden“ und ob der Rückweg aktiv ist. Bei Problemen hilft das
            Protokoll <code className="break-all rounded bg-slate-100 px-1 text-xs">%LOCALAPPDATA%\Sorrida\connector.log</code> {ft("(ohne Patientendaten).")}
          </p>
          <p className="text-xs text-slate-500">
            {gruppe === "andere"
              ? "Übertragen werden nur der Name der Software, Nummer, Name, Titel, Geburtsdatum, Geschlecht, Versicherungsstatus und Kasse. Adresse, Telefon und Versichertennummer verlassen den PC nicht."
              : ft("Übertragen werden nur PVS-Name, Patientennummer, Name, Titel, Geburtsdatum, Geschlecht, Versicherungsstatus und Kasse. Adresse, Telefon und Versichertennummer verlassen den PC nicht.")}
          </p>
        </li>

        <li className="card space-y-4">
          <h2 className="font-medium text-slate-900">{ft("3. In der Praxissoftware aktivieren")}</h2>
          {/* Anleitungen passend zum Fach: Zahnarzt-Software über VDDS-media, Arztsoftware über GDT, sonst GDT in neutralen Worten */}
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="pvs-anleitung-vermerk">{PVS_GUIDES_HINWEIS}</p>
          {pvsGuidesFuer(gruppe).map((g) => (
            <div key={g.name}>
              <h3 className="text-sm font-semibold text-slate-800">
                {g.name}
              </h3>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                {g.steps.map((s) => <li key={s}>{gruppe === "andere" ? ft(s) : s}</li>)}
              </ol>
              <p className="mt-1 text-xs text-slate-500" data-testid="pvs-anleitung-quelle">Quelle: {g.source}. {guideVermerk(g)}</p>
            </div>
          ))}
        </li>
      </ol>
    </div>
  );
}
