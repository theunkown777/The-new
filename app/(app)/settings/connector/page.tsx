import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConnectorSettings } from "@/components/ConnectorSettings";
import { PVS_GUIDES } from "@/lib/pvsGuides";

export default async function ConnectorSettingsPage() {
  const session = await getServerSession(authOptions);
  const keys = await prisma.connectorKey.findMany({
    where: { practiceId: session!.user.practiceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true, gdtKennung: true, connectorInfo: true },
  });
  const server = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">Praxissoftware anbinden</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sorrida öffnet sich als eigenes Fenster direkt aus Ihrer Praxissoftware, mit dem gerade
          gewählten Patienten: Bericht schreiben, Behandlungsvorschlag erstellen, Verlauf ansehen.
          Zahnarztpraxen werden über den Branchenstandard VDDS-media angebunden (DS-Win, CGM Z1, charly,
          EVIDENT und viele weitere), Arztpraxen über GDT (Medistar, TURBOMED, CGM M1 PRO, x.isynet, ALBIS
          u. a.). Bei GDT kommen freigegebene Berichte automatisch zurück in die Karteikarte.
        </p>
      </div>

      <ol className="space-y-6">
        <li className="card space-y-3">
          <h2 className="font-medium text-slate-900">1. Schlüssel für den Praxis-PC erzeugen</h2>
          {session!.user.role !== "admin" ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Nur Admin-Konten der Praxis können Schlüssel erzeugen oder widerrufen.
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
          />
        </li>

        <li className="card space-y-3">
          <h2 className="font-medium text-slate-900">2. Connector auf jedem PC mit Praxissoftware installieren</h2>
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
            jederzeit wiederholen: <code className="rounded bg-slate-100 px-1 text-xs">&quot;C:\Program Files\Sorrida\SorridaConnector.exe&quot; --test</code>.
            Hier oben sehen Sie danach „zuletzt verbunden“ und ob der Rückweg aktiv ist. Bei Problemen hilft das
            Protokoll <code className="rounded bg-slate-100 px-1 text-xs">%LOCALAPPDATA%\Sorrida\connector.log</code> (ohne Patientendaten).
          </p>
          <p className="text-xs text-slate-400">
            Übertragen werden nur PVS-Name, Patientennummer, Name, Titel, Geburtsdatum, Geschlecht,
            Versicherungsstatus und Kasse. Adresse, Telefon und Versichertennummer verlassen den PC nicht.
          </p>
        </li>

        <li className="card space-y-4">
          <h2 className="font-medium text-slate-900">3. In der Praxissoftware aktivieren</h2>
          {PVS_GUIDES.map((g) => (
            <div key={g.name}>
              <h3 className="text-sm font-semibold text-slate-800">
                {g.name} {g.share && <span className="font-normal text-slate-400">· Marktanteil {g.share}</span>}
              </h3>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                {g.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <p className="mt-1 text-xs text-slate-400">Quelle: {g.source}</p>
            </div>
          ))}
        </li>
      </ol>
    </div>
  );
}
