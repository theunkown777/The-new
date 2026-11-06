"""Erzeugt den Sorrida-Leistungskatalog (JSON, CSV, Markdown).
Felder pro Leistung:
  id, bereich, kategorie, name (laienverständlich), fachbegriff, synonyme[],
  beschreibung, behandler, kostentraeger, gebuehrenordnung, invasivitaet,
  ausfallzeit, ust_pflichtig, hwg_vorher_nachher, hinweis
"""
import json, csv, re, unicodedata, sys
from collections import OrderedDict

KT = {
    "GKV": "Kassenleistung",
    "GKV_EA": "Kasse zahlt Festzuschuss/Teil – Eigenanteil",
    "IND": "Kasse nur bei med. Indikation, sonst Selbstzahler",
    "PKV": "Privatleistung (GKV-Patienten zahlen selbst, Zusatzversicherung möglich)",
    "SZ": "Selbstzahler (keine Kassenleistung)",
}
INV = {"N": "nicht-invasiv", "M": "minimal-invasiv", "O": "operativ"}
AUS = {"0": "keine", "1": "1–3 Tage", "2": "bis 1 Woche", "3": "1–3 Wochen", "4": "mehr als 3 Wochen"}

items = []
_bereich = None


def B(name):
    global _bereich
    _bereich = name


def slug(s):
    s = s.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def E(kat, name, fach, syn, desc, beh, kt, gebo, inv, aus, hwg="nein", ust=False, hinweis=""):
    items.append(OrderedDict(
        id=slug(f"{_bereich}-{name}"),
        bereich=_bereich,
        kategorie=kat,
        name=name,
        fachbegriff=fach,
        synonyme=[x.strip() for x in syn.split(",") if x.strip()],
        beschreibung=desc,
        behandler=beh,
        kostentraeger=KT[kt],
        kostentraeger_code=kt,
        gebuehrenordnung=gebo,
        invasivitaet=INV[inv],
        ausfallzeit=AUS[aus],
        ust_pflichtig=ust,
        hwg_vorher_nachher=hwg,
        hinweis=hinweis,
    ))


ZA = "Zahnarzt"
OC = "Oralchirurg / MKG-Chirurg / Implantologe"
KFO = "Kieferorthopäde"
MKG = "MKG-Chirurg"
ARZT = "Arzt (approbiert)"
PC = "Facharzt Plastische und Ästhetische Chirurgie"
DERM = "Facharzt Dermatologie"
AUG = "Facharzt Augenheilkunde"
GYN = "Facharzt Gynäkologie / Plastische Chirurgie"
KOS = "Kosmetiker/in (nicht ärztlich)"
HNO = "Facharzt HNO / Plastische Chirurgie"

# =====================================================================
B("Zahnmedizin")
k = "Vorsorge & Diagnostik"
E(k, "Kontrolluntersuchung", "Eingehende Untersuchung (01)", "Check-up, Vorsorge, Halbjahreskontrolle, Bonusheft", "Untersuchung von Zähnen, Zahnfleisch und Mundschleimhaut, Eintrag ins Bonusheft.", ZA, "GKV", "BEMA 01 / GOZ Abschnitt A (0010)", "N", "0")
E(k, "Professionelle Zahnreinigung", "PZR", "Zahnreinigung, Prophylaxe, Airflow, Dentalhygiene", "Entfernung harter und weicher Beläge, Politur, Fluoridierung.", "Zahnarzt / Dentalhygienikerin (ZMP, DH)", "PKV", "GOZ Abschnitt B (1040)", "N", "0", hinweis="Viele Krankenkassen geben Zuschuss.")
E(k, "Zahnsteinentfernung", "Entfernung harter Beläge", "Zahnstein entfernen", "Einmal jährlich Entfernung von Zahnstein.", ZA, "GKV", "BEMA 107 / GOZ 4050, 4055", "N", "0")
E(k, "Röntgen – Einzelbild", "Zahnfilm / Bissflügelaufnahme", "Röntgenbild, Bitewing", "Kleines Röntgenbild zur Karies- oder Wurzeldiagnostik.", ZA, "GKV", "BEMA Ä925 / GOÄ 5000", "N", "0")
E(k, "Röntgen – Panoramaaufnahme", "Orthopantomogramm (OPG)", "OPG, Panoramabild", "Übersichtsröntgen aller Zähne und Kiefer.", ZA, "GKV", "BEMA Ä935d / GOÄ 5004", "N", "0")
E(k, "3D-Röntgen", "Digitale Volumentomographie (DVT)", "DVT, 3D-Scan, CT Kiefer", "Dreidimensionale Darstellung für Implantat-, Weisheitszahn- und Wurzelplanung.", ZA, "PKV", "GOÄ 5370 ff. (analog)", "N", "0", hinweis="GKV übernimmt nur in Ausnahmefällen.")
E(k, "Digitaler Abdruck", "Intraoralscan", "3D-Scan Zähne, iTero, Scan statt Abdruck", "Optischer Abdruck ohne Abdruckmasse.", ZA, "PKV", "GOZ 0065 / analog", "N", "0")
E(k, "Kariesrisiko-Test", "Speicheltest / Kariesrisikobestimmung", "Bakterientest, Speicheltest", "Bestimmung von Kariesbakterien und Speichelqualität.", ZA, "SZ", "GOZ analog", "N", "0")
E(k, "Früherkennung Karies", "Kariesdiagnostik (Laser/Transillumination)", "DIAGNOdent, Kariesscan", "Karies ohne Röntgen früh erkennen.", ZA, "PKV", "GOZ analog", "N", "0")
E(k, "Mundkrebs-Vorsorge", "Mundschleimhaut-Screening / Bürstenbiopsie", "Krebsvorsorge Mund, Schleimhautcheck", "Untersuchung und ggf. Abstrich auffälliger Schleimhautstellen.", ZA, "PKV", "GOZ/GOÄ", "N", "0")
E(k, "Fluoridierung", "Lokale Fluoridierung", "Fluoridlack, Zahnschutz", "Auftragen von Fluoridlack zur Härtung des Zahnschmelzes.", ZA, "IND", "BEMA IP4, FLA / GOZ 1020", "N", "0")
E(k, "Beratung & Zweitmeinung", "Eingehende Beratung", "Zweitmeinung, Heil- und Kostenplan prüfen", "Beratung zu Behandlungsoptionen und Kostenplänen.", ZA, "GKV", "BEMA Ä1 / GOÄ 1, 3", "N", "0")
E(k, "Mundhygiene-Schulung", "Mundhygieneinstruktion", "Putztraining, Zahnputzschule", "Anleitung zur richtigen Zahnpflege und Hilfsmittel.", "Zahnarzt / Prophylaxe-Team", "PKV", "GOZ 1000, 1010", "N", "0")
E(k, "Mundgeruch-Sprechstunde", "Halitosis-Diagnostik und -Therapie", "Mundgeruch, schlechter Atem", "Ursachenanalyse und Behandlung von Mundgeruch.", ZA, "SZ", "GOZ analog", "N", "0")

k = "Kinderzahnheilkunde"
E(k, "Früherkennung Kleinkind", "Früherkennungsuntersuchung (FU)", "Kinderzahnarzt, FU1, FU2", "Zahnärztliche Vorsorge ab dem 6. Lebensmonat.", ZA, "GKV", "BEMA FU1–FU2, FUPr, FLA", "N", "0")
E(k, "Individualprophylaxe Kinder", "IP1–IP5", "Kinderprophylaxe, Versiegelung Kinder", "Vorsorgeprogramm für 6- bis 17-Jährige inkl. Versiegelung.", ZA, "GKV", "BEMA IP1–IP5", "N", "0")
E(k, "Fissurenversiegelung", "Fissurenversiegelung", "Versiegelung Backenzähne", "Kunststoffversiegelung der Kauflächen gegen Karies.", ZA, "IND", "BEMA IP5 / GOZ 2000", "N", "0", hinweis="Kasse: bleibende Backenzähne bis 17 J.")
E(k, "Milchzahnbehandlung", "Füllung/Pulpotomie im Milchgebiss", "Milchzahn Füllung, Kinderfüllung", "Erhalt kariöser Milchzähne.", ZA, "GKV", "BEMA Teil 1", "M", "0")
E(k, "Kinderkrone", "Konfektionierte Kinderkrone", "Stahlkrone Kind, Zirkonkrone Kind", "Vorgefertigte Krone für stark zerstörte Milchzähne.", ZA, "GKV", "BEMA 14 / GOZ 2250", "M", "0", hinweis="Zahnfarbene Zirkon-Kinderkronen sind Privatleistung.")
E(k, "Lückenhalter", "Lückenhalter", "Platzhalter Milchzahn", "Hält Platz nach frühem Milchzahnverlust frei.", "Zahnarzt / Kieferorthopäde", "GKV", "BEMA KFO / GOZ Abschnitt G", "N", "0")
E(k, "Behandlung Kreidezähne", "MIH-Therapie", "Kreidezähne, MIH, Schmelzbildungsstörung", "Schutz und Versorgung von Zähnen mit Schmelzbildungsstörung.", ZA, "IND", "BEMA / GOZ", "M", "0")
E(k, "Kinderbehandlung unter Lachgas oder Narkose", "Sedierung im Kindesalter", "Lachgas Kind, Narkose Kind", "Angstfreie Behandlung für Kinder.", "Zahnarzt + Anästhesist", "IND", "GOÄ / BEMA bei Indikation", "M", "0")

k = "Füllungen & Zahnerhaltung"
E(k, "Kunststofffüllung (Kassenstandard)", "Füllung aus selbstadhäsivem Material", "Füllung, Plombe, Kassenfüllung", "Zahnfarbene Standardfüllung ohne Zuzahlung.", ZA, "GKV", "BEMA 13a–d", "M", "0", hinweis="Seit EU-Amalgamverbot (2025) Kassenstandard.")
E(k, "Komposit-Füllung (Mehrschicht)", "Adhäsive Kompositrestauration", "Kunststofffüllung, weiße Füllung, ästhetische Füllung", "Hochwertige, unsichtbare Füllung in Schichttechnik.", ZA, "GKV_EA", "GOZ 2060–2120 (Mehrkosten)", "M", "0")
E(k, "Glasionomer-Füllung", "Glasionomerzement-Füllung", "provisorische Füllung, Zementfüllung", "Einfache Füllung, oft für Milchzähne oder Zahnhälse.", ZA, "GKV", "BEMA 13", "M", "0")
E(k, "Keramik-Inlay", "Vollkeramisches Inlay", "Keramikfüllung, Inlay", "Im Labor oder chairside gefertigte Keramikfüllung.", ZA, "GKV_EA", "GOZ 2150–2170", "M", "0")
E(k, "Gold-Inlay", "Goldgussfüllung", "Goldfüllung, Inlay Gold", "Langlebige Füllung aus Goldlegierung.", ZA, "GKV_EA", "GOZ 2150–2170", "M", "0")
E(k, "Onlay / Teilkrone", "Onlay / Overlay / Teilkrone", "Teilkrone, Keramik-Onlay", "Ersetzt größere Zahnbereiche inkl. Höcker.", ZA, "GKV_EA", "GOZ 2150–2170, 2200", "M", "0")
E(k, "Zahnersatz in einer Sitzung (CEREC)", "CAD/CAM-Chairside-Restauration", "CEREC, Same-Day-Krone", "Inlay oder Krone in einer Sitzung gefräst.", ZA, "PKV", "GOZ + Material", "M", "0")
E(k, "Zahnhalsfüllung", "Zahnhalsrestauration", "freiliegende Zahnhälse, Keildefekt", "Versorgung empfindlicher oder abgenutzter Zahnhälse.", ZA, "GKV", "BEMA 13 / GOZ 2060 ff.", "M", "0")
E(k, "Behandlung empfindlicher Zähne", "Desensibilisierung", "Schmerzempfindliche Zähne, Kälteempfindlichkeit", "Versiegelung offener Dentinkanälchen.", ZA, "GKV", "BEMA 10 (üZ) / GOZ 2010", "N", "0")
E(k, "Kariesinfiltration", "Kariesinfiltration (Icon)", "Icon, White Spots, Initialkaries ohne Bohren", "Stoppt beginnende Karies ohne Bohren und hellt Flecken auf.", ZA, "SZ", "GOZ analog", "N", "0")
E(k, "Aufbaufüllung", "Plastischer Aufbau / Stiftaufbau", "Stumpfaufbau, Glasfaserstift", "Aufbau eines stark zerstörten Zahns vor einer Krone.", ZA, "GKV_EA", "BEMA 13, 18 / GOZ 2180, 2195", "M", "0")

k = "Wurzelbehandlung (Endodontie)"
E(k, "Wurzelkanalbehandlung", "Endodontische Behandlung", "Wurzelbehandlung, WKB, Nerv ziehen", "Reinigung, Desinfektion und Füllung der Wurzelkanäle.", ZA, "IND", "BEMA 28–35 / GOZ 2360–2440", "M", "1", hinweis="Kasse bei erhaltungswürdigen Zähnen; Spezialtechniken privat.")
E(k, "Wurzelbehandlung mit Mikroskop", "Mikroskopgestützte Endodontie", "Endodontie Spezialist, Dentalmikroskop", "Hochpräzise Wurzelbehandlung unter Vergrößerung.", "Zahnarzt (Endodontologe)", "PKV", "GOZ 0110 + 2360–2440", "M", "1")
E(k, "Revision einer Wurzelbehandlung", "Endodontische Revision", "Wurzelbehandlung wiederholen", "Erneute Behandlung bei Entzündung trotz alter Wurzelfüllung.", "Zahnarzt (Endodontologe)", "IND", "BEMA / GOZ 2410 ff.", "M", "1")
E(k, "Wurzelspitzenresektion", "Wurzelspitzenresektion (WSR)", "WSR, Wurzelspitze kappen", "Chirurgische Entfernung der entzündeten Wurzelspitze.", OC, "GKV", "BEMA 54 / GOZ 3110–3120", "O", "2")
E(k, "Vitalerhaltung des Zahnnervs", "Direkte/indirekte Überkappung, Pulpotomie", "Nerv erhalten, Überkappung", "Schutz des Nervs bei tiefer Karies.", ZA, "GKV", "BEMA 25, 26 / GOZ 2330, 2340", "M", "0")
E(k, "Zahnaufhellung von innen", "Internes Bleaching", "wurzelbehandelter Zahn dunkel, Walking Bleach", "Aufhellung eines verfärbten, wurzelbehandelten Zahns.", ZA, "SZ", "GOZ analog / Verlangensleistung", "M", "0", ust=True)

k = "Zahnfleisch & Parodontologie"
E(k, "Parodontitis-Behandlung", "Systematische PAR-Therapie (AIT)", "Parodontose, Zahnfleischentzündung, Tiefenreinigung", "Reinigung tiefer Zahnfleischtaschen nach PAR-Richtlinie.", ZA, "GKV", "BEMA Teil 4 (ATG, MHU, AIT, BEV) / GOZ Abschnitt E", "M", "1")
E(k, "Parodontitis-Nachsorge", "Unterstützende Parodontitistherapie (UPT)", "UPT, PA-Nachsorge", "Regelmäßige Nachsorge nach PAR-Behandlung über 2 Jahre.", ZA, "GKV", "BEMA UPTa–g", "N", "0")
E(k, "Chirurgische Parodontaltherapie", "Offene Kürettage / Lappenoperation", "PA-Chirurgie, Lappen-OP", "Operative Reinigung sehr tiefer Taschen.", "Zahnarzt (Parodontologe)", "GKV", "BEMA CPT / GOZ 4090, 4100", "O", "2")
E(k, "Regenerative Parodontaltherapie", "GTR / Schmelzmatrixproteine", "Emdogain, Knochenregeneration Zahnfleisch", "Wiederaufbau verlorenen Zahnhalteapparats.", "Zahnarzt (Parodontologe)", "PKV", "GOZ 4138 + Material", "O", "2")
E(k, "Laser-Parodontaltherapie", "Laserunterstützte PA-Therapie / aPDT", "Laser Zahnfleisch, photodynamische Therapie", "Keimreduktion in Zahnfleischtaschen per Laser oder Licht.", ZA, "SZ", "GOZ 0120 / analog", "M", "0")
E(k, "Bakterientest Zahnfleisch", "Mikrobiologische Keimbestimmung", "Markerkeimtest, PA-Test", "Bestimmung aggressiver Parodontitis-Bakterien.", ZA, "SZ", "GOÄ Labor", "N", "0")
E(k, "Zahnfleischrückgang decken", "Rezessionsdeckung", "Zahnfleischtransplantat, freiliegende Zahnhälse decken", "Plastische Deckung freiliegender Zahnhälse.", "Zahnarzt (Parodontologe)", "PKV", "GOZ 4130, 4133", "O", "2", hwg="prüfen")
E(k, "Zahnfleischtransplantat", "Freies Schleimhaut- / Bindegewebstransplantat", "Gaumentransplantat, BGT", "Verdickung oder Verbreiterung des Zahnfleischs.", "Zahnarzt (Parodontologe)", "PKV", "GOZ 4130, 4133", "O", "2")
E(k, "Kronenverlängerung", "Chirurgische Kronenverlängerung", "Zahn verlängern, Gummy Smile chirurgisch", "Freilegen von mehr Zahnsubstanz für Versorgung oder Ästhetik.", "Zahnarzt (Parodontologe)", "PKV", "GOZ analog", "O", "2", hwg="prüfen")

k = "Oralchirurgie"
E(k, "Zahnentfernung", "Extraktion", "Zahn ziehen, Zahn extrahieren", "Entfernung nicht erhaltungswürdiger Zähne.", ZA, "GKV", "BEMA 43–45 / GOZ 3000–3030", "O", "1")
E(k, "Weisheitszahn-OP", "Operative Weisheitszahnentfernung", "Weisheitszähne ziehen, Osteotomie", "Entfernung verlagerter oder störender Weisheitszähne.", OC, "GKV", "BEMA 47a, 48 / GOZ 3040–3045", "O", "2")
E(k, "Freilegung verlagerter Zähne", "Operative Freilegung", "Eckzahn freilegen", "Freilegung im Kiefer liegender Zähne für die KFO.", OC, "GKV", "BEMA 63 / GOZ Abschnitt D", "O", "2")
E(k, "Zystenentfernung", "Zystektomie / Zystostomie", "Kieferzyste", "Entfernung von Zysten im Kiefer.", OC, "GKV", "BEMA 56 / GOZ 3190, 3200", "O", "2")
E(k, "Abszessbehandlung", "Inzision / Drainage", "dicke Backe, Eiter, Schwellung", "Eröffnung und Entlastung eines Abszesses.", ZA, "GKV", "BEMA Teil 1 / GOZ Abschnitt D", "M", "1")
E(k, "Lippenbändchen-Korrektur", "Frenektomie", "Zungenbändchen, Lippenbändchen durchtrennen", "Korrektur störender Bändchen.", OC, "GKV", "BEMA Teil 1 / GOZ Abschnitt D", "O", "1")
E(k, "Probeentnahme", "Biopsie", "Gewebeprobe Mund", "Entnahme verdächtigen Gewebes zur Untersuchung.", OC, "GKV", "BEMA / GOÄ 2401", "O", "1")
E(k, "Kieferkammerhalt nach Zahnentfernung", "Socket Preservation", "Alveolenschutz, Kieferkamm erhalten", "Füllen der Zahnlücke mit Knochenersatz für spätere Implantate.", OC, "PKV", "GOZ Abschnitt K / analog", "O", "2")
E(k, "Plättchenreiches Fibrin (PRF)", "PRF / Eigenblutkonzentrat", "Eigenblut Wundheilung, A-PRF", "Eigenblut zur schnelleren Wundheilung nach OPs.", OC, "SZ", "GOZ/GOÄ analog", "M", "0")

k = "Implantologie"
E(k, "Zahnimplantat (Einzelzahn)", "Enossales Implantat", "Implantat, künstliche Zahnwurzel", "Titan- oder Keramikschraube als Ersatz der Zahnwurzel.", OC, "GKV_EA", "GOZ 9000–9040 / BEMA-Festzuschuss für Krone", "O", "2", hinweis="Kasse zahlt nur Festzuschuss auf Suprakonstruktion.")
E(k, "Keramikimplantat", "Zirkonoxid-Implantat", "Metallfreies Implantat, Keramikimplantat", "Weißes, metallfreies Implantat.", OC, "GKV_EA", "GOZ 9000 ff.", "O", "2")
E(k, "Sofortimplantat", "Sofortimplantation", "Implantat am selben Tag", "Implantat direkt nach der Zahnentfernung.", OC, "GKV_EA", "GOZ 9010 ff.", "O", "2")
E(k, "Feste Zähne an einem Tag", "All-on-4 / All-on-6 Sofortversorgung", "All-on-4, Zähne in einem Tag, feste dritte Zähne", "Ganzer Kiefer mit 4–6 Implantaten und sofortiger Brücke.", OC, "GKV_EA", "GOZ Abschnitt K + F", "O", "3")
E(k, "Mini-Implantate", "Durchmesserreduzierte Implantate", "Miniimplantat Prothese", "Kleine Implantate, oft zum Halt von Prothesen.", OC, "GKV_EA", "GOZ 9000 ff.", "O", "1")
E(k, "Navigierte Implantation", "Schablonengeführte Implantation", "3D-geplante Implantation, Bohrschablone", "Exakt per DVT geplante und geführte Implantation.", OC, "PKV", "GOZ 9003, 9005", "O", "2")
E(k, "Knochenaufbau", "Augmentation", "Knochenaufbau Kiefer, Knochentransplantat", "Aufbau von Kieferknochen vor/bei Implantation.", OC, "PKV", "GOZ 9100, 9140", "O", "3")
E(k, "Sinuslift", "Sinusbodenelevation (intern/extern)", "Kieferhöhlenanhebung", "Knochenaufbau im Oberkiefer-Seitenzahnbereich.", OC, "PKV", "GOZ 9110, 9120", "O", "3")
E(k, "Implantatkrone / -brücke", "Implantatgetragene Suprakonstruktion", "Krone auf Implantat", "Sichtbarer Zahnersatz auf dem Implantat.", ZA, "GKV_EA", "GOZ 2200 ff. / BEMA-Festzuschuss", "M", "0")
E(k, "Implantat-Entzündung behandeln", "Periimplantitis-Therapie", "Implantat entzündet, Periimplantitis", "Reinigung und ggf. chirurgische Sanierung um Implantate.", OC, "PKV", "GOZ Abschnitt E / analog", "O", "2")
E(k, "Implantat-Nachsorge", "Implantatprophylaxe", "Implantatreinigung", "Regelmäßige professionelle Reinigung von Implantaten.", "Zahnarzt / Prophylaxe-Team", "PKV", "GOZ 1040 / analog", "N", "0")

k = "Zahnersatz (Prothetik)"
E(k, "Vollkeramikkrone", "Vollkeramische Krone (Zirkon/Lithiumdisilikat)", "Zirkonkrone, Keramikkrone, Emax", "Metallfreie, natürlich wirkende Krone.", ZA, "GKV_EA", "GOZ 2210 / BEMA-Festzuschuss", "M", "0")
E(k, "Metallkeramikkrone", "Verblendmetallkeramik-Krone (VMK)", "VMK-Krone, verblendete Krone", "Metallgerüst mit Keramikverblendung.", ZA, "GKV_EA", "BEMA 20b / GOZ 2210", "M", "0")
E(k, "Goldkrone", "Vollgusskrone", "Goldkrone, Metallkrone", "Krone aus Goldlegierung oder Metall (Regelversorgung Seitenzahn).", ZA, "GKV_EA", "BEMA 20a / GOZ 2210", "M", "0")
E(k, "Brücke", "Festsitzende Brücke", "Zahnbrücke, Keramikbrücke", "Überbrückt Zahnlücken mit Kronen auf Nachbarzähnen.", ZA, "GKV_EA", "BEMA 91 / GOZ 5000 ff.", "M", "0")
E(k, "Klebebrücke", "Adhäsivbrücke (Marylandbrücke)", "Marylandbrücke, Flügelbrücke", "Minimalinvasiver Lückenschluss im Frontzahnbereich.", ZA, "GKV_EA", "BEMA 93 / GOZ 5150", "M", "0")
E(k, "Teilprothese", "Modellgussprothese / Klammerprothese", "herausnehmbarer Zahnersatz, Klammerprothese", "Herausnehmbarer Ersatz für mehrere fehlende Zähne.", ZA, "GKV_EA", "BEMA 96 / GOZ 5200 ff.", "N", "0")
E(k, "Teleskop- oder Geschiebeprothese", "Kombinierter Zahnersatz", "Teleskopprothese, Doppelkrone, Geschiebe", "Unsichtbar verankerte herausnehmbare Prothese.", ZA, "GKV_EA", "GOZ 5040, 5080 ff.", "M", "0")
E(k, "Vollprothese", "Totalprothese", "Gebiss, dritte Zähne, Vollgebiss", "Kompletter Zahnersatz für zahnlose Kiefer.", ZA, "GKV_EA", "BEMA 97 / GOZ 5220, 5230", "N", "0")
E(k, "Implantatgetragene Prothese", "Implantatprothese (Locator/Steg)", "Druckknopfprothese, Stegprothese", "Prothese, die auf Implantaten sicher einrastet.", ZA, "GKV_EA", "GOZ 5000 ff. + 9000 ff.", "O", "2")
E(k, "Prothese unterfüttern / reparieren", "Unterfütterung / Reparatur", "Prothese drückt, Prothese gebrochen", "Anpassung oder Reparatur bestehender Prothesen.", ZA, "GKV_EA", "BEMA 100 / GOZ 5250 ff.", "N", "0")
E(k, "Provisorium", "Provisorische Versorgung / Langzeitprovisorium", "Übergangskrone, Interimsprothese", "Schutz und Ästhetik während der Behandlungszeit.", ZA, "GKV_EA", "BEMA 19 / GOZ 2260–2270, 7080", "M", "0")

k = "Funktion, Kiefergelenk & Schlaf"
E(k, "Funktionsanalyse", "Klinische/instrumentelle Funktionsanalyse", "CMD-Diagnostik, Kiefergelenkcheck", "Untersuchung von Kiefergelenk, Muskeln und Biss.", ZA, "PKV", "GOZ Abschnitt J (8000–8100)", "N", "0")
E(k, "CMD-Behandlung", "Therapie craniomandibulärer Dysfunktion", "Kieferschmerzen, Kiefergelenk knackt, CMD", "Behandlung von Kiefergelenk- und Muskelbeschwerden.", ZA, "IND", "GOZ J + H / BEMA K1–K4", "N", "0")
E(k, "Knirscherschiene", "Okklusionsschiene / Aufbissschiene", "Beißschiene, Bruxismus-Schiene, Nachtschiene", "Schützt Zähne vor Abrieb durch Knirschen.", ZA, "IND", "BEMA K1 / GOZ 7000", "N", "0")
E(k, "Schnarcherschiene", "Unterkieferprotrusionsschiene (UKPS)", "Anti-Schnarch-Schiene, Schlafapnoe-Schiene", "Schiebt den Unterkiefer vor und hält Atemwege frei.", ZA, "IND", "BEMA (bei Schlafapnoe-Diagnose) / GOZ analog", "N", "0", hinweis="Kasse bei ärztlich diagnostizierter Schlafapnoe.")
E(k, "Botox gegen Zähneknirschen", "Botulinumtoxin in den Kaumuskel (Masseter)", "Bruxismus Botox, Masseter Botox", "Entspannt überaktive Kaumuskeln.", ARZT, "SZ", "GOÄ analog", "M", "0", hwg="prüfen", hinweis="Rechtsprechung: Botox durch Zahnärzte umstritten/teils untersagt – ärztliche Durchführung empfohlen.")

k = "Komfort & Angstpatienten"
E(k, "Örtliche Betäubung", "Lokalanästhesie", "Spritze, Betäubung", "Schmerzausschaltung im Behandlungsbereich.", ZA, "GKV", "BEMA I, L1 / GOZ 0080–0100", "M", "0")
E(k, "Computergesteuerte Betäubung", "Computergestützte Anästhesie (z. B. The Wand)", "schmerzarme Spritze", "Besonders sanfte, dosierte Anästhesie.", ZA, "SZ", "GOZ analog", "M", "0")
E(k, "Lachgas-Sedierung", "Lachgassedierung", "Lachgas, Distickstoffmonoxid", "Entspannung bei vollem Bewusstsein.", ZA, "SZ", "GOÄ analog", "N", "0")
E(k, "Dämmerschlaf", "Analgosedierung / i.v.-Sedierung", "Sedierung, Dämmerschlaf", "Tiefe Entspannung per Infusion.", "Zahnarzt + Anästhesist", "IND", "GOÄ", "M", "0")
E(k, "Vollnarkose", "Intubationsnarkose / ITN", "Narkose Zahnarzt", "Behandlung im Schlaf.", "Anästhesist", "IND", "GOÄ / BEMA bei Indikation", "M", "1")
E(k, "Zahnarzt-Hypnose", "Dentale Hypnose", "Hypnose Angstpatient", "Entspannung durch hypnotische Techniken.", ZA, "SZ", "GOÄ analog", "N", "0")

k = "Notfall"
E(k, "Zahnschmerz-Notfall", "Schmerzbehandlung", "Zahnschmerzen, Notdienst", "Akutbehandlung bei Schmerzen.", ZA, "GKV", "BEMA / GOZ", "M", "0")
E(k, "Zahnunfall", "Zahntrauma-Versorgung", "Zahn abgebrochen, Zahn ausgeschlagen, Frontzahntrauma", "Versorgung abgebrochener oder ausgeschlagener Zähne.", ZA, "GKV", "BEMA / GOZ", "M", "0")
E(k, "Krone/Füllung verloren", "Wiederbefestigung / Notversorgung", "Krone rausgefallen, Füllung raus", "Wiedereinsetzen oder provisorischer Ersatz.", ZA, "GKV", "BEMA 24 / GOZ 2310", "N", "0")

k = "Spezielle Zielgruppen"
E(k, "Individueller Sportmundschutz", "Konfektionierter/individueller Mundschutz", "Mundschutz Kampfsport, Zahnschutz Sport", "Maßgefertigter Schutz vor Zahnverletzungen beim Sport.", ZA, "SZ", "GOZ analog + Labor", "N", "0")
E(k, "Zahnbehandlung in der Schwangerschaft", "Schwangerschaftsprophylaxe", "Schwangerschaftsgingivitis", "Vorsorge und schonende Behandlung in der Schwangerschaft.", ZA, "GKV", "BEMA", "N", "0")
E(k, "Aufsuchende Zahnmedizin", "Hausbesuch / Pflegeheimbetreuung", "Hausbesuch Zahnarzt, Pflegebedürftige", "Behandlung zu Hause oder im Pflegeheim.", ZA, "GKV", "BEMA 171–174 / PKV", "N", "0")
E(k, "Ganzheitliche Zahnmedizin", "Umweltzahnmedizin / biologische Zahnmedizin", "Amalgamsanierung, metallfrei, Störfeld", "Metallfreie Versorgung, Materialverträglichkeitstest.", ZA, "SZ", "GOZ analog", "M", "0")

# =====================================================================
B("Ästhetische Zahnmedizin")
k = "Zahnaufhellung"
E(k, "Bleaching in der Praxis", "In-Office-Bleaching", "Zahnaufhellung, Power-Bleaching, weiße Zähne", "Aufhellung in einer Sitzung mit hochkonzentriertem Gel.", ZA, "SZ", "Verlangensleistung §2 Abs. 3 GOZ / analog", "N", "0", ust=True)
E(k, "Bleaching für zu Hause", "Home-Bleaching mit Schiene", "Bleaching Schiene, Zahnaufhellung zu Hause", "Individuelle Schienen mit Gel für die Anwendung daheim.", ZA, "SZ", "Verlangensleistung / analog", "N", "0", ust=True)
E(k, "Weiße Flecken entfernen", "Mikroabrasion / Kariesinfiltration", "White Spots, Flecken auf Zähnen", "Entfernt oder kaschiert helle Schmelzflecken.", ZA, "SZ", "GOZ analog", "N", "0", ust=True)
E(k, "Zahnschmuck", "Dental Jewelry / Twinkles", "Zahnstein Glitzer, Zahn-Diamant", "Aufkleben von Schmuckstein auf den Zahn.", ZA, "SZ", "Verlangensleistung", "N", "0", ust=True)

k = "Veneers & Zahnform"
E(k, "Keramik-Veneers", "Keramikverblendschalen", "Veneers, Verblendschalen, Hollywood-Lächeln", "Hauchdünne Keramikschalen für Form und Farbe.", ZA, "SZ", "GOZ 2220 + Labor", "M", "0", ust=True, hwg="prüfen")
E(k, "Non-Prep-Veneers", "Veneers ohne Beschleifen", "Lumineers, No-Prep-Veneers", "Veneers ohne oder mit minimalem Beschleifen.", ZA, "SZ", "GOZ analog + Labor", "N", "0", ust=True)
E(k, "Komposit-Veneers", "Direkte Kompositverblendung", "Bonding-Veneers, Komposit-Schalen", "In einer Sitzung modellierte Kunststoff-Veneers.", ZA, "SZ", "GOZ 2060 ff. / analog", "N", "0", ust=True)
E(k, "Zahnform-Korrektur", "Bonding / Formkorrektur mit Komposit", "Zahn verlängern, abgebrochene Ecke, Bonding", "Ergänzen von Ecken, Kanten und Formen.", ZA, "SZ", "GOZ 2060 ff.", "N", "0", ust=True)
E(k, "Zahnlücken schließen", "Diastema-Schluss", "Lücke Schneidezähne, Diastema", "Schließen von Lücken mit Komposit oder Veneers.", ZA, "SZ", "GOZ analog", "N", "0", ust=True)
E(k, "Zähne glätten / konturieren", "Einschleifen / Enameloplastik", "Zahnkanten glätten", "Feine Formkorrektur durch Polieren.", ZA, "SZ", "GOZ 4030 / analog", "N", "0", ust=True)
E(k, "Schwarze Dreiecke schließen", "Interdentale Rekonstruktion", "Black Triangles, Lücken am Zahnfleisch", "Füllen dunkler Zwischenräume am Zahnfleisch.", ZA, "SZ", "GOZ analog", "N", "0", ust=True)

k = "Lächeln-Planung"
E(k, "Digitales Smile Design", "Digital Smile Design (DSD)", "Lächeln planen, Smile Makeover", "Digitale Simulation des neuen Lächelns.", ZA, "SZ", "GOZ analog", "N", "0", ust=True)
E(k, "Probe-Lächeln (Mock-up)", "Mock-up / Wax-up", "Test-Veneers, Probetragen", "Neues Lächeln vorab im Mund testen.", ZA, "SZ", "GOZ analog + Labor", "N", "0", ust=True)
E(k, "Komplettes Smile Makeover", "Ästhetische Gesamtrehabilitation", "Smile Makeover, neues Lächeln", "Kombination aus Bleaching, Veneers, KFO, Zahnfleisch.", ZA, "SZ", "GOZ diverse", "M", "1", ust=True, hwg="prüfen")

k = "Rote Ästhetik (Zahnfleisch)"
E(k, "Zahnfleischkorrektur bei Gummy Smile", "Gingivektomie / ästhetische Kronenverlängerung", "Gummy Smile, zu viel Zahnfleisch, Zahnfleisch lasern", "Zahnfleischlinie modellieren für harmonisches Lächeln.", "Zahnarzt (Parodontologe)", "SZ", "GOZ 4080 / analog", "O", "1", ust=True, hwg="ja")
E(k, "Zahnfleisch aufhellen", "Depigmentierung der Gingiva", "dunkles Zahnfleisch, Laser Depigmentierung", "Entfernt dunkle Pigmentierungen am Zahnfleisch.", ZA, "SZ", "GOZ analog", "M", "1", ust=True)
E(k, "Botox bei Gummy Smile", "Botulinumtoxin Oberlippenheber", "Gummy Smile Botox", "Reduziert sichtbares Zahnfleisch beim Lächeln.", ARZT, "SZ", "GOÄ analog", "M", "0", ust=True, hwg="ja", hinweis="Ärztliche Leistung; Zahnärzte nur eingeschränkt.")

# =====================================================================
B("Kieferorthopädie")
k = "Zahnspangen"
E(k, "Feste Zahnspange", "Multibracket-Apparatur", "Brackets, feste Spange", "Klassische Brackets für komplexe Zahnfehlstellungen.", KFO, "IND", "BEMA Teil 3 (KIG ≥3, unter 18) / GOZ Abschnitt G", "N", "0", hinweis="Kasse: unter 18 J. ab KIG 3, Erwachsene nur kombiniert-chirurgisch.")
E(k, "Unsichtbare Zahnspange", "Aligner-Therapie", "Invisalign, durchsichtige Schienen, Aligner", "Transparente Schienen korrigieren Zähne schrittweise.", "Kieferorthopäde / Zahnarzt", "SZ", "GOZ Abschnitt G / analog", "N", "0")
E(k, "Innenliegende Zahnspange", "Linguale Apparatur", "Lingualtechnik, Incognito", "Unsichtbare Brackets auf der Zahninnenseite.", KFO, "SZ", "GOZ Abschnitt G", "N", "0")
E(k, "Keramik-Brackets", "Zahnfarbene Brackets", "weiße Brackets, Keramikspange", "Unauffälligere Alternative zu Metallbrackets.", KFO, "GKV_EA", "GOZ (Mehrkosten)", "N", "0")
E(k, "Lose Zahnspange", "Herausnehmbare Apparatur", "Platte, lose Spange, Aktivator", "Herausnehmbare Spange, v. a. bei Kindern.", KFO, "IND", "BEMA Teil 3 / GOZ G", "N", "0")
E(k, "Kieferorthopädische Frühbehandlung", "Frühbehandlung", "Kreuzbiss Kind, frühe Spange", "Frühe Korrektur ausgeprägter Fehlstellungen.", KFO, "IND", "BEMA Teil 3", "N", "0")
E(k, "Retainer", "Festsitzender / herausnehmbarer Retainer", "Draht hinter den Zähnen, Halteschiene", "Sichert das Behandlungsergebnis nach der Spange.", "Kieferorthopäde / Zahnarzt", "IND", "GOZ Abschnitt G", "N", "0")
E(k, "Erwachsenen-Kieferorthopädie", "KFO bei Erwachsenen", "Zahnspange Erwachsene, schiefe Zähne", "Zahnkorrektur im Erwachsenenalter.", KFO, "SZ", "GOZ Abschnitt G", "N", "0")
E(k, "Kieferfehlstellung operativ korrigieren", "Dysgnathie-Chirurgie / kombinierte KFO-Chirurgie", "Kiefer-OP, Unterbiss, Rückbiss, Umstellungsosteotomie", "Kombination aus Spange und Kieferoperation.", f"{KFO} + {MKG}", "IND", "BEMA / GOÄ", "O", "4")

# =====================================================================
B("Mund-, Kiefer- & Gesichtschirurgie")
k = "MKG-Leistungen"
E(k, "Kiefergelenk-Operation", "Arthroskopie / Arthrozentese Kiefergelenk", "Kiefergelenk spülen", "Minimalinvasive Behandlung des Kiefergelenks.", MKG, "IND", "GOÄ", "O", "2")
E(k, "Kinnkorrektur (knöchern)", "Genioplastik", "Kinnverlagerung, fliehendes Kinn", "Verschiebung des Kinnknochens.", MKG, "IND", "GOÄ", "O", "3", hwg="ja", ust=True)
E(k, "Lippen-Kiefer-Gaumenspalte", "LKG-Spalten-Chirurgie", "Hasenscharte, Spalte", "Operative Korrektur angeborener Spaltbildungen.", MKG, "GKV", "GOÄ / EBM", "O", "4")
E(k, "Gesichtsverletzungen", "Frakturversorgung Gesicht/Kiefer", "Kieferbruch, Jochbeinbruch", "Versorgung von Brüchen im Gesichtsbereich.", MKG, "GKV", "GOÄ / EBM", "O", "4")
E(k, "Speicheldrüsen-Behandlung", "Speichelstein-Entfernung", "Speichelstein", "Entfernung von Speichelsteinen oder Drüsenveränderungen.", MKG, "GKV", "GOÄ / EBM", "O", "2")

# =====================================================================
B("Ästhetische Medizin (minimal-invasiv)")
k = "Botulinumtoxin (Botox)"
for name, fach, syn, desc in [
    ("Botox Zornesfalte", "Glabella-Behandlung", "Zornesfalte, Falte zwischen Augenbrauen", "Glättet die senkrechten Falten zwischen den Augenbrauen."),
    ("Botox Stirnfalten", "Frontalis-Behandlung", "Stirnfalten, Querfalten Stirn", "Glättet horizontale Stirnfalten."),
    ("Botox Krähenfüße", "Lateral-Canthal-Behandlung", "Lachfalten Augen, Krähenfüße", "Glättet Fältchen an den Augenaußenseiten."),
    ("Brauenlifting mit Botox", "Chemisches Browlift", "Augenbrauen anheben, Fox Eyes", "Hebt die Augenbrauen leicht an."),
    ("Lip Flip", "Botulinumtoxin Oberlippe", "Lippen voller wirken lassen ohne Filler", "Rollt die Oberlippe leicht nach außen."),
    ("Botox Kinn & Mundwinkel", "Mentalis/DAO-Behandlung", "Pflasterstein-Kinn, hängende Mundwinkel", "Entspannt Kinn- und Mundwinkelmuskeln."),
    ("Botox Hals", "Platysma-Behandlung / Nefertiti-Lift", "Halsfalten, Nefertiti Lift, Platysmabänder", "Glättet Halsbänder und strafft die Kieferlinie."),
    ("Gesicht verschmälern (Masseter-Botox)", "Masseter-Reduktion", "Jawline slimming, V-Shape", "Verkleinert vergrößerte Kaumuskeln, schmaleres Gesicht."),
    ("Bunny Lines", "Nasalis-Behandlung", "Nasenfalten", "Glättet Fältchen am Nasenrücken."),
]:
    E(k, name, fach, syn, desc, ARZT, "SZ", "GOÄ analog (§6 Abs. 2)", "M", "0", ust=True, hwg="prüfen")
E(k, "Behandlung von starkem Schwitzen", "Botulinumtoxin bei Hyperhidrose", "Schwitzen Achseln, Hyperhidrose", "Reduziert Schweißproduktion an Achseln, Händen, Füßen.", "Arzt / Dermatologe", "IND", "GOÄ", "M", "0", hinweis="Medizinische Indikation – Kostenübernahme teils möglich, ohne USt.")
E(k, "Botox bei Migräne", "Botulinumtoxin bei chronischer Migräne", "Migräne Botox", "Medizinische Behandlung chronischer Migräne.", "Facharzt Neurologie", "IND", "GOÄ / EBM", "M", "0")

k = "Hyaluron-Filler"
for name, fach, syn, desc in [
    ("Lippenunterspritzung", "Lippenaugmentation mit Hyaluronsäure", "Lippen aufspritzen, volle Lippen, Russian Lips", "Mehr Volumen und Kontur für die Lippen."),
    ("Nasolabialfalten auffüllen", "Nasolabialfalten-Behandlung", "Falten Nase-Mund", "Mildert die Falten zwischen Nase und Mund."),
    ("Marionettenfalten auffüllen", "Marionettenfalten-Behandlung", "Mundwinkelfalten", "Mildert Falten von den Mundwinkeln abwärts."),
    ("Wangenaufbau", "Midface-Volumisierung", "Wangenknochen betonen, Cheekbones", "Stellt Volumen im Mittelgesicht wieder her."),
    ("Tränenrinne", "Tear-Trough-Behandlung", "Augenringe, Tränensäcke Filler", "Mildert eingefallene Augenringe."),
    ("Kinnaufbau mit Filler", "Kinnaugmentation", "Kinn vergrößern, Profil", "Betont und verlängert das Kinn."),
    ("Jawline / Kieferkontur", "Kieferwinkel-Konturierung", "Jawline Filler, markante Kieferlinie", "Definiert die Kieferlinie."),
    ("Nasenkorrektur ohne OP", "Nicht-chirurgische Rhinoplastik", "Liquid Nose Job, 15-Minuten-Nase, Höcker ausgleichen", "Gleicht Höcker und Asymmetrien mit Filler aus."),
    ("Schläfen auffüllen", "Temporale Volumisierung", "eingefallene Schläfen", "Gleicht eingefallene Schläfen aus."),
    ("Handverjüngung", "Hand-Rejuvenation mit Filler", "Hände jünger, Venen kaschieren", "Mehr Volumen auf dem Handrücken."),
    ("Full-Face-Behandlung", "Ganzheitliche Gesichtsbehandlung (Liquid Facelift)", "Liquid Lift, 8-Punkt-Lift", "Kombinierte Volumen- und Konturbehandlung des Gesichts."),
]:
    E(k, name, fach, syn, desc, ARZT, "SZ", "GOÄ analog (§6 Abs. 2)", "M", "1", ust=True, hwg="ja",
      hinweis="BGH 2025: Vorher-Nachher-Werbung für Unterspritzungen verboten.")
E(k, "Filler auflösen", "Hyaluronidase-Behandlung", "Filler entfernen, Lippen auflösen", "Löst unerwünschtes oder verrutschtes Hyaluron auf.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True)

k = "Hautqualität & Kollagen"
E(k, "Skinbooster", "Hyaluron-Skinbooster (z. B. Profhilo)", "Profhilo, Hydro-Boost, Feuchtigkeit Haut", "Feine Hyaluron-Injektionen für Feuchtigkeit und Elastizität.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True, hwg="ja")
E(k, "Kollagen-Stimulator", "Biostimulatoren (PLLA, CaHA)", "Sculptra, Radiesse, Kollagenaufbau", "Regt die körpereigene Kollagenbildung an.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True, hwg="ja")
E(k, "Polynukleotide", "PN-/PDRN-Behandlung", "Lachs-DNA, Rejuran", "Regenerierende Injektionen für Haut und Augenpartie.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True, hwg="ja")
E(k, "Vampir-Lifting", "PRP-Behandlung (Eigenblut)", "Eigenbluttherapie, Vampire Facial, PRP", "Eigenblutplasma regt Hauterneuerung an.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True, hwg="ja")
E(k, "Mesotherapie", "Mesotherapie", "Vitamin-Cocktail Haut, Meso", "Mikroinjektionen mit Wirkstoffen in die Haut.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True, hwg="prüfen")
E(k, "Fett-weg-Spritze", "Injektionslipolyse (Deoxycholsäure)", "Doppelkinn weg, Fettwegspritze, Lipolyse", "Löst kleine Fettpolster, z. B. am Doppelkinn.", ARZT, "SZ", "GOÄ analog", "M", "2", ust=True, hwg="ja")
E(k, "Fadenlifting", "Fadenlifting (PDO/PLLA-Fäden)", "Threadlift, Fäden Gesicht", "Hebt erschlaffte Haut mit resorbierbaren Fäden.", ARZT, "SZ", "GOÄ analog", "M", "2", ust=True, hwg="ja")

k = "Haut & Laser"
E(k, "Microneedling", "Kollagen-Induktionstherapie", "Dermapen, Needling", "Feine Nadeln regen Hauterneuerung an.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "M", "1", ust=True)
E(k, "Radiofrequenz-Microneedling", "RF-Microneedling", "Morpheus8, Potenza", "Microneedling mit Wärme für Straffung und Narben.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "M", "2", ust=True, hwg="prüfen")
E(k, "Chemisches Peeling", "Chemical Peel (oberflächlich/mittel/tief)", "Fruchtsäurepeeling, TCA-Peeling, Peeling", "Säurepeeling gegen Pigmente, Falten, Akne.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "M", "2", ust=True)
E(k, "Laser-Skin-Resurfacing", "Fraktionierter CO2-/Erbium-Laser", "CO2-Laser, Hautverjüngung Laser, Fraxel", "Lasert Falten, Narben und Hautunebenheiten weg.", DERM, "SZ", "GOÄ analog", "M", "3", ust=True, hwg="prüfen")
E(k, "IPL / Photoverjüngung", "Intense Pulsed Light", "Pigmentflecken, Rötungen, IPL", "Lichtbehandlung gegen Pigmente und Rötungen.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "N", "0", ust=True)
E(k, "Laser-Haarentfernung", "Dauerhafte Haarentfernung (Dioden-/Alexandrit-Laser)", "Haare weglasern, Laser Epilation", "Dauerhafte Reduktion unerwünschter Haare.", "Arzt (seit NiSV-Fachkunde auch Fachpersonal)", "SZ", "GOÄ analog", "N", "0", ust=True)
E(k, "Tattooentfernung", "Pikosekunden-/Q-Switch-Laser", "Tattoo weglasern, Permanent-Make-up entfernen", "Zerkleinert Farbpigmente in der Haut.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True, hinweis="NiSV: Tattooentfernung per Laser nur durch Ärzte.")
E(k, "Couperose & Besenreiser", "Gefäßlaser / Sklerotherapie", "rote Äderchen, Besenreiser, Rosazea", "Verödet sichtbare Äderchen.", "Dermatologe / Phlebologe", "SZ", "GOÄ analog", "M", "1", ust=True)
E(k, "Pigmentflecken entfernen", "Pigmentlaser / Melasma-Therapie", "Altersflecken, Sonnenflecken, Melasma", "Hellt Pigmentstörungen auf.", DERM, "SZ", "GOÄ analog", "M", "1", ust=True)
E(k, "Aknenarben behandeln", "Narbentherapie (Laser, Subzision, Needling)", "Aknenarben, Narben glätten", "Glättet eingesunkene Narben.", DERM, "SZ", "GOÄ analog", "M", "2", ust=True)
E(k, "Akne-Behandlung", "Medizinische Aknetherapie", "Pickel, unreine Haut", "Medizinische Behandlung aktiver Akne.", DERM, "IND", "GOÄ / EBM", "N", "0")

k = "Straffung ohne OP"
E(k, "Ultraschall-Lifting", "HIFU (z. B. Ultherapy)", "HIFU, Ultherapy, Facelift ohne OP", "Fokussierter Ultraschall strafft tiefe Hautschichten.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "N", "0", ust=True, hwg="prüfen")
E(k, "Radiofrequenz-Straffung", "Monopolare Radiofrequenz (z. B. Thermage)", "Thermage, RF-Straffung", "Wärme strafft Haut an Gesicht und Körper.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "N", "0", ust=True)
E(k, "Fett wegfrieren", "Kryolipolyse", "CoolSculpting, Fettabbau Kälte", "Baut Fettpolster durch Kälte ab.", "Arzt / Fachpersonal", "SZ", "GOÄ analog", "N", "0", ust=True, hwg="prüfen")
E(k, "Muskelaufbau & Fettreduktion per Gerät", "HIFEM / EMS-Body-Contouring", "Emsculpt, Body Contouring", "Elektromagnetische Muskelstimulation.", "Fachpersonal", "SZ", "–", "N", "0", ust=True)
E(k, "Cellulite-Behandlung", "Cellulite-Therapie (Stoßwelle, Subzision)", "Orangenhaut, Cellulite", "Glättet Dellen an Po und Oberschenkeln.", "Arzt / Fachpersonal", "SZ", "GOÄ analog", "M", "1", ust=True)

k = "Haare"
E(k, "Haarausfall-Behandlung", "PRP / Mesotherapie Kopfhaut", "Haarausfall, Haare dünner, PRP Haare", "Stimuliert Haarwurzeln durch Eigenblut oder Wirkstoffe.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "M", "0", ust=True)
E(k, "Haartransplantation", "FUE / DHI-Haartransplantation", "Haartransplantation, Geheimratsecken, Bart", "Verpflanzung eigener Haarfollikel.", "Arzt (Haarchirurg)", "SZ", "GOÄ analog", "O", "2", ust=True, hwg="ja")

k = "Wellness-Medizin"
E(k, "Infusionstherapie", "Vitamin-/Mikronährstoff-Infusion", "IV-Drip, Vitamininfusion, NAD+", "Infusion mit Vitaminen und Mineralstoffen.", ARZT, "SZ", "GOÄ", "M", "0", ust=True, hinweis="Heilversprechen vermeiden (HWG).")

# =====================================================================
B("Plastische & Ästhetische Chirurgie")
k = "Gesicht"
for name, fach, syn, desc, aus, beh in [
    ("Oberlidstraffung", "Blepharoplastik Oberlid", "Schlupflider, Lidstraffung", "Entfernt überschüssige Haut am Oberlid.", "3", PC),
    ("Unterlidstraffung", "Blepharoplastik Unterlid", "Tränensäcke entfernen", "Korrigiert Tränensäcke und Unterlid-Haut.", "3", PC),
    ("Facelift", "Rhytidektomie / SMAS-Lift / Deep-Plane-Lift", "Gesichtsstraffung, Deep Plane Facelift", "Strafft Gesicht und Hals operativ.", "4", PC),
    ("Halsstraffung", "Halslift", "Truthahnhals, Halshaut", "Strafft erschlaffte Halshaut.", "3", PC),
    ("Stirn- & Brauenlift", "Stirnlift (endoskopisch)", "Brauenlift OP", "Hebt Stirn und Augenbrauen operativ.", "3", PC),
    ("Nasenkorrektur (OP)", "Rhinoplastik / Septorhinoplastik", "Nasen-OP, Höckernase, Schiefnase", "Formt die Nase operativ, ggf. mit Atmungsverbesserung.", "4", HNO),
    ("Ohrenkorrektur", "Otoplastik", "Segelohren, Ohren anlegen", "Legt abstehende Ohren an.", "3", HNO),
    ("Kinnimplantat", "Kinnaugmentation mit Implantat", "Kinnimplantat", "Vergrößert das Kinn dauerhaft.", "3", PC),
    ("Wangenfett-Entfernung", "Bichektomie", "Buccal Fat Removal, Hamsterbacken", "Entfernt Wangenfett für schmalere Wangen.", "2", f"{PC} / {MKG}"),
    ("Lippenlift", "Bullhorn-Lippenlift", "Oberlippe verkürzen, Lip Lift", "Verkürzt die Haut zwischen Nase und Oberlippe.", "2", PC),
    ("Eigenfett ins Gesicht", "Lipofilling Gesicht", "Eigenfettunterspritzung", "Volumenaufbau mit körpereigenem Fett.", "2", PC),
]:
    E(k, name, fach, syn, desc, beh, "SZ", "GOÄ (analog), ggf. Kasse bei Indikation", "O", aus, ust=True, hwg="ja")

k = "Brust"
for name, fach, syn, desc, aus in [
    ("Brustvergrößerung mit Implantat", "Mammaaugmentation", "Brust-OP, Silikon, Brustimplantate", "Vergrößert die Brust mit Implantaten.", "4"),
    ("Brustvergrößerung mit Eigenfett", "Lipofilling Brust", "Eigenfett Brust", "Natürliche Vergrößerung mit eigenem Fett.", "3"),
    ("Bruststraffung", "Mastopexie", "Hängebrust, Brustlift", "Hebt und strafft die Brust.", "4"),
    ("Brustimplantat-Wechsel", "Implantatwechsel / Kapselfibrose-OP", "Kapselfibrose, Implantat tauschen", "Austausch oder Entfernung alter Implantate.", "3"),
    ("Brustwarzenkorrektur", "Mamillenkorrektur", "Schlupfwarzen, Brustwarze verkleinern", "Korrigiert Form oder Größe der Brustwarzen.", "2"),
]:
    E(k, name, fach, syn, desc, PC, "SZ", "GOÄ (analog)", "O", aus, ust=True, hwg="ja")
E(k, "Brustverkleinerung", "Mammareduktion", "zu große Brust, Rückenschmerzen Brust", "Verkleinert die Brust, oft bei Beschwerden.", PC, "IND", "GOÄ / EBM bei Indikation", "O", "4", hwg="ja")
E(k, "Männerbrust entfernen", "Gynäkomastie-Korrektur", "Männerbrust, Gynäkomastie", "Entfernt Drüsen- und Fettgewebe an der männlichen Brust.", PC, "IND", "GOÄ", "O", "3", ust=True, hwg="ja")
E(k, "Brustrekonstruktion", "Brustwiederaufbau", "Brustaufbau nach Krebs", "Wiederaufbau nach Brustkrebs-OP.", PC, "GKV", "EBM / GOÄ", "O", "4")

k = "Körper"
for name, fach, syn, desc, aus, kt in [
    ("Fettabsaugung", "Liposuktion (Tumeszenz, Vaser)", "Fett absaugen, Lipo, Vaser", "Entfernt hartnäckige Fettpolster dauerhaft.", "3", "SZ"),
    ("Bauchdeckenstraffung", "Abdominoplastik", "Bauchstraffung, Fettschürze, Mommy Makeover", "Entfernt überschüssige Bauchhaut und strafft Muskeln.", "4", "IND"),
    ("Oberarmstraffung", "Brachioplastik", "Winkearme, Oberarmhaut", "Entfernt erschlaffte Haut an den Oberarmen.", "3", "IND"),
    ("Oberschenkelstraffung", "Thighplastik", "Oberschenkel innen straffen", "Strafft erschlaffte Oberschenkelhaut.", "3", "IND"),
    ("Bodylift", "Body Lift (nach Gewichtsverlust)", "Hautstraffung nach Abnehmen", "Umfassende Straffung nach starkem Gewichtsverlust.", "4", "IND"),
    ("Po-Vergrößerung mit Eigenfett", "Brazilian Butt Lift (BBL)", "BBL, Po-Aufbau", "Formt den Po mit eigenem Fett.", "4", "SZ"),
    ("Lipödem-Behandlung", "Liposuktion bei Lipödem", "Lipödem, Reithosen schmerzhaft", "Medizinische Fettabsaugung bei Lipödem.", "3", "IND"),
]:
    E(k, name, fach, syn, desc, PC, kt, "GOÄ (analog) / EBM bei Indikation", "O", aus, ust=(kt == "SZ"), hwg="ja")

k = "Intimbereich"
E(k, "Schamlippenkorrektur", "Labioplastik", "Labienverkleinerung, Intimchirurgie", "Verkleinert oder formt die inneren Schamlippen.", GYN, "SZ", "GOÄ (analog)", "O", "3", ust=True, hwg="ja")
E(k, "Intimbereich-Verjüngung", "Vaginale Laser-/RF-Behandlung", "Vaginal-Laser, Intimverjüngung", "Laser- oder RF-Behandlung des Intimbereichs.", GYN, "SZ", "GOÄ analog", "M", "1", ust=True, hwg="prüfen")

k = "Haut-Chirurgie"
E(k, "Muttermal entfernen", "Exzision von Nävi", "Leberfleck entfernen, Muttermal", "Operative Entfernung von Muttermalen.", "Dermatologe / Chirurg", "IND", "GOÄ / EBM", "O", "1")
E(k, "Narbenkorrektur", "Operative Narbenrevision", "Narbe entfernen, Keloid", "Verbessert auffällige Narben.", "Dermatologe / Plastischer Chirurg", "IND", "GOÄ", "O", "2", hwg="ja")
E(k, "Lipom entfernen", "Lipomexzision", "Fettgeschwulst, Knubbel unter der Haut", "Entfernt gutartige Fettknoten.", "Dermatologe / Chirurg", "IND", "GOÄ / EBM", "O", "1")
E(k, "Lidgelbflecken entfernen", "Xanthelasmen-Entfernung", "Xanthelasmen, gelbe Flecken Augenlid", "Entfernt gelbliche Ablagerungen am Lid.", "Dermatologe / Augenarzt", "SZ", "GOÄ", "M", "1", ust=True)
E(k, "Hautanhängsel entfernen", "Fibrom-/Stielwarzen-Entfernung", "Stielwarzen, Fibrome, Alterswarzen", "Entfernt kleine Hautwucherungen.", DERM, "SZ", "GOÄ", "M", "0", ust=True)

# =====================================================================
B("Weitere Selbstzahler-Eingriffe")
k = "Augen"
E(k, "Augenlasern (LASIK/Femto-LASIK)", "Femto-LASIK", "Augen lasern, Brille weg", "Korrektur von Fehlsichtigkeit mit Laser.", AUG, "SZ", "GOÄ", "M", "1")
E(k, "Augenlasern (SMILE)", "SMILE / Lentikelextraktion", "SMILE, schnittarmes Lasern", "Minimalinvasive Laserkorrektur ohne Flap.", AUG, "SZ", "GOÄ", "M", "1")
E(k, "Augenlasern (PRK/LASEK)", "Oberflächenbehandlung", "PRK, Trans-PRK", "Laser auf der Hornhautoberfläche, für dünne Hornhaut.", AUG, "SZ", "GOÄ", "M", "2")
E(k, "Linsentausch", "Refraktiver Linsenaustausch / ICL", "Kunstlinse, ICL, Linsenimplantat", "Ersatz oder Ergänzung der Linse bei starker Fehlsichtigkeit.", AUG, "SZ", "GOÄ", "O", "2")

k = "Kosmetik (nicht ärztlich)"
E(k, "Hydrafacial", "Hydradermabrasion", "Hydrafacial, Aquafacial", "Reinigung, Peeling und Feuchtigkeit in einem.", KOS, "SZ", "–", "N", "0", ust=True)
E(k, "Mikrodermabrasion", "Mikrodermabrasion", "Diamant-Peeling", "Mechanisches Hautpeeling.", KOS, "SZ", "–", "N", "0", ust=True)
E(k, "Permanent Make-up", "Mikropigmentierung", "Microblading, PMU, Lippenpigmentierung", "Dauerhafte Pigmentierung von Brauen, Lippen, Lidstrich.", KOS, "SZ", "–", "M", "1", ust=True)
E(k, "LED-Lichttherapie", "Photobiomodulation", "LED-Maske, Lichttherapie Haut", "Rot-/Blaulicht gegen Akne und zur Regeneration.", KOS, "SZ", "–", "N", "0", ust=True)
E(k, "Dermaplaning", "Dermaplaning", "Gesichtshaare entfernen, Peach Fuzz", "Entfernt Hautschüppchen und Flaumhaare per Klinge.", KOS, "SZ", "–", "N", "0", ust=True)


import os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "medizin_katalog.py"), encoding="utf-8").read())


def main(out):
    ids = [i["id"] for i in items]
    dup = {x for x in ids if ids.count(x) > 1}
    assert not dup, f"Doppelte IDs: {dup}"
    meta = OrderedDict(
        projekt="Sorrida",
        version="2.0",
        erstellt="2026-11-06",
        anzahl=len(items),
        legende=OrderedDict(kostentraeger=KT, invasivitaet=INV, ausfallzeit=AUS,
                            hwg_vorher_nachher={"ja": "Vorher-Nachher-Bilder in Werbung verboten (§11 Abs.1 S.3 Nr.1 HWG)",
                                                "prüfen": "rechtlich nicht eindeutig – vor Werbung prüfen",
                                                "nein": "kein spezifisches Verbot"}),
        hinweis="Gebührenziffern sind Orientierung, keine Abrechnungsempfehlung. Rechtliche Hinweise ohne Gewähr.",
    )
    with open(f"{out}/sorrida-leistungskatalog.json", "w", encoding="utf-8") as f:
        json.dump(OrderedDict(meta=meta, leistungen=items), f, ensure_ascii=False, indent=2)
    with open(f"{out}/sorrida-leistungskatalog.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        keys = list(items[0].keys())
        w.writerow(keys)
        for i in items:
            w.writerow(["|".join(i[k]) if isinstance(i[k], list) else i[k] for k in keys])
    # Übersicht für Markdown
    lines = []
    cur_b = cur_k = None
    for i in items:
        if i["bereich"] != cur_b:
            cur_b = i["bereich"]; cur_k = None
            n = sum(1 for x in items if x["bereich"] == cur_b)
            lines.append(f"\n### {cur_b} ({n})")
        if i["kategorie"] != cur_k:
            cur_k = i["kategorie"]
            lines.append(f"\n**{cur_k}:** ")
            lines[-1] += ", ".join(x["name"] for x in items if x["bereich"] == cur_b and x["kategorie"] == cur_k)
    with open(f"{out}/uebersicht.md", "w", encoding="utf-8") as f:
        f.write("\n".join(lines).strip() + "\n")
    from collections import Counter
    print(len(items), "Leistungen")
    print(Counter(i["bereich"] for i in items))
    print(Counter(i["kostentraeger_code"] for i in items))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
