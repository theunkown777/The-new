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


def E(kat, name, fach, syn, desc, beh, kt, gebo, inv, aus, hwg="nein", ust=False, hinweis="", id_name=None):
    # id_name: früherer Name, wenn eine Leistung umbenannt wurde. So bleibt die Adresse /leistungen/<id> gleich.
    items.append(OrderedDict(
        id=slug(f"{_bereich}-{id_name or name}"),
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
E(k, "Professionelle Zahnreinigung", "PZR", "Zahnreinigung, Prophylaxe, Airflow, Dentalhygiene", "Entfernung harter und weicher Beläge, Politur, Fluoridierung.", "Zahnarzt / Dentalhygienikerin (ZMP, DH)", "PKV", "GOZ Abschnitt B (1040)", "N", "0", hinweis="Ob die Krankenkasse einen Zuschuss gibt, vorher bei der Kasse fragen.")
E(k, "Zahnsteinentfernung", "Entfernung harter Beläge", "Zahnstein entfernen", "Einmal jährlich Entfernung von Zahnstein.", ZA, "GKV", "BEMA 107 / GOZ 4050, 4055", "N", "0")
E(k, "Röntgen – Einzelbild", "Zahnfilm / Bissflügelaufnahme", "Röntgenbild, Bitewing", "Kleines Röntgenbild zur Karies- oder Wurzeldiagnostik.", ZA, "GKV", "BEMA Ä925 / GOÄ 5000", "N", "0")
E(k, "Röntgen – Panoramaaufnahme", "Orthopantomogramm (OPG)", "OPG, Panoramabild", "Übersichtsröntgen aller Zähne und Kiefer.", ZA, "GKV", "BEMA Ä935d / GOÄ 5004", "N", "0")
E(k, "3D-Röntgen", "Digitale Volumentomographie (DVT)", "DVT, 3D-Scan, CT Kiefer", "Dreidimensionale Darstellung für Implantat-, Weisheitszahn- und Wurzelplanung.", ZA, "PKV", "GOÄ 5370 ff. (analog)", "N", "0", hinweis="GKV übernimmt nur in Ausnahmefällen.")
E(k, "Digitaler Abdruck", "Intraoralscan", "3D-Scan Zähne, iTero, Scan statt Abdruck", "Optischer Abdruck ohne Abdruckmasse.", ZA, "PKV", "GOZ 0065 / analog", "N", "0")
E(k, "Kariesrisiko-Test", "Speicheltest / Kariesrisikobestimmung", "Bakterientest, Speicheltest", "Bestimmung von Kariesbakterien und Speichelqualität.", ZA, "SZ", "GOZ analog", "N", "0")
E(k, "Früherkennung Karies", "Kariesdiagnostik (Laser/Transillumination)", "DIAGNOdent, Kariesscan", "Untersuchung mit Laser oder Licht mit dem Ziel, Karies ohne Röntgen früh zu erkennen.", ZA, "PKV", "GOZ analog", "N", "0")
E(k, "Mundkrebs-Vorsorge", "Mundschleimhaut-Screening / Bürstenbiopsie", "Krebsvorsorge Mund, Schleimhautcheck", "Untersuchung und ggf. Abstrich auffälliger Schleimhautstellen.", ZA, "PKV", "GOZ/GOÄ", "N", "0")
E(k, "Fluoridierung", "Lokale Fluoridierung", "Fluoridlack, Zahnschutz", "Auftragen von Fluoridlack mit dem Ziel, den Zahnschmelz zu härten.", ZA, "IND", "BEMA IP4, FLA / GOZ 1020", "N", "0")
E(k, "Beratung & Zweitmeinung", "Eingehende Beratung", "Zweitmeinung, Heil- und Kostenplan prüfen", "Beratung zu Behandlungsoptionen und Kostenplänen.", ZA, "GKV", "BEMA Ä1 / GOÄ 1, 3", "N", "0")
E(k, "Mundhygiene-Schulung", "Mundhygieneinstruktion", "Putztraining, Zahnputzschule", "Anleitung zur richtigen Zahnpflege und Hilfsmittel.", "Zahnarzt / Prophylaxe-Team", "PKV", "GOZ 1000, 1010", "N", "0")
E(k, "Mundgeruch-Sprechstunde", "Halitosis-Diagnostik und -Therapie", "Mundgeruch, schlechter Atem", "Ursachenanalyse und Behandlung von Mundgeruch.", ZA, "SZ", "GOZ analog", "N", "0")

k = "Kinderzahnheilkunde"
E(k, "Früherkennung Kleinkind", "Früherkennungsuntersuchung (FU)", "Kinderzahnarzt, FU1, FU2", "Zahnärztliche Vorsorge ab dem 6. Lebensmonat.", ZA, "GKV", "BEMA FU1–FU2, FUPr, FLA", "N", "0")
E(k, "Individualprophylaxe Kinder", "IP1–IP5", "Kinderprophylaxe, Versiegelung Kinder", "Vorsorgeprogramm für 6- bis 17-Jährige inkl. Versiegelung.", ZA, "GKV", "BEMA IP1–IP5", "N", "0")
E(k, "Fissurenversiegelung", "Fissurenversiegelung", "Versiegelung Backenzähne", "Versiegelung der Kauflächen mit Kunststoff mit dem Ziel, Karies vorzubeugen.", ZA, "IND", "BEMA IP5 / GOZ 2000", "N", "0", hinweis="Kasse: bleibende Backenzähne bis 17 J.")
E(k, "Milchzahnbehandlung", "Füllung/Pulpotomie im Milchgebiss", "Milchzahn Füllung, Kinderfüllung", "Behandlung kariöser Milchzähne mit dem Ziel, sie zu erhalten.", ZA, "GKV", "BEMA Teil 1", "M", "0")
E(k, "Kinderkrone", "Konfektionierte Kinderkrone", "Stahlkrone Kind, Zirkonkrone Kind", "Vorgefertigte Krone für stark zerstörte Milchzähne.", ZA, "GKV", "BEMA 14 / GOZ 2250", "M", "0", hinweis="Zahnfarbene Zirkon-Kinderkronen sind Privatleistung.")
E(k, "Lückenhalter", "Lückenhalter", "Platzhalter Milchzahn", "Platzhalter nach frühem Verlust eines Milchzahns, mit dem Ziel, die Lücke freizuhalten.", "Zahnarzt / Kieferorthopäde", "GKV", "BEMA KFO / GOZ Abschnitt G", "N", "0")
E(k, "Behandlung Kreidezähne", "MIH-Therapie", "Kreidezähne, MIH, Schmelzbildungsstörung", "Versorgung von Zähnen mit Schmelzbildungsstörung mit dem Ziel, sie zu schützen.", ZA, "IND", "BEMA / GOZ", "M", "0")
E(k, "Kinderbehandlung unter Lachgas oder Narkose", "Sedierung im Kindesalter", "Lachgas Kind, Narkose Kind", "Zahnbehandlung von Kindern unter Lachgas oder in Narkose.", "Zahnarzt + Anästhesist", "IND", "GOÄ / BEMA bei Indikation", "M", "0")

k = "Füllungen & Zahnerhaltung"
E(k, "Kunststofffüllung (Kassenstandard)", "Füllung aus selbstadhäsivem Material", "Füllung, Plombe, Kassenfüllung", "Zahnfarbene Standardfüllung ohne Zuzahlung.", ZA, "GKV", "BEMA 13a–d", "M", "0", hinweis="Seit EU-Amalgamverbot (2025) Kassenstandard.")
E(k, "Komposit-Füllung (Mehrschicht)", "Adhäsive Kompositrestauration", "Kunststofffüllung, weiße Füllung, ästhetische Füllung", "Zahnfarbene Kunststofffüllung, in mehreren Schichten aufgebaut.", ZA, "GKV_EA", "GOZ 2060–2120 (Mehrkosten)", "M", "0")
E(k, "Glasionomer-Füllung", "Glasionomerzement-Füllung", "provisorische Füllung, Zementfüllung", "Einfache Füllung aus Glasionomerzement, z. B. für Milchzähne oder Zahnhälse.", ZA, "GKV", "BEMA 13", "M", "0")
E(k, "Keramik-Inlay", "Vollkeramisches Inlay", "Keramikfüllung, Inlay", "Im Labor oder chairside gefertigte Keramikfüllung.", ZA, "GKV_EA", "GOZ 2150–2170", "M", "0")
E(k, "Gold-Inlay", "Goldgussfüllung", "Goldfüllung, Inlay Gold", "Füllung aus Goldlegierung, im Labor gefertigt.", ZA, "GKV_EA", "GOZ 2150–2170", "M", "0")
E(k, "Onlay / Teilkrone", "Onlay / Overlay / Teilkrone", "Teilkrone, Keramik-Onlay", "Ersetzt größere Zahnbereiche inkl. Höcker.", ZA, "GKV_EA", "GOZ 2150–2170, 2200", "M", "0")
E(k, "Zahnersatz in einer Sitzung (CEREC)", "CAD/CAM-Chairside-Restauration", "CEREC, Same-Day-Krone", "Inlay oder Krone in einer Sitzung gefräst.", ZA, "PKV", "GOZ + Material", "M", "0")
E(k, "Zahnhalsfüllung", "Zahnhalsrestauration", "freiliegende Zahnhälse, Keildefekt", "Versorgung empfindlicher oder abgenutzter Zahnhälse.", ZA, "GKV", "BEMA 13 / GOZ 2060 ff.", "M", "0")
E(k, "Behandlung empfindlicher Zähne", "Desensibilisierung", "Schmerzempfindliche Zähne, Kälteempfindlichkeit", "Versiegelung offener Dentinkanälchen.", ZA, "GKV", "BEMA 10 (üZ) / GOZ 2010", "N", "0")
E(k, "Kariesinfiltration", "Kariesinfiltration (Icon)", "Icon, White Spots, Initialkaries ohne Bohren", "Einbringen von Kunststoff in beginnende Karies ohne Bohren, mit dem Ziel, sie aufzuhalten.", ZA, "SZ", "GOZ analog", "N", "0")
E(k, "Aufbaufüllung", "Plastischer Aufbau / Stiftaufbau", "Stumpfaufbau, Glasfaserstift", "Aufbau eines stark zerstörten Zahns vor einer Krone.", ZA, "GKV_EA", "BEMA 13, 18 / GOZ 2180, 2195", "M", "0")

k = "Wurzelbehandlung (Endodontie)"
E(k, "Wurzelkanalbehandlung", "Endodontische Behandlung", "Wurzelbehandlung, WKB, Nerv ziehen", "Reinigung, Desinfektion und Füllung der Wurzelkanäle.", ZA, "IND", "BEMA 28–35 / GOZ 2360–2440", "M", "1", hinweis="Kasse bei erhaltungswürdigen Zähnen; Spezialtechniken privat.")
E(k, "Wurzelbehandlung mit Mikroskop", "Mikroskopgestützte Endodontie", "Endodontie Spezialist, Dentalmikroskop", "Wurzelbehandlung unter dem Mikroskop.", "Zahnarzt (Endodontologe)", "PKV", "GOZ 0110 + 2360–2440", "M", "1")
E(k, "Revision einer Wurzelbehandlung", "Endodontische Revision", "Wurzelbehandlung wiederholen", "Erneute Behandlung bei Entzündung trotz alter Wurzelfüllung.", "Zahnarzt (Endodontologe)", "IND", "BEMA / GOZ 2410 ff.", "M", "1")
E(k, "Wurzelspitzenresektion", "Wurzelspitzenresektion (WSR)", "WSR, Wurzelspitze kappen", "Chirurgische Entfernung der entzündeten Wurzelspitze.", OC, "GKV", "BEMA 54 / GOZ 3110–3120", "O", "2")
E(k, "Vitalerhaltung des Zahnnervs", "Direkte/indirekte Überkappung, Pulpotomie", "Nerv erhalten, Überkappung", "Behandlung bei tiefer Karies mit dem Ziel, den Zahnnerv zu erhalten.", ZA, "GKV", "BEMA 25, 26 / GOZ 2330, 2340", "M", "0")
E(k, "Zahnaufhellung von innen", "Internes Bleaching", "wurzelbehandelter Zahn dunkel, Walking Bleach", "Einbringen eines Bleichmittels in einen verfärbten, wurzelbehandelten Zahn mit dem Ziel, ihn aufzuhellen.", ZA, "SZ", "GOZ analog / Verlangensleistung", "M", "0", ust=True)

k = "Zahnfleisch & Parodontologie"
E(k, "Parodontitis-Behandlung", "Systematische PAR-Therapie (AIT)", "Parodontose, Zahnfleischentzündung, Tiefenreinigung", "Reinigung tiefer Zahnfleischtaschen nach PAR-Richtlinie.", ZA, "GKV", "BEMA Teil 4 (ATG, MHU, AIT, BEV) / GOZ Abschnitt E", "M", "1")
E(k, "Parodontitis-Nachsorge", "Unterstützende Parodontitistherapie (UPT)", "UPT, PA-Nachsorge", "Regelmäßige Nachsorge nach PAR-Behandlung über 2 Jahre.", ZA, "GKV", "BEMA UPTa–g", "N", "0")
E(k, "Chirurgische Parodontaltherapie", "Offene Kürettage / Lappenoperation", "PA-Chirurgie, Lappen-OP", "Operative Reinigung sehr tiefer Taschen.", "Zahnarzt (Parodontologe)", "GKV", "BEMA CPT / GOZ 4090, 4100", "O", "2")
E(k, "Regenerative Parodontaltherapie", "GTR / Schmelzmatrixproteine", "Emdogain, Knochenregeneration Zahnfleisch", "Operation mit dem Ziel, verlorenen Zahnhalteapparat wieder aufzubauen.", "Zahnarzt (Parodontologe)", "PKV", "GOZ 4138 + Material", "O", "2")
E(k, "Laser-Parodontaltherapie", "Laserunterstützte PA-Therapie / aPDT", "Laser Zahnfleisch, photodynamische Therapie", "Behandlung von Zahnfleischtaschen mit Laser oder Licht mit dem Ziel, Keime zu verringern.", ZA, "SZ", "GOZ 0120 / analog", "M", "0")
E(k, "Bakterientest Zahnfleisch", "Mikrobiologische Keimbestimmung", "Markerkeimtest, PA-Test", "Bestimmung von Parodontitis-Bakterien in Zahnfleischtaschen.", ZA, "SZ", "GOÄ Labor", "N", "0")
E(k, "Zahnfleischrückgang decken", "Rezessionsdeckung", "Zahnfleischtransplantat, freiliegende Zahnhälse decken", "Plastische Deckung freiliegender Zahnhälse.", "Zahnarzt (Parodontologe)", "PKV", "GOZ 4130, 4133", "O", "2", hwg="prüfen")
E(k, "Zahnfleischtransplantat", "Freies Schleimhaut- / Bindegewebstransplantat", "Gaumentransplantat, BGT", "Verpflanzung von Gewebe, z. B. vom Gaumen, mit dem Ziel, das Zahnfleisch zu verdicken oder zu verbreitern.", "Zahnarzt (Parodontologe)", "PKV", "GOZ 4130, 4133", "O", "2")
E(k, "Kronenverlängerung", "Chirurgische Kronenverlängerung", "Zahn verlängern, Gummy Smile chirurgisch", "Freilegen von mehr Zahnsubstanz für Versorgung oder Ästhetik.", "Zahnarzt (Parodontologe)", "PKV", "GOZ analog", "O", "2", hwg="prüfen")

k = "Oralchirurgie"
E(k, "Zahnentfernung", "Extraktion", "Zahn ziehen, Zahn extrahieren", "Entfernung nicht erhaltungswürdiger Zähne.", ZA, "GKV", "BEMA 43–45 / GOZ 3000–3030", "O", "1")
E(k, "Weisheitszahn-OP", "Operative Weisheitszahnentfernung", "Weisheitszähne ziehen, Osteotomie", "Entfernung verlagerter oder störender Weisheitszähne.", OC, "GKV", "BEMA 47a, 48 / GOZ 3040–3045", "O", "2")
E(k, "Freilegung verlagerter Zähne", "Operative Freilegung", "Eckzahn freilegen", "Freilegung im Kiefer liegender Zähne für die KFO.", OC, "GKV", "BEMA 63 / GOZ Abschnitt D", "O", "2")
E(k, "Zystenentfernung", "Zystektomie / Zystostomie", "Kieferzyste", "Entfernung von Zysten im Kiefer.", OC, "GKV", "BEMA 56 / GOZ 3190, 3200", "O", "2")
E(k, "Abszessbehandlung", "Inzision / Drainage", "dicke Backe, Eiter, Schwellung", "Eröffnen eines Abszesses und Ableiten des Eiters.", ZA, "GKV", "BEMA Teil 1 / GOZ Abschnitt D", "M", "1")
E(k, "Lippenbändchen-Korrektur", "Frenektomie", "Zungenbändchen, Lippenbändchen durchtrennen", "Korrektur störender Bändchen.", OC, "GKV", "BEMA Teil 1 / GOZ Abschnitt D", "O", "1")
E(k, "Probeentnahme", "Biopsie", "Gewebeprobe Mund", "Entnahme verdächtigen Gewebes zur Untersuchung.", OC, "GKV", "BEMA / GOÄ 2401", "O", "1")
E(k, "Kieferkammerhalt nach Zahnentfernung", "Socket Preservation", "Alveolenschutz, Kieferkamm erhalten", "Füllen der Zahnlücke mit Knochenersatz für spätere Implantate.", OC, "PKV", "GOZ Abschnitt K / analog", "O", "2")
E(k, "Plättchenreiches Fibrin (PRF)", "PRF / Eigenblutkonzentrat", "Eigenblut Wundheilung, A-PRF", "Einbringen von Fibrin aus Eigenblut in die Wunde mit dem Ziel, die Heilung zu unterstützen.", OC, "SZ", "GOZ/GOÄ analog", "M", "0")

k = "Implantologie"
E(k, "Zahnimplantat (Einzelzahn)", "Enossales Implantat", "Implantat, künstliche Zahnwurzel", "Titan- oder Keramikschraube als Ersatz der Zahnwurzel.", OC, "GKV_EA", "GOZ 9000–9040 / BEMA-Festzuschuss für Krone", "O", "2", hinweis="Kasse zahlt nur Festzuschuss auf Suprakonstruktion.")
E(k, "Keramikimplantat", "Zirkonoxid-Implantat", "Metallfreies Implantat, Keramikimplantat", "Weißes, metallfreies Implantat.", OC, "GKV_EA", "GOZ 9000 ff.", "O", "2")
E(k, "Sofortimplantat", "Sofortimplantation", "Implantat am selben Tag", "Implantat direkt nach der Zahnentfernung.", OC, "GKV_EA", "GOZ 9010 ff.", "O", "2")
E(k, "Feste Zähne an einem Tag", "All-on-4 / All-on-6 Sofortversorgung", "All-on-4, Sofortversorgung, feste dritte Zähne", "Vier bis sechs Implantate in einem zahnlosen Kiefer. Sitzen sie beim Einsetzen fest genug im Knochen, wird am selben Tag eine provisorische feste Brücke befestigt; die endgültige Brücke folgt nach der Einheilung.", OC, "GKV_EA", "GOZ Abschnitt K + F", "O", "3")
E(k, "Mini-Implantate", "Durchmesserreduzierte Implantate", "Miniimplantat Prothese", "Implantate mit kleinem Durchmesser, z. B. zum Halt von Prothesen.", OC, "GKV_EA", "GOZ 9000 ff.", "O", "1")
E(k, "Navigierte Implantation", "Schablonengeführte Implantation", "3D-geplante Implantation, Bohrschablone", "Implantation nach Planung im DVT, z. B. mit Bohrschablone.", OC, "PKV", "GOZ 9003, 9005", "O", "2")
E(k, "Knochenaufbau", "Augmentation", "Knochenaufbau Kiefer, Knochentransplantat", "Aufbau von Kieferknochen vor/bei Implantation.", OC, "PKV", "GOZ 9100, 9140", "O", "3")
E(k, "Sinuslift", "Sinusbodenelevation (intern/extern)", "Kieferhöhlenanhebung", "Knochenaufbau im Oberkiefer-Seitenzahnbereich.", OC, "PKV", "GOZ 9110, 9120", "O", "3")
E(k, "Implantatkrone / -brücke", "Implantatgetragene Suprakonstruktion", "Krone auf Implantat", "Sichtbarer Zahnersatz auf dem Implantat.", ZA, "GKV_EA", "GOZ 2200 ff. / BEMA-Festzuschuss", "M", "0")
E(k, "Implantat-Entzündung behandeln", "Periimplantitis-Therapie", "Implantat entzündet, Periimplantitis", "Reinigung und ggf. chirurgische Sanierung um Implantate.", OC, "PKV", "GOZ Abschnitt E / analog", "O", "2")
E(k, "Implantat-Nachsorge", "Implantatprophylaxe", "Implantatreinigung", "Regelmäßige professionelle Reinigung von Implantaten.", "Zahnarzt / Prophylaxe-Team", "PKV", "GOZ 1040 / analog", "N", "0")

k = "Zahnersatz (Prothetik)"
E(k, "Vollkeramikkrone", "Vollkeramische Krone (Zirkon/Lithiumdisilikat)", "Zirkonkrone, Keramikkrone, Emax", "Krone ganz aus Keramik, ohne Metall.", ZA, "GKV_EA", "GOZ 2210 / BEMA-Festzuschuss", "M", "0")
E(k, "Metallkeramikkrone", "Verblendmetallkeramik-Krone (VMK)", "VMK-Krone, verblendete Krone", "Metallgerüst mit Keramikverblendung.", ZA, "GKV_EA", "BEMA 20b / GOZ 2210", "M", "0")
E(k, "Goldkrone", "Vollgusskrone", "Goldkrone, Metallkrone", "Krone aus Goldlegierung oder Metall (Regelversorgung Seitenzahn).", ZA, "GKV_EA", "BEMA 20a / GOZ 2210", "M", "0")
E(k, "Brücke", "Festsitzende Brücke", "Zahnbrücke, Keramikbrücke", "Überbrückt Zahnlücken mit Kronen auf Nachbarzähnen.", ZA, "GKV_EA", "BEMA 91 / GOZ 5000 ff.", "M", "0")
E(k, "Klebebrücke", "Adhäsivbrücke (Marylandbrücke)", "Marylandbrücke, Flügelbrücke", "Brücke, die an den Nachbarzähnen festgeklebt wird, im Frontzahnbereich.", ZA, "GKV_EA", "BEMA 93 / GOZ 5150", "M", "0")
E(k, "Teilprothese", "Modellgussprothese / Klammerprothese", "herausnehmbarer Zahnersatz, Klammerprothese", "Herausnehmbarer Ersatz für mehrere fehlende Zähne.", ZA, "GKV_EA", "BEMA 96 / GOZ 5200 ff.", "N", "0")
E(k, "Teleskop- oder Geschiebeprothese", "Kombinierter Zahnersatz", "Teleskopprothese, Doppelkrone, Geschiebe", "Herausnehmbare Prothese, über Doppelkronen oder Geschiebe an eigenen Zähnen verankert.", ZA, "GKV_EA", "GOZ 5040, 5080 ff.", "M", "0")
E(k, "Vollprothese", "Totalprothese", "Gebiss, dritte Zähne, Vollgebiss", "Kompletter Zahnersatz für zahnlose Kiefer.", ZA, "GKV_EA", "BEMA 97 / GOZ 5220, 5230", "N", "0")
E(k, "Implantatgetragene Prothese", "Implantatprothese (Locator/Steg)", "Druckknopfprothese, Stegprothese", "Prothese, die auf Implantaten einrastet.", ZA, "GKV_EA", "GOZ 5000 ff. + 9000 ff.", "O", "2")
E(k, "Prothese unterfüttern / reparieren", "Unterfütterung / Reparatur", "Prothese drückt, Prothese gebrochen", "Anpassung oder Reparatur bestehender Prothesen.", ZA, "GKV_EA", "BEMA 100 / GOZ 5250 ff.", "N", "0")
E(k, "Provisorium", "Provisorische Versorgung / Langzeitprovisorium", "Übergangskrone, Interimsprothese", "Vorläufiger Zahnersatz während der Behandlung.", ZA, "GKV_EA", "BEMA 19 / GOZ 2260–2270, 7080", "M", "0")

k = "Funktion, Kiefergelenk & Schlaf"
E(k, "Funktionsanalyse", "Klinische/instrumentelle Funktionsanalyse", "CMD-Diagnostik, Kiefergelenkcheck", "Untersuchung von Kiefergelenk, Muskeln und Biss.", ZA, "PKV", "GOZ Abschnitt J (8000–8100)", "N", "0")
E(k, "CMD-Behandlung", "Therapie craniomandibulärer Dysfunktion", "Kieferschmerzen, Kiefergelenk knackt, CMD", "Behandlung von Kiefergelenk- und Muskelbeschwerden.", ZA, "IND", "GOZ J + H / BEMA K1–K4", "N", "0")
E(k, "Knirscherschiene", "Okklusionsschiene / Aufbissschiene", "Beißschiene, Bruxismus-Schiene, Nachtschiene", "Schiene mit dem Ziel, die Zähne vor Abrieb durch Knirschen zu schützen.", ZA, "IND", "BEMA K1 / GOZ 7000", "N", "0")
E(k, "Schnarcherschiene", "Unterkieferprotrusionsschiene (UKPS)", "Anti-Schnarch-Schiene, Schlafapnoe-Schiene", "Schiene, die den Unterkiefer nach vorn verlagert, mit dem Ziel, die Atemwege freizuhalten.", ZA, "IND", "BEMA (bei Schlafapnoe-Diagnose) / GOZ analog", "N", "0", hinweis="Kasse bei ärztlich diagnostizierter Schlafapnoe.")
E(k, "Botox gegen Zähneknirschen", "Botulinumtoxin in den Kaumuskel (Masseter)", "Bruxismus Botulinumtoxin, Masseter-Injektion", "Injektion in die Kaumuskeln mit dem Ziel, sie zu entspannen.", ARZT, "SZ", "GOÄ analog", "M", "0", hwg="prüfen", hinweis="Im Katalog als ärztliche Leistung geführt. Ob auch Zahnärztinnen und Zahnärzte sie erbringen dürfen, richtet sich nach dem Berufsrecht.")

k = "Komfort & Angstpatienten"
E(k, "Örtliche Betäubung", "Lokalanästhesie", "Spritze, Betäubung", "Betäubung des Behandlungsbereichs, z. B. per Spritze.", ZA, "GKV", "BEMA I, L1 / GOZ 0080–0100", "M", "0")
E(k, "Computergesteuerte Betäubung", "Computergestützte Anästhesie (z. B. The Wand)", "computergesteuerte Spritze", "Betäubung, bei der ein Gerät das Betäubungsmittel gesteuert abgibt.", ZA, "SZ", "GOZ analog", "M", "0")
E(k, "Lachgas-Sedierung", "Lachgassedierung", "Lachgas, Distickstoffmonoxid", "Einatmen von Lachgas mit dem Ziel der Entspannung, bei vollem Bewusstsein.", ZA, "SZ", "GOÄ analog", "N", "0")
E(k, "Dämmerschlaf", "Analgosedierung / i.v.-Sedierung", "Sedierung, Dämmerschlaf", "Beruhigungsmittel per Infusion (Sedierung).", "Zahnarzt + Anästhesist", "IND", "GOÄ", "M", "0")
E(k, "Vollnarkose", "Intubationsnarkose / ITN", "Narkose Zahnarzt", "Zahnbehandlung in Allgemeinanästhesie: ohne Bewusstsein, Atmung und Kreislauf werden überwacht.", "Anästhesist", "IND", "GOÄ / BEMA bei Indikation", "M", "1")
E(k, "Zahnarzt-Hypnose", "Dentale Hypnose", "Hypnose Angstpatient", "Hypnotische Techniken mit dem Ziel, während der Behandlung zu entspannen.", ZA, "SZ", "GOÄ analog", "N", "0")

k = "Notfall"
E(k, "Zahnschmerz-Notfall", "Schmerzbehandlung", "Zahnschmerzen, Notdienst", "Akutbehandlung bei Schmerzen.", ZA, "GKV", "BEMA / GOZ", "M", "0")
E(k, "Zahnunfall", "Zahntrauma-Versorgung", "Zahn abgebrochen, Zahn ausgeschlagen, Frontzahntrauma", "Versorgung abgebrochener oder ausgeschlagener Zähne.", ZA, "GKV", "BEMA / GOZ", "M", "0")
E(k, "Krone/Füllung verloren", "Wiederbefestigung / Notversorgung", "Krone rausgefallen, Füllung raus", "Wiedereinsetzen oder provisorischer Ersatz.", ZA, "GKV", "BEMA 24 / GOZ 2310", "N", "0")

k = "Spezielle Zielgruppen"
E(k, "Individueller Sportmundschutz", "Konfektionierter/individueller Mundschutz", "Mundschutz Kampfsport, Zahnschutz Sport", "Maßgefertigter Mundschutz für den Sport, mit dem Ziel, Zahnverletzungen vorzubeugen.", ZA, "SZ", "GOZ analog + Labor", "N", "0")
E(k, "Zahnbehandlung in der Schwangerschaft", "Schwangerschaftsprophylaxe", "Schwangerschaftsgingivitis", "Vorsorge und Behandlung in der Schwangerschaft.", ZA, "GKV", "BEMA", "N", "0")
E(k, "Aufsuchende Zahnmedizin", "Hausbesuch / Pflegeheimbetreuung", "Hausbesuch Zahnarzt, Pflegebedürftige", "Behandlung zu Hause oder im Pflegeheim.", ZA, "GKV", "BEMA 171–174 / PKV", "N", "0")
E(k, "Ganzheitliche Zahnmedizin", "Umweltzahnmedizin / biologische Zahnmedizin", "Amalgamsanierung, metallfrei, Störfeld", "Metallfreie Versorgung, Materialverträglichkeitstest.", ZA, "SZ", "GOZ analog", "M", "0")

# =====================================================================
B("Ästhetische Zahnmedizin")
k = "Zahnaufhellung"
E(k, "Bleaching in der Praxis", "In-Office-Bleaching", "Zahnaufhellung, Bleaching beim Zahnarzt, weiße Zähne", "Auftragen eines Bleichgels in der Praxis mit dem Ziel, die Zähne aufzuhellen.", ZA, "SZ", "Verlangensleistung §2 Abs. 3 GOZ / analog", "N", "0", ust=True, hinweis="Zahnaufheller mit mehr als 0,1 % bis 6 % Wasserstoffperoxid (enthalten oder freigesetzt): nicht bei Personen unter 18 Jahren anwenden (VO (EG) 1223/2009, Anhang III Nr. 12).")
E(k, "Bleaching für zu Hause", "Home-Bleaching mit Schiene", "Bleaching Schiene, Zahnaufhellung zu Hause", "Individuelle Schienen mit Gel für die Anwendung daheim.", ZA, "SZ", "Verlangensleistung / analog", "N", "0", ust=True, hinweis="Zahnaufheller mit mehr als 0,1 % bis 6 % Wasserstoffperoxid (enthalten oder freigesetzt): nicht bei Personen unter 18 Jahren anwenden; Abgabe nur an Zahnärztinnen und Zahnärzte, erste Anwendung je Behandlungszyklus durch sie oder unter ihrer direkten Aufsicht (VO (EG) 1223/2009, Anhang III Nr. 12).")
E(k, "Weiße Flecken entfernen", "Mikroabrasion / Kariesinfiltration", "White Spots, Flecken auf Zähnen", "Behandlung heller Schmelzflecken mit dem Ziel, sie zu entfernen oder abzudecken.", ZA, "SZ", "GOZ analog", "N", "0", ust=True)
E(k, "Zahnschmuck", "Dental Jewelry / Twinkles", "Zahnstein Glitzer, Zahn-Diamant", "Aufkleben von Schmuckstein auf den Zahn.", ZA, "SZ", "Verlangensleistung", "N", "0", ust=True)

k = "Veneers & Zahnform"
E(k, "Keramik-Veneers", "Keramikverblendschalen", "Veneers, Verblendschalen", "Dünne Keramikschalen auf der Vorderseite der Zähne, mit dem Ziel, Form und Farbe zu verändern.", ZA, "SZ", "GOZ 2220 + Labor", "M", "0", ust=True, hwg="prüfen")
E(k, "Non-Prep-Veneers", "Veneers ohne Beschleifen", "Lumineers, No-Prep-Veneers", "Veneers ohne oder mit minimalem Beschleifen.", ZA, "SZ", "GOZ analog + Labor", "N", "0", ust=True)
E(k, "Komposit-Veneers", "Direkte Kompositverblendung", "Bonding-Veneers, Komposit-Schalen", "In einer Sitzung modellierte Kunststoff-Veneers.", ZA, "SZ", "GOZ 2060 ff. / analog", "N", "0", ust=True)
E(k, "Zahnform-Korrektur", "Bonding / Formkorrektur mit Komposit", "Zahn verlängern, abgebrochene Ecke, Bonding", "Ergänzen von Ecken, Kanten und Formen.", ZA, "SZ", "GOZ 2060 ff.", "N", "0", ust=True)
E(k, "Zahnlücken schließen", "Diastema-Schluss", "Lücke Schneidezähne, Diastema", "Schließen von Lücken mit Komposit oder Veneers.", ZA, "SZ", "GOZ analog", "N", "0", ust=True)
E(k, "Zähne glätten / konturieren", "Einschleifen / Enameloplastik", "Zahnkanten glätten", "Feine Formkorrektur durch Polieren.", ZA, "SZ", "GOZ 4030 / analog", "N", "0", ust=True)
E(k, "Schwarze Dreiecke schließen", "Interdentale Rekonstruktion", "Black Triangles, Lücken am Zahnfleisch", "Füllen dunkler Zwischenräume am Zahnfleisch.", ZA, "SZ", "GOZ analog", "N", "0", ust=True)

k = "Lächeln-Planung"
E(k, "Digitales Smile Design", "Digital Smile Design (DSD)", "Lächeln planen, Smile Makeover", "Digitale Simulation des geplanten Ergebnisses.", ZA, "SZ", "GOZ analog", "N", "0", ust=True)
E(k, "Probe-Lächeln (Mock-up)", "Mock-up / Wax-up", "Test-Veneers, Probetragen", "Vorläufige Anprobe der geplanten Zahnform im Mund.", ZA, "SZ", "GOZ analog + Labor", "N", "0", ust=True)
E(k, "Komplettes Smile Makeover", "Ästhetische Gesamtrehabilitation", "Smile Makeover", "Kombination aus Bleaching, Veneers, KFO, Zahnfleisch.", ZA, "SZ", "GOZ diverse", "M", "1", ust=True, hwg="prüfen")

k = "Rote Ästhetik (Zahnfleisch)"
E(k, "Zahnfleischkorrektur bei Gummy Smile", "Gingivektomie / ästhetische Kronenverlängerung", "Gummy Smile, zu viel Zahnfleisch, Zahnfleisch lasern", "Korrektur der Zahnfleischlinie mit dem Ziel, beim Lächeln weniger Zahnfleisch zu zeigen.", "Zahnarzt (Parodontologe)", "SZ", "GOZ 4080 / analog", "O", "1", ust=True, hwg="ja")
E(k, "Zahnfleisch aufhellen", "Depigmentierung der Gingiva", "dunkles Zahnfleisch, Laser Depigmentierung", "Behandlung dunkler Pigmentierungen am Zahnfleisch mit dem Ziel, sie zu entfernen.", ZA, "SZ", "GOZ analog", "M", "1", ust=True)
E(k, "Botox bei Gummy Smile", "Botulinumtoxin Oberlippenheber", "Gummy Smile Botulinumtoxin", "Injektion in den Oberlippenheber mit dem Ziel, beim Lächeln weniger Zahnfleisch zu zeigen.", ARZT, "SZ", "GOÄ analog", "M", "0", ust=True, hwg="ja", hinweis="Ärztliche Leistung; Zahnärzte nur eingeschränkt.")

# =====================================================================
B("Kieferorthopädie")
k = "Zahnspangen"
E(k, "Feste Zahnspange", "Multibracket-Apparatur", "Brackets, feste Spange", "Klassische Brackets für komplexe Zahnfehlstellungen.", KFO, "IND", "BEMA Teil 3 (KIG ≥3, unter 18) / GOZ Abschnitt G", "N", "0", hinweis="Kasse: unter 18 J. ab KIG 3, Erwachsene nur kombiniert-chirurgisch.")
E(k, "Unsichtbare Zahnspange", "Aligner-Therapie", "Invisalign, durchsichtige Schienen, Aligner", "Durchsichtige Schienen, die schrittweise gewechselt werden, mit dem Ziel, die Zahnstellung zu korrigieren.", "Kieferorthopäde / Zahnarzt", "SZ", "GOZ Abschnitt G / analog", "N", "0")
E(k, "Innenliegende Zahnspange", "Linguale Apparatur", "Lingualtechnik, Incognito", "Brackets auf der Innenseite der Zähne.", KFO, "SZ", "GOZ Abschnitt G", "N", "0")
E(k, "Keramik-Brackets", "Zahnfarbene Brackets", "weiße Brackets, Keramikspange", "Zahnfarbene Brackets aus Keramik statt Metall.", KFO, "GKV_EA", "GOZ (Mehrkosten)", "N", "0")
E(k, "Lose Zahnspange", "Herausnehmbare Apparatur", "Platte, lose Spange, Aktivator", "Herausnehmbare Zahnspange, z. B. für Kinder.", KFO, "IND", "BEMA Teil 3 / GOZ G", "N", "0")
E(k, "Kieferorthopädische Frühbehandlung", "Frühbehandlung", "Kreuzbiss Kind, frühe Spange", "Frühe Korrektur ausgeprägter Fehlstellungen.", KFO, "IND", "BEMA Teil 3", "N", "0")
E(k, "Retainer", "Festsitzender / herausnehmbarer Retainer", "Draht hinter den Zähnen, Halteschiene", "Draht oder Schiene nach der Zahnspange mit dem Ziel, das Ergebnis zu halten.", "Kieferorthopäde / Zahnarzt", "IND", "GOZ Abschnitt G", "N", "0")
E(k, "Erwachsenen-Kieferorthopädie", "KFO bei Erwachsenen", "Zahnspange Erwachsene, schiefe Zähne", "Zahnkorrektur im Erwachsenenalter.", KFO, "SZ", "GOZ Abschnitt G", "N", "0")
E(k, "Kieferfehlstellung operativ korrigieren", "Dysgnathie-Chirurgie / kombinierte KFO-Chirurgie", "Kiefer-OP, Unterbiss, Rückbiss, Umstellungsosteotomie", "Kombination aus Spange und Kieferoperation.", f"{KFO} + {MKG}", "IND", "BEMA / GOÄ", "O", "4")

# =====================================================================
B("Mund-, Kiefer- & Gesichtschirurgie")
k = "MKG-Leistungen"
E(k, "Kiefergelenk-Operation", "Arthroskopie / Arthrozentese Kiefergelenk", "Kiefergelenk spülen", "Spülung oder Spiegelung des Kiefergelenks, bei Bedarf auch offene Operation.", MKG, "IND", "GOÄ", "O", "2")
E(k, "Kinnkorrektur (knöchern)", "Genioplastik", "Kinnverlagerung, fliehendes Kinn", "Verschiebung des Kinnknochens.", MKG, "IND", "GOÄ", "O", "3", hwg="ja", ust=True)
E(k, "Lippen-Kiefer-Gaumenspalte", "LKG-Spalten-Chirurgie", "Hasenscharte, Spalte", "Operative Korrektur angeborener Spaltbildungen.", MKG, "GKV", "GOÄ / EBM", "O", "4")
E(k, "Gesichtsverletzungen", "Frakturversorgung Gesicht/Kiefer", "Kieferbruch, Jochbeinbruch", "Versorgung von Brüchen im Gesichtsbereich.", MKG, "GKV", "GOÄ / EBM", "O", "4")
E(k, "Speicheldrüsen-Behandlung", "Speichelstein-Entfernung", "Speichelstein", "Entfernung von Speichelsteinen oder Drüsenveränderungen.", MKG, "GKV", "GOÄ / EBM", "O", "2")

# =====================================================================
B("Ästhetische Medizin (minimal-invasiv)")
k = "Botulinumtoxin (Botox)"
for name, fach, syn, desc in [
    ("Botox Zornesfalte", "Glabella-Behandlung", "Zornesfalte, Falte zwischen Augenbrauen", "Injektion mit dem Ziel, die senkrechten Falten zwischen den Augenbrauen zu glätten."),
    ("Botox Stirnfalten", "Frontalis-Behandlung", "Stirnfalten, Querfalten Stirn", "Injektion mit dem Ziel, waagerechte Stirnfalten zu glätten."),
    ("Botox Krähenfüße", "Lateral-Canthal-Behandlung", "Lachfalten Augen, Krähenfüße", "Injektion mit dem Ziel, Fältchen an den äußeren Augenwinkeln zu glätten."),
    ("Brauenlifting mit Botox", "Chemisches Browlift", "Augenbrauen anheben", "Injektion mit dem Ziel, die Augenbrauen leicht anzuheben."),
    ("Lip Flip", "Botulinumtoxin Oberlippe", "Lippen voller wirken lassen ohne Filler", "Injektion in den Lippenmuskel mit dem Ziel, die Oberlippe leicht nach außen zu drehen."),
    ("Botox Kinn & Mundwinkel", "Mentalis/DAO-Behandlung", "Pflasterstein-Kinn, hängende Mundwinkel", "Injektion in Kinn- und Mundwinkelmuskeln mit dem Ziel, sie zu entspannen."),
    ("Botox Hals", "Platysma-Behandlung / Nefertiti-Lift", "Halsfalten, Nefertiti Lift, Platysmabänder", "Injektion in den Halsmuskel mit dem Ziel, Halsbänder zu glätten und die Kieferlinie zu straffen."),
    ("Gesicht verschmälern (Masseter-Botox)", "Masseter-Reduktion", "Masseter-Injektion, Kaumuskel verkleinern", "Injektion in die Kaumuskeln mit dem Ziel, sie zu verkleinern und das Gesicht schmaler zu machen."),
    ("Bunny Lines", "Nasalis-Behandlung", "Nasenfalten", "Injektion mit dem Ziel, Fältchen am Nasenrücken zu glätten."),
]:
    E(k, name, fach, syn, desc, ARZT, "SZ", "GOÄ analog (§6 Abs. 2)", "M", "0", ust=True, hwg="prüfen")
E(k, "Behandlung von starkem Schwitzen", "Botulinumtoxin bei Hyperhidrose", "Schwitzen Achseln, Hyperhidrose", "Injektionen in die Haut von Achseln, Händen oder Füßen mit dem Ziel, die Schweißbildung zu verringern.", "Arzt / Dermatologe", "IND", "GOÄ", "M", "0", hinweis="Medizinische Indikation – Kostenübernahme teils möglich, ohne USt.")
E(k, "Botox bei Migräne", "Botulinumtoxin bei chronischer Migräne", "Migräne Botulinumtoxin", "Medizinische Behandlung chronischer Migräne.", "Facharzt Neurologie", "IND", "GOÄ / EBM", "M", "0")

k = "Hyaluron-Filler"
for name, fach, syn, desc in [
    ("Lippenunterspritzung", "Lippenaugmentation mit Hyaluronsäure", "Lippen aufspritzen, volle Lippen, Russian Lips", "Filler-Injektion in die Lippen mit dem Ziel, Volumen und Kontur zu geben."),
    ("Nasolabialfalten auffüllen", "Nasolabialfalten-Behandlung", "Falten Nase-Mund", "Filler-Injektion mit dem Ziel, die Falten zwischen Nase und Mund zu mildern."),
    ("Marionettenfalten auffüllen", "Marionettenfalten-Behandlung", "Mundwinkelfalten", "Filler-Injektion mit dem Ziel, die Falten von den Mundwinkeln abwärts zu mildern."),
    ("Wangenaufbau", "Midface-Volumisierung", "Wangenknochen betonen, Cheekbones", "Filler-Injektion mit dem Ziel, Volumen im Mittelgesicht aufzubauen."),
    ("Tränenrinne", "Tear-Trough-Behandlung", "Augenringe, Tränensäcke Filler", "Filler-Injektion unter dem Auge mit dem Ziel, eingefallene Augenringe zu mildern."),
    ("Kinnaufbau mit Filler", "Kinnaugmentation", "Kinn vergrößern, Profil", "Filler-Injektion mit dem Ziel, das Kinn zu betonen oder zu verlängern."),
    ("Jawline / Kieferkontur", "Kieferwinkel-Konturierung", "Jawline Filler, Kieferwinkel Filler", "Filler-Injektion mit dem Ziel, die Kieferlinie zu betonen."),
    ("Nasenkorrektur ohne OP", "Nicht-chirurgische Rhinoplastik", "Liquid Nose Job, 15-Minuten-Nase, Höcker ausgleichen", "Filler-Injektion mit dem Ziel, Höcker und Asymmetrien der Nase auszugleichen."),
    ("Schläfen auffüllen", "Temporale Volumisierung", "eingefallene Schläfen", "Filler-Injektion mit dem Ziel, eingefallene Schläfen aufzufüllen."),
    ("Handverjüngung", "Filler-Injektion am Handrücken", "Handrücken Filler, Hyaluron Hände", "Filler-Injektion in den Handrücken mit dem Ziel, Volumen aufzubauen."),
    ("Full-Face-Behandlung", "Ganzheitliche Gesichtsbehandlung (Liquid Facelift)", "Liquid Lift, 8-Punkt-Lift", "Kombinierte Volumen- und Konturbehandlung des Gesichts."),
]:
    E(k, name, fach, syn, desc, ARZT, "SZ", "GOÄ analog (§6 Abs. 2)", "M", "1", ust=True, hwg="ja",
      hinweis="BGH 2025: Vorher-Nachher-Werbung für Unterspritzungen verboten.")
E(k, "Filler auflösen", "Hyaluronidase-Behandlung", "Filler entfernen, Lippen auflösen", "Injektion des Enzyms Hyaluronidase mit dem Ziel, unerwünschtes oder verrutschtes Hyaluron aufzulösen.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True)

k = "Hautqualität & Kollagen"
E(k, "Skinbooster", "Hyaluron-Skinbooster (z. B. Profhilo)", "Profhilo, Hyaluron Haut, Feuchtigkeit Haut", "Feine Hyaluron-Injektionen in die Haut mit dem Ziel, Feuchtigkeit und Elastizität zu erhöhen.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True, hwg="ja")
E(k, "Kollagen-Stimulator", "Biostimulatoren (PLLA, CaHA)", "Sculptra, Radiesse, Kollagenaufbau", "Injektion von Stoffen wie PLLA oder CaHA, die die körpereigene Kollagenbildung anregen sollen.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True, hwg="ja")
E(k, "Polynukleotide", "PN-/PDRN-Behandlung", "Lachs-DNA, Rejuran", "Injektionen mit Polynukleotiden in die Haut, auch um die Augen.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True, hwg="ja")
E(k, "Vampir-Lifting", "PRP-Behandlung (Eigenblut)", "Eigenbluttherapie, Vampire Facial, PRP", "Injektion von Plasma aus Eigenblut in die Haut mit dem Ziel, die Hauterneuerung anzuregen.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True, hwg="ja")
E(k, "Mesotherapie", "Mesotherapie", "Vitamin-Cocktail Haut, Meso", "Mikroinjektionen mit Wirkstoffen in die Haut.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True, hwg="prüfen")
E(k, "Fett-weg-Spritze", "Injektionslipolyse (Deoxycholsäure)", "Doppelkinn Injektion, Fettwegspritze, Lipolyse", "Injektion eines Wirkstoffs in kleine Fettpolster, z. B. am Doppelkinn, mit dem Ziel, sie abzubauen.", ARZT, "SZ", "GOÄ analog", "M", "2", ust=True, hwg="ja")
E(k, "Fadenlifting", "Fadenlifting (PDO/PLLA-Fäden)", "Threadlift, Fäden Gesicht", "Einziehen resorbierbarer Fäden unter die Haut mit dem Ziel, erschlaffte Haut anzuheben.", ARZT, "SZ", "GOÄ analog", "M", "2", ust=True, hwg="ja")

k = "Haut & Laser"
E(k, "Microneedling", "Kollagen-Induktionstherapie", "Dermapen, Needling", "Feine Nadelstiche in die Haut mit dem Ziel, die Hauterneuerung anzuregen.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "M", "1", ust=True)
E(k, "Radiofrequenz-Microneedling", "RF-Microneedling", "Morpheus8, Potenza", "Microneedling mit zusätzlicher Wärme durch Hochfrequenz.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "M", "2", ust=True, hwg="prüfen", hinweis="§ 6 Abs. 2 NiSV: Hochfrequenzanwendungen, bei denen die Oberhaut als Schutzbarriere verletzt wird, dürfen nur approbierte Ärztinnen und Ärzte mit entsprechender ärztlicher Weiterbildung oder Fortbildung durchführen.")
E(k, "Chemisches Peeling", "Chemical Peel (oberflächlich/mittel/tief)", "Fruchtsäurepeeling, TCA-Peeling, Peeling", "Auftragen einer Säure auf die Haut, z. B. bei Pigmentflecken, Falten oder Akne.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "M", "2", ust=True)
E(k, "Laser-Skin-Resurfacing", "Fraktionierter CO2-/Erbium-Laser", "CO2-Laser, Laser Falten, Fraxel", "Behandlung mit fraktioniertem Laser mit dem Ziel, Falten, Narben und Hautunebenheiten zu mildern.", DERM, "SZ", "GOÄ analog", "M", "3", ust=True, hwg="prüfen")
E(k, "IPL / Photoverjüngung", "Intense Pulsed Light", "Pigmentflecken, Rötungen, IPL", "Behandlung mit Blitzlicht (IPL) bei Pigmentflecken und Rötungen.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "N", "0", ust=True, hinweis="§ 5 Abs. 2 NiSV: Die Behandlung von Gefäßveränderungen und pigmentierten Hautveränderungen mit Laser oder intensiven Lichtquellen dürfen nur approbierte Ärztinnen und Ärzte mit entsprechender ärztlicher Weiterbildung oder Fortbildung durchführen.")
E(k, "Laser-Haarentfernung", "Laser-Epilation (Dioden-/Alexandrit-Laser)", "Haare weglasern, Laser Epilation", "Haarentfernung mit Laserlicht.", "Arzt oder Fachpersonal mit Fachkunde nach § 5 Abs. 1 NiSV", "SZ", "GOÄ analog", "N", "0", ust=True)
E(k, "Tattooentfernung", "Pikosekunden-/Q-Switch-Laser", "Tattoo weglasern, Permanent-Make-up entfernen", "Laserbehandlung mit dem Ziel, Farbpigmente in der Haut zu zerkleinern.", ARZT, "SZ", "GOÄ analog", "M", "1", ust=True, hinweis="§ 5 Abs. 2 NiSV: Die Entfernung von Tätowierungen oder Permanent-Make-up mit Laser oder intensiven Lichtquellen dürfen nur approbierte Ärztinnen und Ärzte mit entsprechender ärztlicher Weiterbildung oder Fortbildung durchführen.")
E(k, "Couperose & Besenreiser", "Gefäßlaser / Sklerotherapie", "rote Äderchen, Besenreiser, Rosazea", "Verödung sichtbarer Äderchen mit Laser oder durch Einspritzen eines Verödungsmittels.", "Dermatologe / Phlebologe", "SZ", "GOÄ analog", "M", "1", ust=True)
E(k, "Pigmentflecken entfernen", "Pigmentlaser / Melasma-Therapie", "Altersflecken, Sonnenflecken, Melasma", "Behandlung mit Laser oder Wirkstoffen mit dem Ziel, Pigmentflecken aufzuhellen.", DERM, "SZ", "GOÄ analog", "M", "1", ust=True)
E(k, "Aknenarben behandeln", "Narbentherapie (Laser, Subzision, Needling)", "Aknenarben, Narben glätten", "Laser, Subzision oder Needling mit dem Ziel, eingesunkene Aknenarben zu glätten.", DERM, "SZ", "GOÄ analog", "M", "2", ust=True)
E(k, "Akne-Behandlung", "Medizinische Aknetherapie", "Pickel, unreine Haut", "Medizinische Behandlung aktiver Akne.", DERM, "IND", "GOÄ / EBM", "N", "0")

k = "Straffung ohne OP"
E(k, "Ultraschall-Lifting", "HIFU (z. B. Ultherapy)", "HIFU, Ultherapy, HIFU Gesicht", "Fokussierter Ultraschall, der tiefere Hautschichten erwärmt.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "N", "0", ust=True, hwg="prüfen", hinweis="§ 9 Abs. 2 NiSV: Ultraschallanwendungen zur gezielten thermischen Gewebekoagulation oder Fettgewebereduktion dürfen nur approbierte Ärztinnen und Ärzte durchführen.")
E(k, "Radiofrequenz-Straffung", "Monopolare Radiofrequenz (z. B. Thermage)", "Thermage, RF-Straffung", "Erwärmung der Haut durch Hochfrequenz, mit dem Ziel, sie zu straffen.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "N", "0", ust=True)
E(k, "Fett wegfrieren", "Kryolipolyse", "CoolSculpting, Fettabbau Kälte", "Kühlung von Fettpolstern mit dem Ziel, Fettzellen abzubauen.", "Arzt / Fachpersonal", "SZ", "GOÄ analog", "N", "0", ust=True, hwg="prüfen")
E(k, "Muskelstimulation per Gerät (HIFEM/EMS)", "HIFEM / EMS-Body-Contouring", "Emsculpt, Body Contouring, Muskelaufbau per Gerät", "Elektromagnetische Stimulation der Muskeln.", "Fachpersonal mit Fachkunde nach § 7 NiSV", "SZ", "–", "N", "0", ust=True, hinweis="§ 7 NiSV regelt die Fachkunde für Muskelstimulation zum Muskelaufbau und zur Muskelstraffung. Hochfrequenzanwendungen zur thermischen Fettgewebereduktion dürfen nach § 6 Abs. 2 NiSV nur approbierte Ärztinnen und Ärzte mit entsprechender Weiterbildung oder Fortbildung durchführen.", id_name="Muskelaufbau & Fettreduktion per Gerät")
E(k, "Cellulite-Behandlung", "Cellulite-Therapie (Stoßwelle, Subzision)", "Orangenhaut, Cellulite", "Stoßwelle oder Subzision im Bereich von Cellulite an Po und Oberschenkeln.", "Arzt (Subzision); Stoßwelle auch Fachpersonal", "SZ", "GOÄ analog", "M", "1", ust=True)

k = "Haare"
E(k, "Haarausfall-Behandlung", "PRP / Mesotherapie Kopfhaut", "Haarausfall, Haare dünner, PRP Haare", "Injektion von Eigenblutplasma oder Wirkstoffen in die Kopfhaut mit dem Ziel, die Haarwurzeln anzuregen.", "Arzt / Dermatologe", "SZ", "GOÄ analog", "M", "0", ust=True)
E(k, "Haartransplantation", "FUE / DHI-Haartransplantation", "Haartransplantation, Geheimratsecken, Bart", "Verpflanzung eigener Haarfollikel.", "Arzt (Haarchirurg)", "SZ", "GOÄ analog", "O", "2", ust=True, hwg="ja")

k = "Wellness-Medizin"
E(k, "Infusionstherapie", "Vitamin-/Mikronährstoff-Infusion", "IV-Drip, Vitamininfusion, NAD+", "Infusion mit Vitaminen und Mineralstoffen.", ARZT, "SZ", "GOÄ", "M", "0", ust=True, hinweis="Infusionen ohne medizinischen Anlass zahlen Sie selbst.")

# =====================================================================
B("Plastische & Ästhetische Chirurgie")
k = "Gesicht"
for name, fach, syn, desc, aus, beh in [
    ("Oberlidstraffung", "Blepharoplastik Oberlid", "Schlupflider, Lidstraffung", "Entfernung überschüssiger Haut am Oberlid.", "3", PC),
    ("Unterlidstraffung", "Blepharoplastik Unterlid", "Tränensäcke entfernen", "Operation am Unterlid mit dem Ziel, Tränensäcke und erschlaffte Haut zu korrigieren.", "3", PC),
    ("Facelift", "Rhytidektomie / SMAS-Lift / Deep-Plane-Lift", "Gesichtsstraffung, Deep Plane Facelift", "Operation mit dem Ziel, Gesicht und Hals zu straffen.", "4", PC),
    ("Halsstraffung", "Halslift", "Truthahnhals, Halshaut", "Operation mit dem Ziel, erschlaffte Halshaut zu straffen.", "3", PC),
    ("Stirn- & Brauenlift", "Stirnlift (endoskopisch)", "Brauenlift OP", "Operation mit dem Ziel, Stirn und Augenbrauen anzuheben.", "3", PC),
    ("Nasenkorrektur (OP)", "Rhinoplastik / Septorhinoplastik", "Nasen-OP, Höckernase, Schiefnase", "Operation mit dem Ziel, die Form der Nase zu verändern, bei Bedarf auch die Nasenatmung zu verbessern.", "4", HNO),
    ("Ohrenkorrektur", "Otoplastik", "Segelohren, Ohren anlegen", "Operation mit dem Ziel, abstehende Ohren näher an den Kopf zu legen.", "3", HNO),
    ("Kinnimplantat", "Kinnaugmentation mit Implantat", "Kinnimplantat", "Einsetzen eines Implantats mit dem Ziel, das Kinn zu vergrößern.", "3", PC),
    ("Wangenfett-Entfernung", "Bichektomie", "Buccal Fat Removal, Hamsterbacken", "Entfernung von Wangenfett mit dem Ziel, die Wangen schmaler zu machen.", "2", f"{PC} / {MKG}"),
    ("Lippenlift", "Bullhorn-Lippenlift", "Oberlippe verkürzen, Lip Lift", "Operation, bei der die Haut zwischen Nase und Oberlippe verkürzt wird.", "2", PC),
    ("Eigenfett ins Gesicht", "Lipofilling Gesicht", "Eigenfettunterspritzung", "Übertragung von körpereigenem Fett ins Gesicht mit dem Ziel, Volumen aufzubauen.", "2", PC),
]:
    E(k, name, fach, syn, desc, beh, "SZ", "GOÄ (analog), ggf. Kasse bei Indikation", "O", aus, ust=True, hwg="ja")

k = "Brust"
for name, fach, syn, desc, aus in [
    ("Brustvergrößerung mit Implantat", "Mammaaugmentation", "Brust-OP, Silikon, Brustimplantate", "Einsetzen von Implantaten mit dem Ziel, die Brust zu vergrößern.", "4"),
    ("Brustvergrößerung mit Eigenfett", "Lipofilling Brust", "Eigenfett Brust", "Übertragung von eigenem Fett in die Brust mit dem Ziel, sie zu vergrößern.", "3"),
    ("Bruststraffung", "Mastopexie", "Hängebrust, Brustlift", "Operation mit dem Ziel, die Brust anzuheben und zu straffen.", "4"),
    ("Brustimplantat-Wechsel", "Implantatwechsel / Kapselfibrose-OP", "Kapselfibrose, Implantat tauschen", "Austausch oder Entfernung alter Implantate.", "3"),
    ("Brustwarzenkorrektur", "Mamillenkorrektur", "Schlupfwarzen, Brustwarze verkleinern", "Operation mit dem Ziel, Form oder Größe der Brustwarzen zu verändern.", "2"),
]:
    E(k, name, fach, syn, desc, PC, "SZ", "GOÄ (analog)", "O", aus, ust=True, hwg="ja")
E(k, "Brustverkleinerung", "Mammareduktion", "zu große Brust, Rückenschmerzen Brust", "Operation mit dem Ziel, die Brust zu verkleinern, z. B. bei Beschwerden.", PC, "IND", "GOÄ / EBM bei Indikation", "O", "4", hwg="ja")
E(k, "Männerbrust entfernen", "Gynäkomastie-Korrektur", "Männerbrust, Gynäkomastie", "Entfernung von Drüsen- und Fettgewebe an der männlichen Brust.", PC, "IND", "GOÄ", "O", "3", ust=True, hwg="ja")
E(k, "Brustrekonstruktion", "Brustwiederaufbau", "Brustaufbau nach Krebs", "Operation nach Brustkrebs mit dem Ziel, die Brust wieder aufzubauen, mit Implantat oder Eigengewebe.", PC, "GKV", "EBM / GOÄ", "O", "4")

k = "Körper"
for name, fach, syn, desc, aus, kt in [
    ("Fettabsaugung", "Liposuktion (Tumeszenz, Vaser)", "Fett absaugen, Lipo, Vaser", "Absaugen von Fettgewebe.", "3", "SZ"),
    ("Bauchdeckenstraffung", "Abdominoplastik", "Bauchstraffung, Fettschürze, Mommy Makeover", "Entfernung überschüssiger Bauchhaut, bei Bedarf mit Raffung der Bauchmuskeln.", "4", "IND"),
    ("Oberarmstraffung", "Brachioplastik", "Winkearme, Oberarmhaut", "Entfernung erschlaffter Haut an den Oberarmen.", "3", "IND"),
    ("Oberschenkelstraffung", "Thighplastik", "Oberschenkel innen straffen", "Operation mit dem Ziel, erschlaffte Oberschenkelhaut zu straffen.", "3", "IND"),
    ("Bodylift", "Body Lift (nach Gewichtsverlust)", "Hautstraffung nach Abnehmen", "Operation an mehreren Körperregionen nach starkem Gewichtsverlust mit dem Ziel, die Haut zu straffen.", "4", "IND"),
    ("Po-Vergrößerung mit Eigenfett", "Brazilian Butt Lift (BBL)", "BBL, Po-Aufbau", "Übertragung von eigenem Fett in den Po mit dem Ziel, ihn zu formen.", "4", "SZ"),
    ("Lipödem-Behandlung", "Liposuktion bei Lipödem", "Lipödem, Reithosen schmerzhaft", "Medizinische Fettabsaugung bei Lipödem.", "3", "IND"),
]:
    E(k, name, fach, syn, desc, PC, kt, "GOÄ (analog) / EBM bei Indikation", "O", aus, ust=(kt == "SZ"), hwg="ja")

k = "Intimbereich"
E(k, "Schamlippenkorrektur", "Labioplastik", "Labienverkleinerung, Intimchirurgie", "Operation mit dem Ziel, die inneren Schamlippen zu verkleinern oder zu formen.", GYN, "SZ", "GOÄ (analog)", "O", "3", ust=True, hwg="ja")
E(k, "Intimbereich-Verjüngung", "Vaginale Laser-/RF-Behandlung", "Vaginal-Laser, Intimlaser", "Laser- oder RF-Behandlung des Intimbereichs.", GYN, "SZ", "GOÄ analog", "M", "1", ust=True, hwg="prüfen")

k = "Haut-Chirurgie"
E(k, "Muttermal entfernen", "Exzision von Nävi", "Leberfleck entfernen, Muttermal", "Operative Entfernung von Muttermalen.", "Dermatologe / Chirurg", "IND", "GOÄ / EBM", "O", "1")
E(k, "Narbenkorrektur", "Operative Narbenrevision", "Narbe entfernen, Keloid", "Operation an auffälligen Narben mit dem Ziel, sie weniger sichtbar zu machen.", "Dermatologe / Plastischer Chirurg", "IND", "GOÄ", "O", "2", hwg="ja")
E(k, "Lipom entfernen", "Lipomexzision", "Fettgeschwulst, Knubbel unter der Haut", "Entfernung gutartiger Fettknoten.", "Dermatologe / Chirurg", "IND", "GOÄ / EBM", "O", "1")
E(k, "Lidgelbflecken entfernen", "Xanthelasmen-Entfernung", "Xanthelasmen, gelbe Flecken Augenlid", "Entfernung gelblicher Ablagerungen am Lid.", "Dermatologe / Augenarzt", "SZ", "GOÄ", "M", "1", ust=True)
E(k, "Hautanhängsel entfernen", "Fibrom-/Stielwarzen-Entfernung", "Stielwarzen, Fibrome, Alterswarzen", "Entfernung kleiner Hautwucherungen.", DERM, "SZ", "GOÄ", "M", "0", ust=True)

# =====================================================================
B("Weitere Selbstzahler-Eingriffe")
k = "Augen"
E(k, "Augenlasern (LASIK/Femto-LASIK)", "Femto-LASIK", "Augen lasern, Kurzsichtigkeit lasern", "Laserbehandlung der Hornhaut mit dem Ziel, eine Fehlsichtigkeit zu korrigieren.", AUG, "SZ", "GOÄ", "M", "1")
E(k, "Augenlasern (SMILE)", "SMILE / Lentikelextraktion", "SMILE, schnittarmes Lasern", "Laserbehandlung der Hornhaut über einen kleinen Schnitt, ohne Flap.", AUG, "SZ", "GOÄ", "M", "1")
E(k, "Augenlasern (PRK/LASEK)", "Oberflächenbehandlung", "PRK, Trans-PRK", "Laser auf der Hornhautoberfläche, für dünne Hornhaut.", AUG, "SZ", "GOÄ", "M", "2")
E(k, "Linsentausch", "Refraktiver Linsenaustausch / ICL", "Kunstlinse, ICL, Linsenimplantat", "Ersatz oder Ergänzung der Linse bei starker Fehlsichtigkeit.", AUG, "SZ", "GOÄ", "O", "2")

k = "Kosmetik (nicht ärztlich)"
E(k, "Hydrafacial", "Hydradermabrasion", "Hydrafacial, Aquafacial", "Reinigung, Peeling und Auftragen von Pflegestoffen in einer Behandlung.", KOS, "SZ", "–", "N", "0", ust=True)
E(k, "Mikrodermabrasion", "Mikrodermabrasion", "Diamant-Peeling", "Mechanisches Hautpeeling.", KOS, "SZ", "–", "N", "0", ust=True)
E(k, "Permanent Make-up", "Mikropigmentierung", "Microblading, PMU, Lippenpigmentierung", "Einbringen von Farbpigmenten in die Haut an Brauen, Lippen oder als Lidstrich.", KOS, "SZ", "–", "M", "1", ust=True)
E(k, "LED-Lichttherapie", "Photobiomodulation", "LED-Maske, Lichttherapie Haut", "Bestrahlung der Haut mit rotem oder blauem LED-Licht.", KOS, "SZ", "–", "N", "0", ust=True)
E(k, "Dermaplaning", "Dermaplaning", "Gesichtshaare entfernen, Peach Fuzz", "Abtragen von Hautschüppchen und Flaumhaaren mit einer Klinge.", KOS, "SZ", "–", "N", "0", ust=True)


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
