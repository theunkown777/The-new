# Voltra

Eine kostenlos hostbare Content-/Affiliate-Website (Nische: Tech-Gadgets &
Elektronik), gebaut mit [Astro](https://astro.build). Fünf fertige
Ratgeberartikel, Rechtstexte für Deutschland (Impressum, Datenschutz,
Affiliate-Hinweis), SEO-Grundausstattung (Sitemap, RSS, Meta-Tags) und ein
automatischer Deploy nach GitHub Pages sind bereits eingerichtet.

**Das ist der Rohbau, nicht das fertige Geschäft.** Passives Einkommen über
eine Content-Site entsteht erst durch echten Traffic (SEO, Zeit) und
regelmäßig neuen Content. Dieses Repo nimmt dir die technische Arbeit ab –
der Rest ist Pflege über Wochen/Monate.

## Wie das Geld verdient wird

1. **Amazon-Partnerprogramm (PartnerNet)** – Affiliate-Links in den
   Artikeln, du verdienst eine Provision an vermittelten Käufen.
2. **Optional später: Google AdSense** – sobald genug Traffic da ist
   (siehe unten).

Beides ist kostenlos nutzbar, es fällt nur eine Anmeldung an.

## 1. Lokal starten

```bash
npm install
npm run dev
```

Die Seite läuft dann unter `http://localhost:4321/the-new/`.

## 2. Kostenlos deployen (GitHub Pages)

Ist bereits vorbereitet über `.github/workflows/deploy.yml`.

1. Diesen Branch nach `main` mergen (oder direkt auf `main` weiterarbeiten).
2. Im GitHub-Repo unter **Settings → Pages** bei „Source" **GitHub Actions**
   auswählen.
3. Bei jedem Push auf `main` baut und deployed die Action die Seite
   automatisch nach `https://theunkown777.github.io/The-new/`.

Falls du später eine eigene Domain nutzt: `site` und `base` in
`astro.config.mjs` anpassen (`base: '/'` bei eigener Domain).

## 3. Amazon-Partnerprogramm einrichten

1. Auf [partnernet.amazon.de](https://partnernet.amazon.de) registrieren
   (kostenlos). Du brauchst dafür eine erreichbare Website mit Impressum –
   die hast du jetzt.
2. Nach der Freischaltung bekommst du ein **Partner-Tag** (z. B.
   `deinname-21`).
3. In allen Artikeln (`src/content/blog/*.md`) den Platzhalter
   `tag=deintag-21` durch dein echtes Tag ersetzen. Am schnellsten per
   Suchen-&-Ersetzen im ganzen `src/content/blog`-Ordner.
4. Die Platzhalter-Links sind aktuell Amazon-**Suchergebnis-Seiten** pro
   Produktkategorie (bewusst, um keine falschen/nicht mehr existierenden
   Produkte zu verlinken). Ersetze sie nach und nach durch Links zu
   konkreten Produkten, die du wirklich empfehlen willst – das erhöht die
   Klick- und Conversion-Rate spürbar.

⚠️ Amazon PartnerNet verlangt, dass innerhalb von 180 Tagen nach Anmeldung
mindestens 3 qualifizierte Verkäufe zustande kommen, sonst wird der Account
deaktiviert (Neuanmeldung ist dann wieder möglich). Ohne Traffic passiert
das nicht von selbst – siehe Punkt 5.

## 4. Google AdSense (optional, später)

Erst sinnvoll, wenn regelmäßig Besucher da sind. Ablauf:

1. Auf [adsense.google.com](https://adsense.google.com) anmelden, Website
   verifizieren.
2. Nach Freischaltung das AdSense-Script in `src/layouts/BaseLayout.astro`
   im `<head>` ergänzen.
3. **Wichtig (DSGVO):** Für Werbe-Cookies aus der EU ist ein
   Cookie-Consent-Banner Pflicht, das Nutzer:innen aktiv zustimmen lässt,
   bevor personalisierte Werbung geladen wird (z. B. über
   [Google Funding Choices](https://fundingchoices.google.com) oder ein
   CMP wie Klaro/Cookiebot). Die `datenschutz.astro`-Seite muss dann um den
   entsprechenden Abschnitt ergänzt werden.

## 5. Traffic aufbauen (der eigentliche Motor)

Ohne Besucher kein Umsatz. Das Wichtigste:

- **Regelmäßig neue Artikel** veröffentlichen (siehe unten) – Suchmaschinen
  belohnen aktive, thematisch fokussierte Seiten.
- **Keyword-Recherche** vor jedem neuen Artikel (z. B. mit dem kostenlosen
  Google Keyword Planner oder Ubersuggest) – schreib zu Themen, nach denen
  tatsächlich gesucht wird.
- **Interne Verlinkung**: neue Artikel auf bestehende verlinken und
  umgekehrt.
- **Search Console**: Seite bei
  [Google Search Console](https://search.google.com/search-console) und
  [Bing Webmaster Tools](https://www.bing.com/webmasters) anmelden (beide
  kostenlos) und die Sitemap
  (`https://theunkown777.github.io/The-new/sitemap-index.xml`)
  einreichen.
- Rechne realistisch: SEO-Traffic braucht meist **mehrere Monate**, bis er
  spürbar wird. Das ist normal, kein Zeichen, dass etwas falsch läuft.

## 6. Neue Artikel hinzufügen

Neue Datei in `src/content/blog/` anlegen, z. B.
`src/content/blog/mein-neuer-artikel.md`:

```markdown
---
title: "Artikel-Titel"
description: "Kurze Meta-Beschreibung für Suchmaschinen."
pubDate: 2026-03-01
tags: ["tag1", "tag2"]
icon: "charger"   # charger | keyboard | smart-plug | speaker | powerbank
products:
  - name: "Produktname bei Amazon ansehen"
    href: "https://www.amazon.de/s?k=suchbegriff&tag=deintag-21"
---

Artikeltext in Markdown …
```

Die Seite wird automatisch unter `/blog/mein-neuer-artikel/` erzeugt, taucht
in der Blog-Übersicht, Startseite, Sitemap und im RSS-Feed auf. Du kannst
mich (Claude) jederzeit bitten, neue Artikel für bestimmte Themen zu
schreiben – das kostet dich nichts Zusätzliches, da es Teil dieser Session
läuft.

## 7. Rechtliches – bitte vor dem Live-Gang prüfen

- **`src/pages/impressum.astro`**: Platzhalter durch deine echten Angaben
  ersetzen (Name, Anschrift, Kontakt). In Deutschland ist ein korrektes
  Impressum für kommerzielle Websites Pflicht.
- **`src/pages/datenschutz.astro`**: Passt zur aktuellen Konfiguration
  (Amazon-Affiliate-Links, kein Tracking). Sobald du AdSense, Analytics
  oder Newsletter-Tools hinzufügst, muss der Text erweitert werden.
- Diese Vorlagen sind **keine Rechtsberatung**. Für eine rechtssichere
  Fassung empfiehlt sich ein Generator wie
  [e-recht24.de](https://www.e-recht24.de) oder eine kurze anwaltliche
  Prüfung.

## Projektstruktur

```
src/
  components/    Header, Footer, AffiliateLink-Baustein
  content/blog/  Artikel als Markdown
  layouts/       Basis-Layout (Meta-Tags, SEO)
  pages/         Routen (Startseite, Blog, Rechtstexte, RSS)
  styles/        Globales CSS
.github/workflows/deploy.yml   Auto-Deploy nach GitHub Pages
```
