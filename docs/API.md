# Partner-API

Diese API richtet sich an andere Praxisverwaltungssysteme (PVS) und
Drittanbieter, die die Leistungserfassungs-Validierung und/oder die
KI-Berichtsgenerierung dieses Projekts **als Baustein in ihr eigenes System
einbinden** möchten, statt die komplette Anwendung zu ersetzen. Maschinenlesbar
als OpenAPI-Spec: [`openapi.yaml`](../openapi.yaml).

**Wichtig:** Diese API ist bewusst **zustandslos** gegenüber Patientendaten
des Partners – es wird nichts davon gespeichert. Jeder Request wird
unabhängig verarbeitet und nur für die Dauer der Antwort verarbeitet. Das
reduziert den DSGVO-/Haftungsradius erheblich, da wir für die Patientendaten
des Partners nicht zum datenverarbeitenden Dritten werden.

## Authentifizierung

Alle Endpunkte erwarten einen API-Key im `Authorization`-Header:

```
Authorization: Bearer zbk_live_...
```

API-Keys werden vom Betreiber vergeben (kein Self-Service):

```bash
npm run api:create-client -- "Partnername GmbH"
```

Der volle Key wird nur einmal bei der Erstellung angezeigt – nur ein Hash
davon wird gespeichert. Rate-Limit: **60 Anfragen/Minute je API-Key**.

## Endpunkte

### `GET /api/v1/catalog`

Referenzkatalog (GOZ/BEMA/GOÄ/BEL-II-Positionen) und Sitzungstyp-Vorlagen
zum Abgleich mit der eigenen Ziffernstruktur.

```bash
curl https://ihre-domain.de/api/v1/catalog \
  -H "Authorization: Bearer zbk_live_..."
```

### `POST /api/v1/validate`

Prüft übergebene Leistungseinträge gegen Faktor-/Begründungspflicht-,
Ausschluss-, Gültigkeits- und Frequenzlimit-Regeln – dieselbe Engine, die
intern für die eigene Leistungserfassung genutzt wird. Der Partner bringt
seine eigenen Positionsdaten (oder die aus `/catalog`) mit; für das
Frequenzlimit muss der Partner selbst mitgeben, wie oft eine Position im
relevanten Zeitraum bereits abgerechnet wurde (`priorCount`), da wir keine
Historie speichern.

```bash
curl -X POST https://ihre-domain.de/api/v1/validate \
  -H "Authorization: Bearer zbk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "treatmentDate": "2026-08-08",
    "entries": [
      {
        "id": "z1",
        "title": "Eingehende Untersuchung",
        "performed": true,
        "faktor": 2.8,
        "faktorMin": 1.0,
        "faktorMax": 3.5,
        "regelhoechstfaktor": 2.3,
        "begruendungspflichtAbFaktor": 2.3
      }
    ]
  }'
```

Antwort bei fehlender Begründung:

```json
{
  "valid": false,
  "errors": [
    {
      "entryId": "z1",
      "message": "Bei \"Eingehende Untersuchung\" liegt der Faktor (2.8) über dem Regelhöchstfaktor (2.3) - dafür ist eine schriftliche Begründung erforderlich."
    }
  ]
}
```

### `POST /api/v1/reports/generate`

Erzeugt aus geprüften, strukturierten Leistungsdaten einen KI-Berichtsentwurf
(Befund-/Behandlungsbericht oder Bericht an die Krankenkasse). Wie in der
eigenen App ist der Text ein **Entwurf** und muss vor Versand fachlich
geprüft werden.

```bash
curl -X POST https://ihre-domain.de/api/v1/reports/generate \
  -H "Authorization: Bearer zbk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "BEFUND",
    "practiceName": "Zahnarztpraxis Beispiel",
    "authorName": "Dr. Beispiel",
    "fach": "zahn",
    "patient": { "firstName": "Max", "lastName": "Mustermann" },
    "treatmentDate": "2026-08-08",
    "entries": [
      { "system": "GOZ", "code": "0010", "title": "Eingehende Untersuchung", "performed": true }
    ]
  }'
```

Das Feld `fach` nennt die Fachrichtung der Praxis (Liste in `openapi.yaml`,
z. B. `hausarzt`, `augen`, `physio`). Es bestimmt Stil und Platzhalter des
Berichts. Ohne `fach` schreibt die API wie bisher zahnmedizinisch. Praxen
anderer Fachrichtungen geben das Fach deshalb immer mit.

## Was diese API nicht ersetzt

Diese API ist die **technische** Grundlage für eine Partnerintegration. Sie
ersetzt nicht:

- die **KZV-Zertifizierung** für die echte GKV-Abrechnung,
- eine **TI-/gematik-Anbindung** (KIM, ePA, SMC-B),
- eine formale **MDR-Einstufung** oder **EU-AI-Act-Konformitätsbewertung**,
- eine **DSGVO-Formalisierung** (DSFA, AVV mit dem Partner, ggf. ISO 27001).

Diese Punkte sind separate, nicht-technische Prozesse mit externen Stellen
(KZBV, gematik, Benannte Stellen, Datenschutzberatung) und nicht durch
Code allein lösbar.
