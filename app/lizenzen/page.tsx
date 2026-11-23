import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { ERKLAER_BILDER } from "@/lib/modelle/erklaerBilder";
import { ANATOMIE_QUELLE } from "@/lib/modelle/drei/anatomie";

export const metadata: Metadata = {
  title: "Lizenzen und Quellen – Sorrida",
  description: "Quellen und Lizenzen der 3D-Modelle, Bilder, Schriften, Gebührenverzeichnisse und der freien Software, die Sorrida verwendet.",
};

// Was hier steht, muss belegt sein: 3D-Modelle aus public/anatomie-3d/README.md, Bilder aus lib/modelle/erklaerBilder.ts,
// Schriften aus den Metadaten der Dateien (public/fonts/LIZENZEN.txt), Software aus den package.json-Dateien der Pakete.
const SCHRIFTEN: [string, string, string][] = [
  ["Atkinson Hyperlegible", "Copyright 2020 Braille Institute of America, Inc.", "https://scripts.sil.org/OFL"],
  ["Caveat", "Copyright 2014 The Caveat Project Authors (github.com/googlefonts/caveat)", "https://scripts.sil.org/OFL"],
  ["Cormorant Garamond", "Copyright 2015 The Cormorant Project Authors (github.com/CatharsisFonts/Cormorant)", "https://openfontlicense.org"],
  ["JetBrains Mono", "Copyright 2020 The JetBrains Mono Project Authors (github.com/JetBrains/JetBrainsMono)", "https://scripts.sil.org/OFL"],
  ["Schibsted Grotesk", "Copyright 2023 The Schibsted-Grotesk Project Authors (github.com/schibsted/schibsted-grotesk)", "https://scripts.sil.org/OFL"],
];

// Direkt eingebundene Pakete (package.json, "dependencies") mit der Lizenz aus dem jeweiligen Paket.
const SOFTWARE: [string, string][] = [
  ["Next.js", "MIT"],
  ["React und React DOM", "MIT"],
  ["Prisma Client", "Apache-2.0"],
  ["NextAuth.js", "ISC"],
  ["three.js", "MIT"],
  ["zod", "MIT"],
  ["PDFKit", "MIT"],
  ["qrcode", "MIT"],
  ["bcryptjs", "MIT"],
  ["otplib", "MIT"],
  ["delaunator", "ISC"],
  ["Upstash Redis (Client)", "MIT"],
  ["Resend (Client)", "MIT"],
  ["Anthropic SDK", "MIT"],
];

const GEAENDERT_3D = [
  "Alle Netze sind stark vereinfacht und für das Laden im Browser gepackt.",
  "Viele Muskeln, Sehnen und Bänder gibt es in BodyParts3D nur rechts; die linke Seite ist gespiegelt.",
  "BodyParts3D 4.0 enthält keine Lungenoberfläche. Die Lungenhülle ist aus den Bronchien und Lungengefäßen berechnet und im Modell so gekennzeichnet.",
  "Die Weisheitszähne (18, 28, 38, 48) fehlen in den Daten; sie sind als verkleinerte Kopie des Nachbarzahns ergänzt.",
  "Der Kopf-Scan ist auf den Schädel ausgerichtet; für das Öffnen des Mundes sind Gewichte ergänzt.",
  "Instrumente, Beschriftungen und Markierungen stammen von Sorrida.",
];

export default function LizenzenPage() {
  const bilder = Object.values(ERKLAER_BILDER);
  return (
    <LegalPage title="Lizenzen und Quellen">
      <section id="modelle" className="scroll-mt-6">
        <h2>3D-Modelle</h2>
        <p data-testid="lizenz-3d">{ANATOMIE_QUELLE}</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <b>BodyParts3D 4.0</b>, © The Database Center for Life Science (DBCLS),{" "}
            <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html" target="_blank" rel="noopener noreferrer">dbarchive.biosciencedbc.jp</a>. Verwendet
            sind Daten mit Stand 22.05.2013. Lizenz laut den Dateiköpfen:{" "}
            <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution-Share Alike 2.1 Japan</a>.
            Die Datenbank selbst nennt seit 25.02.2025 die Lizenz CC Attribution 4.0 International mit der Namensnennung „BodyParts3D, © The
            Database Center for Life Science licensed under CC Attribution 4.0 International“.
          </li>
          <li>
            <b>Kopf:</b> „Infinite, 3D Head Scan“ von Lee Perry-Smith,{" "}
            <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 3.0 Unported</a>, bezogen aus
            dem Projekt three.js.
          </li>
        </ul>
        <p>
          <b>Lizenz der bearbeiteten Modelle:</b> Die von Sorrida bearbeiteten Modelle stehen unter{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.de" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a> (Weitergabe unter gleichen
          Bedingungen). Das gilt auch für die Vorschaubilder der Modelle.
        </p>
        <p>Was geändert wurde:</p>
        <ul className="ml-5 list-disc space-y-1">
          {GEAENDERT_3D.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <section id="bilder" className="scroll-mt-6">
        <h2>Anatomische Zeichnungen</h2>
        <p>
          Die Zeichnungen stammen von Servier Medical Art und stehen unter{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/deed.de" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Sie sind zugeschnitten, zum Teil
          zusammengesetzt oder vergrößert.
        </p>
        <ul className="ml-5 list-disc space-y-1" data-testid="lizenz-bilder">
          {bilder.map((b) => (
            <li key={b.datei}>
              „{b.titel ?? b.datei}“, {b.autor}, {b.lizenz}
              {b.geaendert ? ", bearbeitet" : ""}:{" "}
              <a href={b.quelleUrl} target="_blank" rel="noopener noreferrer">
                Quelle
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section id="schriften" className="scroll-mt-6">
        <h2>Schriften</h2>
        <p>
          Die folgenden Schriften liefert Sorrida vom eigenen Server aus. Sie stehen unter der SIL Open Font License 1.1. Urhebervermerk und
          Lizenzverweis stammen aus den Schriftdateien; sie stehen auch in <a href="/fonts/LIZENZEN.txt">/fonts/LIZENZEN.txt</a>.
        </p>
        <ul className="ml-5 list-disc space-y-1">
          {SCHRIFTEN.map(([name, urheber, url]) => (
            <li key={name}>
              <b>{name}:</b> {urheber}{urheber.endsWith(".") ? "" : "."}{" "}
              <a href={url} target="_blank" rel="noopener noreferrer">
                Lizenz
              </a>
            </li>
          ))}
        </ul>
        <p>Für den Fließtext nutzt Sorrida außerdem die Schrift Open Sans. Auch sie wird vom eigenen Server geladen, nicht von Google.</p>
      </section>

      <section id="verzeichnisse" className="scroll-mt-6">
        <h2>Gebührenverzeichnisse und Kataloge</h2>
        <p>Die Verzeichnisse stehen nur angemeldeten Praxen zur Verfügung. Quellen:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>GOÄ, GOZ, SGB XI und BBhV: gesetze-im-internet.de</li>
          <li>EBM: Stammdatei der Kassenärztlichen Bundesvereinigung (KBV), genutzt nach der Lizenzvereinbarung der KBV. Im Gastzugang wird der EBM nicht angezeigt.</li>
          <li>BEMA: Kassenzahnärztliche Bundesvereinigung (KZBV)</li>
          <li>Heilmittel und Hebammenhilfe: Verträge des GKV-Spitzenverbands</li>
          <li>Häusliche Krankenpflege: Richtlinie des Gemeinsamen Bundesausschusses</li>
          <li>Hilfsmittelverzeichnis: GKV-Spitzenverband</li>
          <li>UV-GOÄ: Deutsche Gesetzliche Unfallversicherung (DGUV), Stand 01.07.2026</li>
          <li>
            OPS: Herausgegeben vom Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) im Auftrag des Bundesministeriums für Gesundheit
            (BMG). Die Erstellung erfolgt unter Verwendung der maschinenlesbaren Fassung des BfArM.
          </li>
        </ul>
      </section>

      <section id="software" className="scroll-mt-6">
        <h2>Freie Software</h2>
        <p>Sorrida baut auf freier Software auf. Direkt eingebunden sind:</p>
        <ul className="ml-5 list-disc space-y-1">
          {SOFTWARE.map(([name, lizenz]) => (
            <li key={name}>
              {name}: {lizenz}
            </li>
          ))}
        </ul>
        <p>Diese Pakete bringen weitere Pakete mit. Eine vollständige Liste aller mitgelieferten Pakete liegt noch nicht vor.</p>
      </section>

      <p className="text-sm text-slate-500">Stand: 15.11.2026</p>
    </LegalPage>
  );
}
