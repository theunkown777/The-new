# Erweiterung: alle medizinischen Bereiche. Wird von build_katalog.py per exec() geladen
# (nutzt B() und E() von dort).
# Zeilenformat: Name | Fachbegriff | Synonyme (Komma) | Beschreibung | Kostenträger | Invasivität | Ausfallzeit [| Hinweis]
# "## Kategorie" setzt die Kategorie.

GEBO_DEFAULT = {
    "GKV": "EBM / GOÄ",
    "GKV_EA": "EBM + Eigenanteil / GOÄ",
    "IND": "EBM bei Indikation, sonst GOÄ (IGeL)",
    "PKV": "GOÄ (GKV: Selbstzahler)",
    "SZ": "GOÄ (IGeL / Selbstzahler)",
}


def F(bereich, behandler, block, gebo=None, ust=False, hwg="nein"):
    B(bereich)
    kat = None
    for raw in block.strip().splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("## "):
            kat = line[3:].strip()
            continue
        p = [x.strip() for x in line.split("|")]
        assert len(p) in (7, 8), (bereich, line)
        name, fach, syn, desc, kt, inv, aus = p[:7]
        hinweis = p[7] if len(p) == 8 else ""
        g = gebo or GEBO_DEFAULT[kt]
        if gebo is None and inv == "O" and aus in ("3", "4"):
            g += " · stationär: DRG"
        E(kat, name, fach, syn, desc, behandler, kt, g, inv, aus, hwg=hwg,
          ust=(ust and kt == "SZ"), hinweis=hinweis)


F("Vorsorge & Check-ups", "Hausarzt / jeweiliger Facharzt", """
## Gesetzliche Vorsorge
Gesundheits-Check-up | Check-up 18/35 (Gesundheitsuntersuchung) | Check-up, Vorsorgeuntersuchung, Blutwerte Check | Ganzkörper-Untersuchung mit Blutwerten und Urin. | GKV | N | 0 | Ab 18 einmalig, ab 35 alle 3 Jahre.
Hautkrebs-Screening | Hautkrebsfrüherkennung | Muttermale checken, Hautcheck | Untersuchung der gesamten Haut auf Hautkrebs. | GKV | N | 0 | Ab 35 alle 2 Jahre.
Darmkrebs-Vorsorge (Stuhltest) | Immunologischer Stuhltest (iFOBT) | Stuhltest, Blut im Stuhl Test | Test auf verborgenes Blut im Stuhl. | GKV | N | 0 | Ab 50.
Vorsorge-Darmspiegelung | Früherkennungskoloskopie | Darmspiegelung Vorsorge, Koloskopie | Spiegelung des Darms zur Krebsfrüherkennung. | GKV | M | 1 | Ab 50 (Männer und Frauen).
Gebärmutterhalskrebs-Vorsorge | Zytologischer Abstrich / Ko-Test (HPV) | Krebsabstrich, PAP-Test, HPV-Test | Abstrich vom Muttermund. | GKV | N | 0
Mammographie-Screening | Mammographie-Screening-Programm | Brustkrebsvorsorge, Mammographie | Röntgen der Brust zur Früherkennung. | GKV | N | 0 | 50–75 Jahre, alle 2 Jahre.
Prostatakrebs-Vorsorge | Tastuntersuchung Prostata | Prostata Vorsorge Mann | Tastuntersuchung der Prostata ab 45. | GKV | N | 0
Bauchaorten-Screening | Ultraschall Bauchaorta | Aneurysma Screening | Ultraschall auf Erweiterung der Bauchschlagader (Männer ab 65). | GKV | N | 0
Kinder-Vorsorgeuntersuchungen | U1–U9, J1 | U-Untersuchung, Kinderarzt Vorsorge | Entwicklungsuntersuchungen von Geburt bis Jugend. | GKV | N | 0
Hepatitis-B/C-Screening | Screening auf Hepatitis B und C | Leber Virus Test | Einmaliger Bluttest im Rahmen des Check-ups. | GKV | N | 0
## Zusätzliche Vorsorge (IGeL)
PSA-Test | Prostataspezifisches Antigen | PSA Wert, Prostata Bluttest | Bluttest zur Prostatakrebs-Früherkennung. | SZ | N | 0
Ultraschall Eierstöcke & Gebärmutter | Vaginalsonographie (IGeL) | Ultraschall Frauenarzt Vorsorge | Ultraschall zur Früherkennung. | SZ | N | 0
Ultraschall der Brust | Mammasonographie | Brustultraschall | Ergänzende Untersuchung der Brust. | IND | N | 0
Augeninnendruck-Messung | Glaukom-Früherkennung | Grüner Star Test, Augendruck | Messung zur Früherkennung von Grünem Star. | SZ | N | 0
Erweiterter Labor-Check | Großes Blutbild / Vitamin- und Hormonstatus | Vitamin D Test, Schilddrüsenwerte, Bluttest | Erweiterte Laborwerte auf Wunsch. | SZ | N | 0
Manager-/Executive-Check-up | Umfassende Präventionsuntersuchung | Executive Check, Ganzkörper-Check | Mehrstündige Rundum-Untersuchung mit Bildgebung. | SZ | N | 0
Ganzkörper-MRT | Präventives Ganzkörper-MRT | Ganzkörperscan | MRT des ganzen Körpers ohne konkreten Anlass. | SZ | N | 0
Herz-Check | Belastungs-EKG und Herzultraschall (präventiv) | Herz Vorsorge | Herzuntersuchung ohne Beschwerden. | SZ | N | 0
""")

F("Allgemeinmedizin (Hausarzt)", "Facharzt Allgemeinmedizin / Hausarzt", """
## Hausärztliche Versorgung
Hausärztliche Sprechstunde | Hausärztliche Grundversorgung | Hausarzt, Termin Hausarzt | Erste Anlaufstelle bei allen Beschwerden. | GKV | N | 0
Akutsprechstunde | Akutbehandlung | Erkältung, Infekt, Fieber | Behandlung akuter Erkrankungen. | GKV | N | 0
Krankschreibung | Arbeitsunfähigkeitsbescheinigung (eAU) | AU, Krankmeldung, gelber Schein | Bescheinigung der Arbeitsunfähigkeit. | GKV | N | 0
Überweisung | Überweisung an Facharzt | Überweisungsschein | Weiterleitung an Fachärzte. | GKV | N | 0
Rezept / Folgerezept | E-Rezept-Ausstellung | Rezept, Medikament verschreiben | Verordnung von Medikamenten. | GKV | N | 0
Chronikerprogramme | Disease-Management-Programm (DMP) | DMP Diabetes, DMP Asthma, Herzkrankheit | Strukturierte Betreuung chronisch Kranker. | GKV | N | 0
Hausbesuch | Ärztlicher Hausbesuch | Arzt nach Hause | Behandlung zu Hause bei Immobilität. | GKV | N | 0
Blutabnahme | Venöse Blutentnahme | Blut abnehmen, Laborwerte | Blutentnahme für Laboruntersuchungen. | GKV | M | 0
EKG | Ruhe-EKG | Herzstromkurve | Messung der Herzaktivität. | GKV | N | 0
Langzeit-Blutdruckmessung | 24h-Blutdruckmessung | Blutdruck 24 Stunden | Blutdruck über einen Tag messen. | GKV | N | 0
Lungenfunktionstest | Spirometrie | Lungentest | Messung der Atemleistung. | GKV | N | 0
Ultraschall Bauch | Abdomensonographie | Bauchultraschall, Sono | Ultraschall der Bauchorgane. | GKV | N | 0
Wundversorgung | Wundbehandlung / Naht | Wunde nähen, Verbandswechsel | Versorgung von Wunden und Verletzungen. | GKV | M | 0
Atteste & Bescheinigungen | Ärztliche Atteste | Attest, Sportattest, Bescheinigung | Gesundheitsbescheinigungen (Schule, Sport, Reise). | SZ | N | 0
Führerschein-Untersuchung | Untersuchung für Fahrerlaubnis | Sehtest Führerschein, LKW-Führerschein | Ärztliche Untersuchung für Führerscheinklassen. | SZ | N | 0
Raucherentwöhnung | Tabakentwöhnung | Rauchen aufhören | Ärztliche Begleitung beim Rauchstopp. | SZ | N | 0
Ernährungs- und Gewichtsberatung | Adipositas-Beratung | Abnehmen, Übergewicht, Abnehmspritze | Medizinische Beratung und Therapie bei Übergewicht. | IND | N | 0
""")

F("Impfungen & Reisemedizin", "Hausarzt / Reisemediziner", """
## Impfungen
Standardimpfungen | Impfungen nach STIKO | Tetanus, Diphtherie, Keuchhusten, Polio | Auffrischung der Grundimpfungen. | GKV | M | 0
Grippeimpfung | Influenza-Impfung | Grippeschutz | Jährliche Impfung gegen Grippe. | GKV | M | 0
Corona-Impfung | COVID-19-Impfung | Covid Booster | Impfung gegen COVID-19. | GKV | M | 0
Pneumokokken-Impfung | Pneumokokken-Impfung | Lungenentzündung Impfung | Schutz vor Lungenentzündung. | GKV | M | 0
Gürtelrose-Impfung | Herpes-zoster-Impfung | Shingrix, Gürtelrose | Schutz vor Gürtelrose ab 60. | GKV | M | 0
HPV-Impfung | HPV-Impfung | Gebärmutterhalskrebs Impfung | Schutz vor HPV-bedingten Krebsarten. | GKV | M | 0
RSV-Impfung | RSV-Impfung | RSV | Schutz vor RS-Virus (Ältere, Säuglinge). | GKV | M | 0
FSME-Impfung | FSME-Impfung | Zeckenimpfung | Schutz vor Zecken-Hirnhautentzündung. | GKV | M | 0
Kinderimpfungen | Impfungen im Kindesalter | Masern, Mumps, Röteln, Sechsfachimpfung | Alle empfohlenen Impfungen für Kinder. | GKV | M | 0
## Reisemedizin
Reisemedizinische Beratung | Reiseberatung | Reiseimpfung Beratung, Tropenreise | Beratung zu Impfungen und Gesundheitsrisiken auf Reisen. | SZ | N | 0
Reiseimpfungen | Reiseimpfungen | Gelbfieber, Typhus, Tollwut, Japanische Enzephalitis, Hepatitis A | Impfungen für Fernreisen. | IND | M | 0 | Viele Kassen erstatten freiwillig.
Malariaprophylaxe | Malaria-Prophylaxe | Malaria Tabletten | Medikamente und Beratung gegen Malaria. | SZ | N | 0
Tauchtauglichkeit | Tauchtauglichkeitsuntersuchung | Tauchattest | Ärztliche Untersuchung für Taucher. | SZ | N | 0
Höhen- und Flugtauglichkeit | Flugtauglichkeitsuntersuchung | Fliegerarzt | Tauglichkeit für Piloten oder Höhenaufenthalte. | SZ | N | 0
""")

F("Innere Medizin", "Facharzt Innere Medizin", """
## Kardiologie (Herz)
Herzultraschall | Echokardiographie | Herzecho, Echo | Ultraschall des Herzens. | GKV | N | 0
Belastungs-EKG | Ergometrie | Fahrrad-EKG | EKG unter körperlicher Belastung. | GKV | N | 0
Langzeit-EKG | 24h-/7-Tage-EKG | Holter | Herzrhythmus über längere Zeit. | GKV | N | 0
Herzkatheter | Koronarangiographie | Herzkatheter, Stent | Darstellung und Aufdehnung der Herzkranzgefäße. | GKV | M | 2
Herzschrittmacher | Schrittmacher-/ICD-Implantation | Defibrillator, Schrittmacher | Einsetzen eines Schrittmachers. | GKV | O | 2
Behandlung von Herzrhythmusstörungen | Katheterablation | Vorhofflimmern Ablation | Verödung von Störherden im Herzen. | GKV | M | 2
Bluthochdruck-Behandlung | Hypertonie-Therapie | Bluthochdruck, Hypertonie | Diagnose und Einstellung des Blutdrucks. | GKV | N | 0
Herzinsuffizienz-Betreuung | Herzinsuffizienz-Therapie | Herzschwäche | Behandlung der Herzschwäche. | GKV | N | 0
## Gastroenterologie (Magen-Darm)
Magenspiegelung | Gastroskopie | Magenspiegelung, ÖGD | Spiegelung von Speiseröhre, Magen, Zwölffingerdarm. | GKV | M | 1
Darmspiegelung (diagnostisch) | Koloskopie | Darmspiegelung, Polypen entfernen | Spiegelung des Dickdarms bei Beschwerden. | GKV | M | 1
Atemtests | H2-Atemtest / Helicobacter-Atemtest | Laktoseintoleranz Test, Fruktose Test, Helicobacter | Test auf Unverträglichkeiten und Magenkeim. | GKV | N | 0
Reizdarm & Unverträglichkeiten | Reizdarm-Diagnostik | Blähungen, Reizdarm, Zöliakie | Abklärung chronischer Verdauungsbeschwerden. | GKV | N | 0
Lebersprechstunde | Hepatologie | Fettleber, Leberwerte erhöht | Abklärung und Behandlung von Lebererkrankungen. | GKV | N | 0
Chronisch-entzündliche Darmerkrankungen | CED-Therapie | Morbus Crohn, Colitis ulcerosa | Behandlung entzündlicher Darmerkrankungen. | GKV | N | 0
## Pneumologie (Lunge)
Große Lungenfunktion | Bodyplethysmographie | Lungenfunktion, Asthma Test | Ausführliche Messung der Lungenfunktion. | GKV | N | 0
Allergie- & Asthma-Behandlung | Asthma-Therapie | Asthma, COPD | Diagnose und Therapie von Atemwegserkrankungen. | GKV | N | 0
Schlaflabor | Polysomnographie | Schlafapnoe, Schnarchen, Atemaussetzer | Untersuchung des Schlafs über Nacht. | GKV | N | 1
CPAP-Therapie | Atemmaskentherapie | Schlafapnoe Maske | Atemmaske bei Schlafapnoe. | GKV | N | 0
Lungenspiegelung | Bronchoskopie | Bronchoskopie | Spiegelung der Atemwege. | GKV | M | 1
## Endokrinologie & Diabetologie
Diabetes-Behandlung | Diabetologie | Zucker, Diabetes Typ 1, Diabetes Typ 2, Insulinpumpe | Einstellung und Schulung bei Diabetes. | GKV | N | 0
Schilddrüsen-Sprechstunde | Schilddrüsendiagnostik | Schilddrüse, Unterfunktion, Überfunktion, Hashimoto | Ultraschall und Laborwerte der Schilddrüse. | GKV | N | 0
Hormonsprechstunde | Endokrinologische Diagnostik | Hormone, Testosteron, Cortisol | Abklärung hormoneller Störungen. | GKV | N | 0
Osteoporose-Diagnostik | Knochendichtemessung (DXA) | Knochendichte, Osteoporose | Messung der Knochendichte. | IND | N | 0
Medikamentöse Adipositastherapie | Therapie mit GLP-1-Agonisten | Abnehmspritze, Wegovy, Mounjaro | Medikamentöse Gewichtsreduktion unter ärztlicher Aufsicht. | SZ | M | 0 | Kasse zahlt Abnehmmedikamente i. d. R. nicht.
## Nephrologie (Niere)
Nierensprechstunde | Nephrologie | Nierenwerte, Niereninsuffizienz | Abklärung von Nierenerkrankungen. | GKV | N | 0
Dialyse | Hämodialyse / Peritonealdialyse | Blutwäsche | Ersatz der Nierenfunktion. | GKV | M | 0
## Rheumatologie
Rheuma-Sprechstunde | Rheumatologische Diagnostik | Rheuma, Gelenkentzündung, Arthritis | Abklärung entzündlicher Gelenk- und Autoimmunerkrankungen. | GKV | N | 0
Biologika-Therapie | Biologikatherapie | Rheuma Spritze | Moderne Immuntherapie bei Rheuma. | GKV | M | 0
## Hämatologie & Onkologie
Krebsbehandlung (Chemotherapie) | Chemotherapie | Chemo, Krebs Therapie | Medikamentöse Krebstherapie. | GKV | M | 2
Immuntherapie bei Krebs | Onkologische Immuntherapie | Checkpoint-Inhibitoren | Therapie, die das Immunsystem gegen Krebs aktiviert. | GKV | M | 1
Blutbild-Abklärung | Hämatologische Diagnostik | Blutarmut, Anämie, Blutwerte auffällig | Abklärung von Blutkrankheiten. | GKV | N | 0
Zweitmeinung Krebs | Onkologische Zweitmeinung | Zweitmeinung Tumor | Unabhängige Beurteilung der Krebstherapie. | GKV | N | 0
## Angiologie (Gefäße)
Gefäßultraschall | Duplexsonographie | Venen Ultraschall, Halsschlagader Ultraschall | Ultraschall von Arterien und Venen. | GKV | N | 0
Thrombose-Abklärung | Thrombosediagnostik | Thrombose, Blutgerinnsel | Abklärung und Behandlung von Thrombosen. | GKV | N | 0
## Infektiologie
HIV-/STI-Test | Test auf sexuell übertragbare Infektionen | HIV-Test, Chlamydien, Syphilis, Geschlechtskrankheit | Diagnostik sexuell übertragbarer Infektionen. | IND | N | 0
HIV-Prophylaxe | PrEP / PEP | PrEP | Medikamentöser Schutz vor HIV. | GKV | N | 0
Long-COVID-Sprechstunde | Post-COVID-Ambulanz | Long Covid, Post Covid, ME/CFS | Betreuung bei Langzeitfolgen von Infektionen. | GKV | N | 0
""")

F("Gynäkologie & Geburtshilfe", "Facharzt Gynäkologie und Geburtshilfe", """
## Frauengesundheit
Frauenärztliche Vorsorge | Gynäkologische Krebsfrüherkennung | Frauenarzt Vorsorge, Jahresuntersuchung | Jährliche Untersuchung inkl. Abstrich und Brustuntersuchung. | GKV | N | 0
Verhütungsberatung | Kontrazeptionsberatung | Pille, Verhütung | Beratung zu Verhütungsmethoden. | GKV | N | 0
Spirale einsetzen | Intrauterinpessar-Einlage | Spirale, Kupferspirale, Hormonspirale | Einlage einer Spirale zur Verhütung. | SZ | M | 0 | Kasse bis 22 Jahre.
Verhütungsstäbchen | Implantat zur Kontrazeption | Hormonstäbchen | Hormonstäbchen im Oberarm. | SZ | M | 0
Endometriose-Sprechstunde | Endometriose-Diagnostik und -Therapie | Endometriose, starke Regelschmerzen | Abklärung und Behandlung von Endometriose. | GKV | N | 0
Wechseljahre-Beratung | Menopausen-Sprechstunde | Wechseljahre, Hitzewallungen, Hormontherapie | Behandlung von Wechseljahresbeschwerden. | GKV | N | 0
Zyklusstörungen & PCOS | Zyklusdiagnostik | PCOS, unregelmäßige Periode | Abklärung von Zyklus- und Hormonstörungen. | GKV | N | 0
Gebärmutterspiegelung | Hysteroskopie | Ausschabung, Polyp Gebärmutter | Spiegelung und Eingriffe in der Gebärmutter. | GKV | O | 1
Bauchspiegelung (Gynäkologie) | Laparoskopie | Zyste Eierstock, Myom OP | Minimalinvasive OPs im Unterleib. | GKV | O | 2
Gebärmutterentfernung | Hysterektomie | Gebärmutter entfernen | Operative Entfernung der Gebärmutter. | GKV | O | 4
Inkontinenz- & Beckenbodenbehandlung | Urogynäkologie | Blasenschwäche Frau, Senkung | Behandlung von Inkontinenz und Senkungsbeschwerden. | GKV | M | 0
Brustsprechstunde | Senologie | Knoten in der Brust, Brustschmerzen | Abklärung von Veränderungen der Brust. | GKV | N | 0
## Schwangerschaft & Geburt
Schwangerschaftsvorsorge | Mutterschaftsvorsorge | Schwangerschaft Untersuchung, Mutterpass | Vorsorgeuntersuchungen in der Schwangerschaft. | GKV | N | 0
Ultraschall in der Schwangerschaft | Screening-Ultraschall | Babyultraschall, Feindiagnostik | Ultraschalluntersuchungen des Kindes. | GKV | N | 0
3D/4D-Ultraschall | 3D-/4D-Sonographie | Baby-Kino | Räumlicher Ultraschall auf Wunsch. | SZ | N | 0
Pränataldiagnostik | NIPT / Ersttrimester-Screening | Bluttest Trisomie, Nackenfaltenmessung | Untersuchungen auf genetische Auffälligkeiten. | IND | N | 0
Geburt | Geburtshilfe (Klinik/Geburtshaus) | Entbindung, Kreißsaal | Begleitung der Geburt. | GKV | M | 3
Kaiserschnitt | Sectio caesarea | Kaiserschnitt | Operative Entbindung. | GKV | O | 4
Schwangerschaftsabbruch | Schwangerschaftsabbruch | Abtreibung | Abbruch nach Beratung (medikamentös oder operativ). | IND | M | 1
## Kinderwunsch
Kinderwunsch-Beratung | Reproduktionsmedizinische Diagnostik | Kinderwunsch, unerfüllter Kinderwunsch | Abklärung der Fruchtbarkeit bei Paaren. | GKV | N | 0
Insemination | Intrauterine Insemination (IUI) | Samenübertragung | Einbringen von Spermien in die Gebärmutter. | GKV_EA | M | 0 | Kasse 50 % unter Bedingungen.
Künstliche Befruchtung | IVF / ICSI | IVF, ICSI, Retortenbaby | Befruchtung außerhalb des Körpers. | GKV_EA | M | 1 | Kasse 50 % für 3 Versuche (Altersgrenzen).
Eizellen einfrieren | Social Freezing / Kryokonservierung | Social Freezing | Einfrieren von Eizellen für später. | SZ | M | 1
""")

F("Urologie & Andrologie", "Facharzt Urologie", """
## Urologie
Urologische Vorsorge | Urologische Krebsfrüherkennung | Urologe Vorsorge | Untersuchung von Prostata, Nieren, Blase. | GKV | N | 0
Blasenspiegelung | Zystoskopie | Blasenspiegelung | Spiegelung von Harnröhre und Blase. | GKV | M | 0
Nierensteine | Steintherapie (ESWL / Ureteroskopie) | Nierenstein, Harnleiterstein, Kolik | Zertrümmerung oder Entfernung von Steinen. | GKV | M | 1
Behandlung vergrößerter Prostata | TURP / Laser-Prostata-OP | Prostata vergrößert, häufiges Wasserlassen | Operation bei gutartiger Prostatavergrößerung. | GKV | O | 3
Blasenschwäche | Inkontinenztherapie | Inkontinenz, Reizblase | Behandlung von Blasenschwäche bei Mann und Frau. | GKV | N | 0
Blasenentzündung | Harnwegsinfekt-Behandlung | Blasenentzündung, HWI | Behandlung von Harnwegsinfekten. | GKV | N | 0
## Andrologie (Männergesundheit)
Erektionsstörungen | Behandlung erektiler Dysfunktion | Potenzprobleme, Erektionsprobleme | Diagnostik und Therapie von Erektionsstörungen. | IND | N | 0 | Potenzmittel sind meist Selbstzahler.
Stoßwellentherapie bei Erektionsstörung | Low-Intensity Shockwave Therapy | Stoßwelle Potenz | Stoßwellen zur Verbesserung der Durchblutung. | SZ | N | 0
Testosteron-Check | Hormondiagnostik Mann | Testosteronmangel | Abklärung eines Hormonmangels. | IND | N | 0
Spermiogramm | Ejakulatanalyse | Fruchtbarkeit Mann | Untersuchung der Samenqualität. | IND | N | 0
Sterilisation beim Mann | Vasektomie | Vasektomie | Dauerhafte Verhütung durch Durchtrennung der Samenleiter. | SZ | O | 1
Beschneidung | Zirkumzision | Vorhautverengung, Phimose | Entfernung der Vorhaut. | IND | O | 2
""")

F("Orthopädie & Unfallchirurgie", "Facharzt Orthopädie und Unfallchirurgie", """
## Diagnostik & konservativ
Orthopädische Untersuchung | Orthopädische Diagnostik | Orthopäde, Rückenschmerzen, Gelenkschmerzen | Untersuchung von Gelenken, Muskeln und Wirbelsäule. | GKV | N | 0
Rückenschmerz-Therapie | Konservative Wirbelsäulentherapie | Rücken, Bandscheibe, Hexenschuss | Behandlung ohne OP: Medikamente, Spritzen, Physio. | GKV | N | 0
Wirbelsäulen-Injektionen | Infiltration / PRT / Facetteninfiltration | Rückenspritze, CT-gesteuerte Spritze | Gezielte Spritzen an Nerven oder Wirbelgelenke. | GKV | M | 0
Stoßwellentherapie | Extrakorporale Stoßwellentherapie (ESWT) | Fersensporn, Tennisarm, Kalkschulter | Stoßwellen gegen Sehnenbeschwerden. | SZ | N | 0
Hyaluron ins Gelenk | Intraartikuläre Hyaluronsäure | Knie Spritze, Arthrose Spritze | Gelenkschmiere bei Arthrose. | SZ | M | 0
Eigenbluttherapie Gelenk | ACP/PRP-Therapie | ACP, PRP Knie, Sportverletzung | Eigenblut zur Heilung von Gelenken und Sehnen. | SZ | M | 0
Akupunktur bei Schmerzen | Körperakupunktur | Akupunktur Rücken, Knie | Nadeln gegen chronische Schmerzen. | IND | M | 0 | Kasse bei chronischem Rücken- und Knieschmerz.
Einlagen & Bandagen | Hilfsmittelverordnung | Schuheinlagen, Orthese, Bandage | Verordnung orthopädischer Hilfsmittel. | GKV_EA | N | 0
Osteoporose-Behandlung | Osteoporosetherapie | Knochenschwund | Behandlung von Knochenschwund. | GKV | N | 0
Skoliose-Behandlung | Skoliosetherapie | Wirbelsäulenverkrümmung | Behandlung von Wirbelsäulenverkrümmungen. | GKV | N | 0
Kinderorthopädie | Kinderorthopädie | Hüftultraschall Baby, Fußfehlstellung Kind | Orthopädie für Kinder. | GKV | N | 0
## Operationen
Gelenkspiegelung Knie | Kniearthroskopie | Meniskus OP, Knie Spiegelung | Minimalinvasive Knie-OP. | GKV | O | 3
Kreuzband-OP | Kreuzbandplastik | Kreuzbandriss | Ersatz des gerissenen Kreuzbands. | GKV | O | 4
Schulter-OP | Schulterarthroskopie / Rotatorenmanschetten-Naht | Schulter OP, Impingement | Operationen am Schultergelenk. | GKV | O | 4
Künstliches Kniegelenk | Knie-Endoprothese (TEP) | Knieprothese, Knie TEP | Ersatz des Kniegelenks. | GKV | O | 4
Künstliches Hüftgelenk | Hüft-Endoprothese (TEP) | Hüftprothese, Hüft TEP | Ersatz des Hüftgelenks. | GKV | O | 4
Bandscheiben-OP | Nukleotomie / Mikrodiskektomie | Bandscheibenvorfall OP | Entfernung eines Bandscheibenvorfalls. | GKV | O | 4
Wirbelsäulen-Versteifung | Spondylodese | Versteifung Rücken | Stabilisierung der Wirbelsäule. | GKV | O | 4
Fuß-OP | Hallux-valgus-Korrektur | Ballenzeh, Hallux | Korrektur von Fußfehlstellungen. | GKV | O | 4
Knochenbruch-Versorgung | Frakturversorgung (konservativ/operativ) | Knochenbruch, Gips, Bruch | Behandlung von Knochenbrüchen. | GKV | O | 4
Arbeits- und Wegeunfall | D-Arzt-Verfahren (BG) | Arbeitsunfall, Schulunfall, Wegeunfall | Behandlung über die Berufsgenossenschaft. | GKV | N | 0 | Kostenträger: Berufsgenossenschaft/Unfallkasse.
""")

F("Sportmedizin", "Facharzt mit Zusatzbezeichnung Sportmedizin", """
## Sportmedizin
Sportmedizinische Untersuchung | Sporttauglichkeitsuntersuchung | Sportcheck, Sportattest | Check vor Trainings- oder Wettkampfbeginn. | SZ | N | 0 | Viele Kassen bezuschussen.
Leistungsdiagnostik | Laktat- / Spiroergometrie | Laktattest, VO2max, Spiroergometrie | Messung der Ausdauerleistung für Trainingsplanung. | SZ | N | 0
Sportverletzungen | Sporttraumatologie | Bänderriss, Muskelfaserriss, Umknicken | Diagnose und Behandlung von Sportverletzungen. | GKV | N | 0
Return-to-Sport-Test | Funktionelle Testung nach Verletzung | Return to Play | Test, ob nach Verletzung wieder voll belastbar. | SZ | N | 0
Laufanalyse | Lauf- und Ganganalyse | Laufband Analyse | Analyse des Laufstils, Einlagenberatung. | SZ | N | 0
Kinesio-Taping | Kinesiologisches Taping | Tape, Kinesiotape | Elastische Tapes zur Unterstützung. | SZ | N | 0
""")

F("Chirurgie", "Facharzt Chirurgie (Allgemein-/Viszeral-/Gefäßchirurgie)", """
## Allgemein- & Viszeralchirurgie
Leistenbruch-OP | Hernienchirurgie | Leistenbruch, Nabelbruch, Narbenbruch | Verschluss von Bruchlücken. | GKV | O | 3
Gallenblasen-OP | Cholezystektomie | Gallensteine | Entfernung der Gallenblase. | GKV | O | 3
Blinddarm-OP | Appendektomie | Blinddarmentzündung | Entfernung des Blinddarms. | GKV | O | 3
Hämorrhoiden-Behandlung | Proktologie | Hämorrhoiden, Analfissur, Juckreiz After | Behandlung von Enddarmerkrankungen. | GKV | M | 1
Schilddrüsen-OP | Thyreoidektomie | Schilddrüse entfernen, Knoten | Teil- oder Komplettentfernung der Schilddrüse. | GKV | O | 3
Adipositaschirurgie | Bariatrische Chirurgie | Magenverkleinerung, Magenbypass, Schlauchmagen | Operative Gewichtsreduktion. | IND | O | 4
Ambulante Kleinchirurgie | Ambulante Operationen | Abszess, eingewachsener Zehennagel, Grützbeutel | Kleine Eingriffe ohne stationären Aufenthalt. | GKV | O | 1
## Gefäßchirurgie
Krampfadern-Behandlung | Varizentherapie (Laser/Radiofrequenz/Stripping) | Krampfadern, Venen OP | Entfernung oder Verschluss erweiterter Venen. | GKV | M | 1
Halsschlagader-OP | Karotis-Operation | Halsschlagader verengt | Beseitigung von Verengungen der Halsschlagader. | GKV | O | 3
Durchblutungsstörungen Beine | pAVK-Therapie / Ballondilatation | Schaufensterkrankheit | Wiederherstellen der Durchblutung. | GKV | M | 2
## Handchirurgie
Karpaltunnel-OP | Karpaltunnelspaltung | Karpaltunnelsyndrom, eingeschlafene Hand | Entlastung des Handnervs. | GKV | O | 3
Schnellender Finger | Ringbandspaltung | Schnappfinger | Operation am Ringband. | GKV | O | 2
Morbus Dupuytren | Dupuytren-Operation | Dupuytren, krummer Finger | Behandlung von Strängen in der Hohlhand. | GKV | O | 3
## Neurochirurgie & Herzchirurgie
Neurochirurgische Eingriffe | Neurochirurgie | Hirntumor, Spinalkanalstenose | Operationen an Gehirn, Rückenmark und Nerven. | GKV | O | 4
Herzoperation | Herzchirurgie (Bypass, Klappe) | Bypass, Herzklappe, TAVI | Operationen am Herzen. | GKV | O | 4
""")

F("Neurologie", "Facharzt Neurologie", """
## Neurologie
Neurologische Untersuchung | Neurologischer Status | Neurologe | Untersuchung von Nerven, Gehirn, Reflexen. | GKV | N | 0
Kopfschmerz- und Migränesprechstunde | Kopfschmerztherapie | Migräne, Spannungskopfschmerz | Behandlung chronischer Kopfschmerzen. | GKV | N | 0
Nervenleitungsmessung | Elektroneurographie / EMG | Nervenmessung | Messung der Nervenleitfähigkeit. | GKV | N | 0
Hirnstrommessung | EEG | Hirnstrom, Epilepsie Test | Messung der Hirnaktivität. | GKV | N | 0
Schwindel-Abklärung | Schwindeldiagnostik | Schwindel, Gleichgewicht | Abklärung von Schwindelursachen. | GKV | N | 0
Gedächtnissprechstunde | Demenzdiagnostik | Vergesslichkeit, Demenz, Alzheimer | Abklärung von Gedächtnisstörungen. | GKV | N | 0
Schlaganfall-Nachsorge | Schlaganfallbehandlung | Schlaganfall, Stroke | Behandlung und Vorbeugung von Schlaganfällen. | GKV | N | 0
MS-Sprechstunde | Multiple-Sklerose-Therapie | MS | Behandlung der Multiplen Sklerose. | GKV | N | 0
Parkinson-Sprechstunde | Parkinson-Therapie | Zittern, Parkinson | Behandlung von Bewegungsstörungen. | GKV | N | 0
Epilepsie-Behandlung | Epileptologie | Krampfanfall | Diagnose und Therapie von Epilepsie. | GKV | N | 0
""")

F("Psychiatrie, Psychotherapie & Psychosomatik", "Psychiater / Psychologischer Psychotherapeut / Facharzt Psychosomatik", """
## Psychische Gesundheit
Psychotherapeutische Sprechstunde | Psychotherapeutische Sprechstunde | Erstgespräch Therapie, Therapieplatz | Erster Termin zur Abklärung. | GKV | N | 0
Verhaltenstherapie | Kognitive Verhaltenstherapie | VT, Therapie, Angst, Depression | Psychotherapie mit Fokus auf Denk- und Verhaltensmuster. | GKV | N | 0
Tiefenpsychologische Therapie | Tiefenpsychologisch fundierte Psychotherapie | TP, Gesprächstherapie | Bearbeitung unbewusster Konflikte. | GKV | N | 0
Analytische Psychotherapie | Psychoanalyse | Analyse | Langfristige psychoanalytische Behandlung. | GKV | N | 0
Systemische Therapie | Systemische Psychotherapie | Familientherapie, Paartherapie | Therapie mit Blick auf Beziehungen und Familie. | GKV | N | 0
Paartherapie | Paarberatung | Beziehungsprobleme | Beratung für Paare. | SZ | N | 0
Psychiatrische Behandlung | Psychiatrie | Psychiater, Medikamente Psyche | Diagnose und medikamentöse Behandlung. | GKV | N | 0
ADHS-Diagnostik | ADHS-Abklärung bei Erwachsenen | ADHS, ADS, Konzentration | Testung und Behandlung von ADHS. | GKV | N | 0
Autismus-Diagnostik | Autismus-Spektrum-Diagnostik | Autismus, Asperger | Abklärung von Autismus. | GKV | N | 0
Burnout & Stress | Stressbehandlung / Burnout-Therapie | Burnout, Erschöpfung | Behandlung stressbedingter Erkrankungen. | GKV | N | 0
Suchtbehandlung | Suchttherapie | Alkohol, Drogen, Spielsucht | Beratung, Entzug und Entwöhnung. | GKV | N | 0
Traumatherapie | Traumatherapie (z. B. EMDR) | EMDR, PTBS, Trauma | Behandlung von Traumafolgen. | GKV | N | 0
Akute psychische Krise | Krisenintervention | Krise, Notfall Psyche | Sofortige Hilfe in akuten Krisen. | GKV | N | 0
Online-Psychotherapie | Videopsychotherapie | Therapie online | Psychotherapie per Video. | GKV | N | 0
Psychosomatische Behandlung | Psychosomatische Medizin | Psychosomatik, körperliche Beschwerden ohne Befund | Behandlung von Körper-Seele-Wechselwirkungen. | GKV | N | 0
Coaching / psychologische Beratung | Psychologische Beratung | Coaching, Lebensberatung | Beratung ohne Krankheitswert. | SZ | N | 0
""")

F("Kinder- & Jugendmedizin", "Facharzt Kinder- und Jugendmedizin", """
## Kinderheilkunde
Kinderarzt-Sprechstunde | Pädiatrische Grundversorgung | Kinderarzt, krankes Kind | Behandlung von Krankheiten bei Kindern. | GKV | N | 0
Neugeborenen-Screening | Erweitertes Neugeborenen-Screening | Fersenblut, Hörscreening Baby | Tests auf angeborene Erkrankungen nach Geburt. | GKV | N | 0
Hüftultraschall Baby | Säuglingshüftsonographie | Hüftdysplasie | Ultraschall der Babyhüfte. | GKV | N | 0
Entwicklungsdiagnostik | Entwicklungs- und Sozialpädiatrie | Entwicklungsverzögerung, SPZ | Abklärung von Entwicklungsauffälligkeiten. | GKV | N | 0
Kinderallergologie | Allergietest Kind | Neurodermitis Kind, Heuschnupfen Kind | Allergiediagnostik bei Kindern. | GKV | N | 0
Jugendgesundheit | J1/J2-Untersuchung | Jugenduntersuchung | Vorsorge im Jugendalter. | GKV | N | 0
Kinder- und Jugendpsychiatrie | KJP / Kinderpsychotherapie | Kinderpsychologe, Schulangst | Psychische Gesundheit von Kindern. | GKV | N | 0
""")

F("HNO (Hals-Nasen-Ohren)", "Facharzt HNO-Heilkunde", """
## HNO
HNO-Untersuchung | HNO-Spiegelung | HNO-Arzt, Ohrenschmerzen, Halsschmerzen | Untersuchung von Ohr, Nase, Hals. | GKV | N | 0
Hörtest | Audiometrie | Hörtest, schlecht hören | Messung des Hörvermögens. | GKV | N | 0
Hörgeräte-Versorgung | Hörgeräteverordnung | Hörgerät | Verordnung und Anpassung von Hörgeräten. | GKV_EA | N | 0
Tinnitus-Behandlung | Tinnitustherapie | Ohrgeräusch, Pfeifen im Ohr | Behandlung von Ohrgeräuschen. | GKV | N | 0
Ohrenreinigung | Cerumenentfernung | Ohrenschmalz, Ohr verstopft | Entfernen von Ohrenschmalz. | GKV | N | 0
Nasenscheidewand-OP | Septumplastik | schiefe Nasenscheidewand, Nasenatmung | Verbesserung der Nasenatmung. | GKV | O | 3
Nasennebenhöhlen-OP | Nasennebenhöhlenchirurgie (FESS) | Sinusitis, Polypen Nase | Behandlung chronischer Nebenhöhlenentzündung. | GKV | O | 3
Mandel-OP | Tonsillektomie / Tonsillotomie | Mandeln raus, Polypen Kind | Entfernung der Mandeln. | GKV | O | 3
Paukenröhrchen | Paukendrainage | Paukenröhrchen Kind | Belüftung des Mittelohrs bei Kindern. | GKV | O | 1
Schnarch-Behandlung | Schnarchchirurgie / Schnarchtherapie | Schnarchen, Gaumensegel | Behandlung von Schnarchen. | SZ | M | 1
Allergie-Behandlung HNO | Hyposensibilisierung | Heuschnupfen, Desensibilisierung, Allergie Spritze | Gewöhnung des Körpers an Allergene. | GKV | M | 0
Stimm- und Schluckstörungen | Phoniatrie | Heiserkeit, Schluckbeschwerden | Abklärung von Stimme und Schlucken. | GKV | N | 0
""")

F("Augenheilkunde", "Facharzt Augenheilkunde", """
## Augen
Augenuntersuchung | Augenärztliche Untersuchung | Augenarzt, Sehtest, Augencheck | Untersuchung von Sehschärfe und Auge. | GKV | N | 0
Brillen- / Kontaktlinsenverordnung | Refraktionsbestimmung | Brille, Kontaktlinsen, Sehstärke | Bestimmung der Sehstärke. | GKV | N | 0
Grauer Star OP | Kataraktoperation | Grauer Star, Linse trüb | Austausch der getrübten Linse. | GKV | O | 2 | Premiumlinsen (Multifokal) gegen Aufpreis.
Grüner Star Behandlung | Glaukomtherapie | Grüner Star, Glaukom | Senkung des Augeninnendrucks. | GKV | M | 0
Makula-Behandlung | Intravitreale Injektion (IVOM) | Makuladegeneration, AMD, Spritze ins Auge | Medikamente ins Auge bei Netzhauterkrankung. | GKV | M | 1
Netzhaut-Untersuchung (OCT) | Optische Kohärenztomographie | OCT, Netzhautscan | Hochauflösender Scan der Netzhaut. | IND | N | 0
Trockene Augen | Therapie des trockenen Auges | trockene Augen, Augenbrennen | Behandlung trockener Augen. | IND | N | 0
Schielbehandlung | Strabologie / Orthoptik | Schielen, Amblyopie | Behandlung von Schielen, v. a. bei Kindern. | GKV | N | 0
Augen-Lid-Operationen | Lidchirurgie (medizinisch) | Hängelid, Lidfehlstellung | Operationen an den Lidern bei Funktionsstörung. | IND | O | 2
""")

F("Dermatologie (medizinisch)", "Facharzt Dermatologie", """
## Haut
Hautarzt-Sprechstunde | Dermatologische Untersuchung | Hautarzt, Ausschlag | Untersuchung von Haut, Haaren und Nägeln. | GKV | N | 0
Muttermal-Check mit Auflichtmikroskop | Dermatoskopie / Videodermatoskopie | Muttermal Mapping, Fotofinder | Digitale Kontrolle von Muttermalen. | SZ | N | 0
Neurodermitis-Behandlung | Atopische Dermatitis-Therapie | Neurodermitis, Ekzem | Behandlung von Neurodermitis. | GKV | N | 0
Schuppenflechte-Behandlung | Psoriasis-Therapie | Psoriasis, Schuppenflechte | Behandlung inkl. Lichttherapie und Biologika. | GKV | N | 0
Lichttherapie | UV-Phototherapie | UVB-Therapie | UV-Licht bei Hautkrankheiten. | GKV | N | 0
Allergietest Haut | Prick- / Epikutantest | Allergietest, Kontaktallergie | Test auf Allergien. | GKV | N | 0
Warzenbehandlung | Warzentherapie (Vereisung/Laser) | Warzen, Dornwarzen | Entfernung von Warzen. | GKV | M | 0
Nagelpilz-Behandlung | Onychomykose-Therapie | Nagelpilz, Fußpilz | Behandlung von Pilzinfektionen. | GKV | N | 0
Hautkrebs-Behandlung | Dermatoonkologie | Basaliom, Melanom, weißer Hautkrebs | Entfernung und Therapie von Hautkrebs. | GKV | O | 1
Rosazea-Behandlung | Rosazea-Therapie | Rosazea, Gesichtsrötung | Behandlung von Rosazea. | GKV | N | 0
Haarausfall-Diagnostik | Trichologie | Haarausfall, Trichogramm | Abklärung von Haarausfall. | IND | N | 0
""")

F("Radiologie & Nuklearmedizin", "Facharzt Radiologie / Nuklearmedizin", """
## Bildgebung
Röntgen | Konventionelles Röntgen | Röntgenbild | Röntgenaufnahme von Knochen und Organen. | GKV | N | 0
MRT | Magnetresonanztomographie | Kernspin, MRT | Schnittbilder ohne Strahlung. | GKV | N | 0
CT | Computertomographie | CT, Computertomograph | Schnelle Schnittbilder mit Röntgen. | GKV | N | 0
Ultraschall | Sonographie | Ultraschall | Bildgebung mit Schallwellen. | GKV | N | 0
Mammographie (diagnostisch) | Mammographie | Bruströntgen | Röntgen der Brust bei Beschwerden. | GKV | N | 0
Herz-CT / Kalk-Score | Kardio-CT | Kalkscore, Herz CT | CT der Herzkranzgefäße. | SZ | N | 0
Prostata-MRT | Multiparametrisches MRT der Prostata | Prostata MRT | Genaue Darstellung der Prostata. | IND | N | 0
Szintigraphie | Szintigraphie (Schilddrüse/Skelett) | Schilddrüsenszintigraphie, Knochenszintigraphie | Funktionsbild mit radioaktiven Markern. | GKV | M | 0
PET-CT | Positronen-Emissions-Tomographie | PET | Stoffwechsel-Bildgebung bei Krebs. | IND | M | 0
Radiojodtherapie | Radiojodtherapie | Schilddrüse Radiojod | Behandlung der Schilddrüse mit radioaktivem Jod. | GKV | M | 2
Strahlentherapie | Radioonkologie | Bestrahlung | Bestrahlung von Tumoren. | GKV | N | 1
Interventionelle Radiologie | Bildgesteuerte Eingriffe (z. B. Myomembolisation) | Embolisation | Minimalinvasive Eingriffe unter Bildkontrolle. | GKV | M | 1
""")

F("Schmerzmedizin & Anästhesie", "Facharzt Anästhesiologie / Schmerztherapeut", """
## Schmerz
Schmerzsprechstunde | Spezielle Schmerztherapie | chronische Schmerzen, Schmerzambulanz | Behandlung chronischer Schmerzen. | GKV | N | 0
Nervenblockaden | Regionalanästhesie / Nervenblockade | Schmerzspritze, Blockade | Gezielte Betäubung von Nerven. | GKV | M | 0
Multimodale Schmerztherapie | Interdisziplinäre Schmerztherapie | Schmerzprogramm | Kombiniertes Programm aus Medizin, Psyche, Bewegung. | GKV | N | 0
Narkose für Operationen | Anästhesie / Narkose | Vollnarkose, Narkose | Narkose und Überwachung bei Eingriffen. | GKV | M | 0
Medizinisches Cannabis | Cannabistherapie | Cannabis Rezept | Verordnung von Cannabis bei schweren Erkrankungen. | IND | N | 0
""")

F("Labor & Humangenetik", "Facharzt Laboratoriumsmedizin / Humangenetik", """
## Labor
Blutuntersuchung | Labordiagnostik | Blutbild, Laborwerte | Analyse von Blut-, Urin- und Stuhlproben. | GKV | N | 0
Unverträglichkeitstests | Nahrungsmittelallergie-Diagnostik | Laktose, Gluten, Histamin | Labortests auf Unverträglichkeiten. | IND | N | 0
Mikronährstoff-Analyse | Vitamin- und Mineralstoffstatus | Vitamin D, B12, Eisen, Ferritin | Bestimmung von Vitamin- und Mineralwerten. | IND | N | 0
Hormonprofil | Hormonlabor | Hormontest | Bestimmung von Hormonwerten. | IND | N | 0
Genetische Beratung | Humangenetische Beratung | Gentest, erbliche Erkrankung, BRCA | Beratung und Tests bei erblichen Erkrankungen. | IND | N | 0
Vaterschaftstest | Abstammungsgutachten | Vaterschaftstest | Genetischer Abstammungstest. | SZ | N | 0
""")

F("Notfall- & Akutmedizin", "Notarzt / Notaufnahme / Bereitschaftsdienst", """
## Notfall
Ärztlicher Bereitschaftsdienst | 116 117 | Notdienst, Arzt am Wochenende, Bereitschaftspraxis | Hilfe außerhalb der Sprechzeiten bei nicht lebensbedrohlichen Fällen. | GKV | N | 0
Notaufnahme | Zentrale Notaufnahme | Notaufnahme, Krankenhaus Notfall | Versorgung akuter Notfälle im Krankenhaus. | GKV | N | 0
Rettungsdienst | Notruf 112 | Krankenwagen, Notarzt | Lebensbedrohliche Notfälle. | GKV | N | 0
Giftnotruf | Giftinformationszentrum | Vergiftung | Beratung bei Vergiftungen. | GKV | N | 0
""")

F("Geriatrie & Palliativmedizin", "Facharzt Geriatrie / Palliativmediziner", """
## Altersmedizin
Geriatrisches Assessment | Geriatrische Basisuntersuchung | Altersmedizin, Sturzrisiko | Erfassung von Mobilität, Gedächtnis, Selbstständigkeit. | GKV | N | 0
Sturzprävention | Sturzprophylaxe | Sturz, Gleichgewicht Senioren | Training und Maßnahmen gegen Stürze. | GKV | N | 0
Medikamenten-Check | Medikationsanalyse / Medikationsplan | Medikationsplan, Wechselwirkungen | Prüfung aller Medikamente auf Wechselwirkungen. | GKV | N | 0
## Palliativ
Palliativversorgung | (Spezialisierte) Ambulante Palliativversorgung (SAPV) | Palliativ, Sterbebegleitung | Versorgung schwerstkranker Menschen zu Hause. | GKV | N | 0
Hospiz | Stationäres Hospiz | Hospiz | Begleitung am Lebensende. | GKV | N | 0
Patientenverfügung-Beratung | Beratung zur Vorsorgeplanung | Patientenverfügung, Vorsorgevollmacht | Ärztliche Beratung zu Verfügungen. | SZ | N | 0
""")

F("Arbeits- & Betriebsmedizin", "Facharzt Arbeitsmedizin / Betriebsarzt", """
## Arbeitsmedizin
Arbeitsmedizinische Vorsorge | Vorsorge nach ArbMedVV | Betriebsarzt, G-Untersuchung | Pflicht- und Angebotsvorsorge im Job. | SZ | N | 0 | Kostenträger: Arbeitgeber.
Einstellungsuntersuchung | Einstellungsuntersuchung | Gesundheitszeugnis, Jobcheck | Untersuchung vor Jobbeginn. | SZ | N | 0
Betriebliches Gesundheitsmanagement | BGM | BGM, Firmenfitness | Gesundheitsprogramme für Unternehmen. | SZ | N | 0
Wiedereingliederung | Stufenweise Wiedereingliederung | Hamburger Modell | Schrittweise Rückkehr in den Job. | GKV | N | 0
""")

F("Naturheilkunde & Komplementärmedizin", "Arzt mit Zusatzbezeichnung / Heilpraktiker / Osteopath", """
## Komplementär
Akupunktur | Akupunktur (TCM) | Akupunktur, Nadeln | Nadelbehandlung nach chinesischer Medizin. | IND | M | 0
Osteopathie | Osteopathische Behandlung | Osteopath | Manuelle Behandlung von Funktionsstörungen. | SZ | N | 0 | Viele Kassen bezuschussen.
Chiropraktik / Manuelle Medizin | Chirotherapie | Einrenken, Chiropraktiker | Lösen von Blockaden an Wirbelsäule und Gelenken. | IND | N | 0
Homöopathie | Klassische Homöopathie | Globuli | Behandlung mit homöopathischen Mitteln. | SZ | N | 0 | Wirksamkeit wissenschaftlich nicht belegt – keine Heilversprechen.
Naturheilverfahren | Phytotherapie / Schröpfen / Ausleitung | Schröpfen, Pflanzenheilkunde | Pflanzliche und physikalische Verfahren. | SZ | N | 0
Hypnosetherapie | Medizinische Hypnose | Hypnose, Rauchentwöhnung Hypnose | Therapie unter Hypnose. | SZ | N | 0
""")

F("Therapieberufe (Heilmittel)", "Physio-/Ergotherapeut, Logopäde, Podologe", """
## Physiotherapie
Krankengymnastik | Physiotherapie (KG) | Physio, KG, Krankengymnastik | Übungstherapie zur Verbesserung der Beweglichkeit. | GKV_EA | N | 0 | Auf Rezept, 10 % + 10 € Zuzahlung.
Manuelle Therapie | Manuelle Therapie (MT) | MT, Mobilisation | Gezielte Mobilisation von Gelenken. | GKV_EA | N | 0
Krankengymnastik am Gerät | KGG / Medizinische Trainingstherapie | KGG, Gerätetraining | Training an Geräten unter Anleitung. | GKV_EA | N | 0
Lymphdrainage | Manuelle Lymphdrainage | Lymphdrainage, Schwellung | Entstauung bei Schwellungen. | GKV_EA | N | 0
Massage | Klassische Massage | Massage, Verspannung | Lockerung verspannter Muskulatur. | GKV_EA | N | 0
Neurologische Physiotherapie | Bobath / PNF / Vojta | Bobath, Vojta | Physio bei neurologischen Erkrankungen. | GKV_EA | N | 0
Wärme- & Elektrotherapie | Physikalische Therapie | Fango, Elektrotherapie, Heißluft | Ergänzende Wärme-, Kälte- und Strombehandlung. | GKV_EA | N | 0
Beckenbodentraining | Beckenbodentherapie | Beckenboden, Rückbildung | Training der Beckenbodenmuskulatur. | GKV_EA | N | 0
Sportphysiotherapie | Sportphysiotherapie | Sportphysio | Physio speziell für Sportler. | SZ | N | 0
Physiotherapie privat / Selbstzahler | Präventive Physiotherapie | Physio ohne Rezept | Physio ohne Verordnung. | SZ | N | 0
## Ergotherapie
Ergotherapie | Ergotherapie | Ergo, Feinmotorik | Förderung von Alltagsfähigkeiten. | GKV_EA | N | 0
Handtherapie | Ergotherapeutische Handtherapie | Handreha | Rehabilitation nach Handverletzungen. | GKV_EA | N | 0
## Logopädie
Sprachtherapie | Logopädie | Logopäde, Sprachstörung, Stottern | Therapie von Sprach-, Sprech- und Stimmstörungen. | GKV_EA | N | 0
Schlucktherapie | Dysphagietherapie | Schluckstörung | Therapie von Schluckstörungen. | GKV_EA | N | 0
## Podologie
Medizinische Fußpflege | Podologische Komplexbehandlung | Podologe, diabetischer Fuß | Fußbehandlung, v. a. bei Diabetes. | GKV_EA | N | 0
Nagelkorrekturspange | Orthonyxie-Spange | eingewachsener Nagel | Korrektur eingewachsener Nägel. | IND | N | 0
## Ernährung
Ernährungsberatung | Ernährungstherapie | Ernährungsberater, Diät, Abnehmen | Beratung zu gesunder oder therapeutischer Ernährung. | IND | N | 0 | Kassen bezuschussen nach §20/§43 SGB V.
""", gebo="Heilmittel-Richtlinie (GKV) / Privat")

F("Hebammenhilfe", "Hebamme", """
## Hebamme
Schwangerschaftsbetreuung Hebamme | Hebammenvorsorge | Hebamme Schwangerschaft | Vorsorge und Beratung durch die Hebamme. | GKV | N | 0
Geburtsvorbereitungskurs | Geburtsvorbereitung | Geburtsvorbereitungskurs | Kurs zur Vorbereitung auf die Geburt. | GKV | N | 0
Wochenbettbetreuung | Wochenbettbetreuung | Nachsorge Hebamme | Hausbesuche nach der Geburt. | GKV | N | 0
Rückbildungskurs | Rückbildungsgymnastik | Rückbildung | Kurs zur Rückbildung nach der Geburt. | GKV | N | 0
Stillberatung | Stillberatung | Stillen, Stillprobleme | Unterstützung beim Stillen. | GKV | N | 0
""", gebo="Hebammenhilfevertrag (GKV) / Privat")

F("Rehabilitation & Kur", "Reha-Klinik / Kurarzt", """
## Reha
Anschlussheilbehandlung | Anschlussrehabilitation (AHB) | Reha nach OP, AHB | Reha direkt nach Krankenhausaufenthalt. | GKV | N | 4
Orthopädische Reha | Orthopädische Rehabilitation | Reha Rücken, Reha Knie | Reha bei Bewegungsapparat-Erkrankungen. | GKV | N | 4
Kardiologische Reha | Kardiologische Rehabilitation | Herz Reha | Reha nach Herzerkrankungen. | GKV | N | 4
Psychosomatische Reha | Psychosomatische Rehabilitation | Psycho Reha, Burnout Reha | Reha bei psychischen Erkrankungen. | GKV | N | 4
Mutter-/Vater-Kind-Kur | Vorsorge-/Rehamaßnahme für Eltern | Mutter-Kind-Kur | Kur für erschöpfte Eltern mit Kindern. | GKV | N | 4
Ambulante Reha | Ambulante Rehabilitation | Reha ambulant | Reha mit Übernachtung zu Hause. | GKV | N | 3
Reha-Sport | Rehabilitationssport / Funktionstraining | Rehasport | Gruppentraining nach Verordnung. | GKV | N | 0
""", gebo="Kranken-/Rentenversicherung (SGB V/VI)")

F("Pflege", "Pflegedienst / Pflegeeinrichtung", """
## Pflege
Pflegegrad beantragen | Begutachtung durch Medizinischen Dienst | Pflegegrad, Pflegestufe | Unterstützung bei Antrag und Begutachtung. | GKV | N | 0
Häusliche Krankenpflege | Behandlungspflege | Spritzen geben, Wundversorgung zu Hause | Medizinische Pflege zu Hause auf Verordnung. | GKV | N | 0
Ambulanter Pflegedienst | Grundpflege (SGB XI) | Pflegedienst, Körperpflege | Hilfe bei Körperpflege und Alltag. | GKV_EA | N | 0
Tages- und Kurzzeitpflege | Teilstationäre Pflege | Tagespflege, Kurzzeitpflege | Pflege tagsüber oder vorübergehend. | GKV_EA | N | 0
Pflegeheim | Vollstationäre Pflege | Altenheim, Pflegeheim | Dauerhafte Pflege in einer Einrichtung. | GKV_EA | N | 0
Pflegeberatung | Pflegeberatung (§7a SGB XI) | Pflegestützpunkt | Kostenlose Beratung für Pflegebedürftige und Angehörige. | GKV | N | 0
""", gebo="Pflegeversicherung (SGB XI) / SGB V")

F("Hilfsmittel & Gesundheitshandwerk", "Optiker / Hörakustiker / Orthopädietechnik / Sanitätshaus", """
## Hilfsmittel
Brillen & Kontaktlinsen | Augenoptik | Optiker, Brille, Sehtest Optiker | Anpassung von Brillen und Kontaktlinsen. | GKV_EA | N | 0 | Kasse nur bei starker Fehlsichtigkeit.
Hörgeräteanpassung | Hörakustik | Hörakustiker | Anpassung von Hörgeräten. | GKV_EA | N | 0
Orthopädische Einlagen & Schuhe | Orthopädieschuhtechnik | Einlagen, orthopädische Schuhe | Maßgefertigte Einlagen und Schuhe. | GKV_EA | N | 0
Prothesen & Orthesen | Orthopädietechnik | Beinprothese, Orthese | Anfertigung von Prothesen und Orthesen. | GKV_EA | N | 0
Kompressionsstrümpfe | Kompressionstherapie | Stützstrümpfe | Medizinische Kompressionsstrümpfe. | GKV_EA | N | 0
Rollstuhl & Mobilitätshilfen | Mobilitätshilfsmittel | Rollator, Rollstuhl | Versorgung mit Mobilitätshilfen. | GKV_EA | N | 0
""", gebo="Hilfsmittelverzeichnis (GKV) / Privat")

F("Digitale Gesundheit & Apotheke", "Arzt / Apotheke / Anbieter", """
## Digital
Videosprechstunde | Telemedizinische Konsultation | Online-Arzt, Telemedizin | Arztgespräch per Video. | GKV | N | 0
Gesundheits-Apps auf Rezept | DiGA | App auf Rezept, DiGA | Digitale Gesundheitsanwendungen, verordnet vom Arzt. | GKV | N | 0
E-Rezept | Elektronisches Rezept | E-Rezept, eGK Rezept | Rezept digital einlösen. | GKV | N | 0
Elektronische Patientenakte | ePA | ePA, Patientenakte | Digitale Speicherung von Befunden. | GKV | N | 0
Telemonitoring | Telemonitoring | Herz Telemonitoring | Fernüberwachung chronischer Erkrankungen. | GKV | N | 0
## Apotheke
Pharmazeutische Dienstleistungen | pDL (Medikationsberatung, Blutdruckmessung) | Apotheke Blutdruck, Medikationsberatung | Beratungsleistungen der Apotheke. | GKV | N | 0
Impfen in der Apotheke | Apothekenimpfung | Grippeimpfung Apotheke | Grippe- und Corona-Impfung in der Apotheke. | GKV | M | 0
""", gebo="GKV / Privat")


# =====================================================================
# Ergänzung 07.11.2026 (Sorrida): fehlende Leistungen je Fachrichtung
# (Abgleich mit den Fächern in Sorrida). Kostenangaben vorsichtig, Details
# im Hinweis; fachlich gegenlesen lassen.
# =====================================================================

F("Augenheilkunde", "Facharzt Augenheilkunde", """
## Augen
Gesichtsfeldmessung | Perimetrie | Gesichtsfeld, Gesichtsfeldausfall | Prüfung, wie weit Sie zur Seite sehen. | GKV | N | 0
Augenhintergrund-Untersuchung | Funduskopie (mit Pupillenerweiterung) | Augenspiegelung, Netzhaut ansehen | Untersuchung der Netzhaut, etwa bei Diabetes. | GKV | N | 0 | Nach Pupillenerweiterung einige Stunden nicht Auto fahren.
Netzhaut-Laser | Laserkoagulation der Netzhaut | Netzhautloch, Netzhautriss Laser | Laser gegen Netzhautrisse oder Gefäßneubildungen. | GKV | M | 0
Nachstar-Behandlung | YAG-Laser-Kapsulotomie | Nachstar, wieder schlechter sehen nach Grauer Star OP | Laser bei Eintrübung nach einer Grauen-Star-OP. | GKV | M | 0
Hornhaut-Vernetzung | Corneales Crosslinking | Keratokonus, Hornhautverkrümmung | Stabilisierung der Hornhaut bei Keratokonus. | IND | M | 2
Sehtest für den Führerschein (Augenarzt) | Augenärztliches Gutachten Fahrerlaubnis | Sehtest Führerschein Augenarzt, LKW Augen | Bescheinigung über das Sehvermögen. | SZ | N | 0
""")

F("Dermatologie (medizinisch)", "Facharzt Dermatologie", """
## Haut
Starkes Schwitzen | Hyperhidrose-Behandlung | Schwitzen, Leitungswasser-Iontophorese, Achselschweiß | Behandlung von übermäßigem Schwitzen. | IND | N | 0 | Leitungswasser-Iontophorese oft Kassenleistung, Botulinum meist Selbstzahler.
Vorstufen von hellem Hautkrebs | Behandlung aktinischer Keratosen (Kryo, PDT, Creme) | aktinische Keratose, Lichtschaden | Behandlung rauer, lichtgeschädigter Hautstellen. | IND | M | 1
Chronische Wunden | Behandlung chronischer Wunden | offenes Bein, Ulcus cruris | Versorgung schlecht heilender Wunden. | GKV | M | 0
Gefäßlaser | Lasertherapie von Gefäßveränderungen | Feuermal, Besenreiser Gesicht, Couperose | Laser bei erweiterten Äderchen. | IND | M | 1 | Kasse vor allem bei Feuermalen; kosmetische Gründe zahlen Sie selbst.
""")

F("Kinder- & Jugendmedizin", "Facharzt Kinder- und Jugendmedizin", """
## Kinderheilkunde
Asthma bei Kindern | Asthmatherapie im Kindesalter | Kinder Asthma, pfeifende Atmung | Diagnose, Einstellung und Schulung. | GKV | N | 0
ADHS bei Kindern | ADHS-Diagnostik und -Therapie im Kindesalter | ADHS Kind, Zappelphilipp, Konzentration Schule | Abklärung und Behandlung von ADHS. | GKV | N | 0
Übergewicht bei Kindern | Adipositastherapie im Kindesalter | dickes Kind, Gewicht Kind | Beratung und Programme für Familien. | IND | N | 0
Bettnässen | Enuresis-Behandlung | Bettnässen, Einnässen | Abklärung und Behandlung. | GKV | N | 0
Kinder-Herzuntersuchung | Kinderkardiologische Untersuchung | Herzgeräusch Kind, Herz Ultraschall Kind | Ultraschall und EKG des Kinderherzens. | GKV | N | 0
""")

F("Urologie & Andrologie", "Facharzt Urologie", """
## Urologie
Prostatakrebs-Behandlung | Radikale Prostatektomie / Strahlentherapie bei Prostatakarzinom | Prostatakrebs OP, Prostata entfernen | Behandlung von Prostatakrebs. | GKV | O | 4 | Bei lokal begrenztem Prostatakarzinom Anspruch auf Zweitmeinung (§ 27b SGB V).
Harnröhrenverengung | Urethrotomie / Harnröhrenplastik | schwacher Harnstrahl, Harnröhrenstriktur | Erweiterung einer verengten Harnröhre. | GKV | O | 2
Botox in die Blase | Botulinumtoxin-Injektion in die Harnblase | überaktive Blase, Dranginkontinenz | Spritzen in die Blasenwand bei Reizblase. | GKV | M | 0
Kinderurologie | Kinderurologische Eingriffe | Hodenhochstand, Vorhautverengung Kind | Behandlung urologischer Probleme bei Kindern. | GKV | O | 2
Magnetstimulation des Beckenbodens | Extrakorporale Magnetstimulation | Beckenbodenstuhl, Magnetstuhl | Training der Beckenbodenmuskulatur im Sitzen. | SZ | N | 0
""")

F("HNO (Hals-Nasen-Ohren)", "Facharzt HNO-Heilkunde", """
## HNO
Hörsturz-Behandlung | Therapie des Hörsturzes | Hörsturz, plötzlich taub | Rasche Behandlung bei plötzlichem Hörverlust. | GKV | N | 0
Riech- und Schmeckstörung | Diagnostik von Riech- und Schmeckstörungen | nichts riechen, Geruchsverlust | Abklärung und Riechtraining. | GKV | N | 0
Nasenbluten-Behandlung | Verödung bei Nasenbluten | häufiges Nasenbluten | Verödung blutender Gefäße in der Nase. | GKV | M | 0
Gleichgewichtsprüfung | Vestibularisdiagnostik | Drehschwindel, Gleichgewicht Ohr | Prüfung des Gleichgewichtsorgans. | GKV | N | 0
Cochlea-Implantat | Cochlea-Implantation | Innenohr Implantat, taub | Hörimplantat bei hochgradiger Schwerhörigkeit. | GKV | O | 4
""")

F("Neurologie", "Facharzt Neurologie", """
## Neurologie
Restless Legs | Behandlung des Restless-Legs-Syndroms | unruhige Beine, Kribbeln Beine nachts | Behandlung unruhiger Beine. | GKV | N | 0
Polyneuropathie | Polyneuropathie-Diagnostik | Kribbeln Füße, taube Füße | Abklärung von Nervenschäden an Händen und Füßen. | GKV | N | 0
Botulinumtoxin bei Spastik und Dystonie | Botulinumtoxin-Therapie (neurologisch) | Spastik, Schiefhals, Lidkrampf | Spritzen gegen Muskelverkrampfungen. | GKV | M | 0
""")

F("Innere Medizin", "Facharzt Innere Medizin / Diabetologie", """
## Endokrinologie & Diabetologie
Glukosesensor | Kontinuierliche Glukosemessung (CGM) | Zuckersensor, Sensor am Arm | Ein Sensor misst den Zucker laufend. | IND | N | 0 | Kasse bei intensivierter Insulintherapie.
Diabetes-Schulung | Strukturierte Diabetesschulung | Diabetes Kurs, Schulung Insulin | Kurs zum Umgang mit Diabetes. | GKV | N | 0
""")

F("Therapieberufe (Heilmittel)", "Physiotherapeut / Ergotherapeut / Logopäde / Podologe", """
## Physiotherapie
Atemtherapie | Atemtherapie (Physiotherapie) | Atemgymnastik, COPD Physio | Übungen für leichteres Atmen. | GKV_EA | N | 0
Kiefergelenk-Physiotherapie | Physiotherapie bei CMD | Kiefer, Zähneknirschen, CMD | Behandlung von Kiefergelenk und Kaumuskeln. | GKV_EA | N | 0 | Verordnung auch durch Zahnärzte.
Physiotherapie als Hausbesuch | Physiotherapie im Hausbesuch | Physio zu Hause | Behandlung zu Hause, wenn der Weg nicht möglich ist. | GKV_EA | N | 0
## Ergotherapie
Hirnleistungstraining | Hirnleistungstraining (Ergotherapie) | Gedächtnistraining, Konzentrationstraining | Training nach Schlaganfall oder bei Demenz. | GKV_EA | N | 0
Sensorische Integration | Ergotherapie bei Kindern (Sensorische Integration) | Ergo Kind, Wahrnehmung | Förderung von Wahrnehmung und Bewegung bei Kindern. | GKV_EA | N | 0
## Logopädie
Stimmtraining für Sprechberufe | Stimmbildung / Stimmtraining | Stimme Lehrer, Sprechtraining | Training für eine belastbare Stimme. | SZ | N | 0
Myofunktionelle Therapie | Myofunktionelle Therapie | Zungenfehlstellung, Lispeln, offener Mund | Training von Zunge und Mundmuskulatur. | GKV_EA | N | 0
## Podologie
Hühneraugen und Hornhaut | Entfernung von Hühneraugen und Schwielen | Hühnerauge, Hornhaut | Schonende Entfernung, ohne Verordnung. | SZ | N | 0
Nagelprothetik | Nagelprothetik | Nagel aufbauen, Nagelersatz | Kunstnagel nach Nagelverlust oder Pilz. | SZ | N | 0
Kosmetische Fußpflege | Fußpflege ohne Verordnung | Fußpflege, Pediküre | Pflege von Nägeln und Haut. | SZ | N | 0
""", gebo="Heilmittel-Richtlinie (GKV) / Privat")

F("Hebammenhilfe", "Hebamme", """
## Hebamme
Hilfe bei Beschwerden in der Schwangerschaft | Hebammenhilfe bei Schwangerschaftsbeschwerden | Übelkeit Schwangerschaft, Wehen, Rückenschmerzen Schwangerschaft | Beratung und Hilfe durch die Hebamme. | GKV | N | 0
Hausgeburt oder Geburtshaus | Außerklinische Geburtshilfe | Hausgeburt, Geburtshaus | Geburt mit Hebamme außerhalb der Klinik. | GKV_EA | N | 1 | Die Rufbereitschaft zahlen Eltern oft selbst; manche Kassen erstatten sie.
Beleggeburt | Geburt mit Beleghebamme | Beleghebamme, eigene Hebamme Klinik | Ihre Hebamme begleitet Sie in der Klinik. | GKV_EA | N | 1 | Rufbereitschaft oft privat.
Babymassage und Babykurse | Kurse für Eltern mit Säugling | Babymassage, Babykurs | Kurse im ersten Lebensjahr. | SZ | N | 0
Akupunktur zur Geburtsvorbereitung | Geburtsvorbereitende Akupunktur | Akupunktur Schwangerschaft | Nadeln in den letzten Schwangerschaftswochen. | SZ | M | 0
""", gebo="Hebammenhilfevertrag (GKV) / Privat")

F("Pflege", "Pflegedienst / Pflegeeinrichtung", """
## Pflege
Verhinderungspflege | Verhinderungspflege (§ 39 SGB XI) | Ersatzpflege, Urlaub pflegende Angehörige | Vertretung, wenn Angehörige verhindert sind. | GKV | N | 0 | Ab Pflegegrad 2; gemeinsamer Jahresbetrag mit der Kurzzeitpflege.
Entlastungsbetrag | Angebote zur Unterstützung im Alltag (§ 45b SGB XI) | Haushaltshilfe, Betreuung, Alltagsbegleitung | Betreuung und Hilfe im Haushalt. | GKV | N | 0 | 131 € im Monat ab Pflegegrad 1.
Beratungsbesuch für Pflegegeld | Beratungseinsatz (§ 37 Abs. 3 SGB XI) | Pflichtberatung Pflegegeld | Pflichtbesuch für Pflegegeldbezieher. | GKV | N | 0 | Pflegegrad 2 und 3 halbjährlich, 4 und 5 vierteljährlich.
Hausnotruf | Hausnotrufsystem | Notrufknopf, Notrufarmband | Hilfe per Knopfdruck. | GKV_EA | N | 0 | Die Pflegekasse zahlt einen Zuschuss ab Pflegegrad 1.
Wohnraumanpassung | Wohnumfeldverbessernde Maßnahmen (§ 40 Abs. 4 SGB XI) | Badumbau, Treppenlift, Türen verbreitern | Umbauten für die Pflege zu Hause. | GKV_EA | N | 0 | Zuschuss je Maßnahme.
Pflegehilfsmittel zum Verbrauch | Pflegehilfsmittel nach § 40 SGB XI | Handschuhe, Desinfektion, Bettschutz | Monatliche Versorgung für die Pflege zu Hause. | GKV | N | 0 | Bis 42 € im Monat ab Pflegegrad 1.
24-Stunden-Betreuung | Betreuung im Haushalt rund um die Uhr | 24h Pflege, Betreuungskraft | Eine Betreuungskraft lebt im Haushalt. | SZ | N | 0
""", gebo="Pflegeversicherung (SGB XI) / SGB V")

F("Digitale Gesundheit & Apotheke", "Apotheke", """
## Apotheke
Medikationsberatung bei vielen Arzneimitteln | Erweiterte Medikationsberatung bei Polymedikation (pDL) | Wechselwirkungen prüfen, fünf Medikamente | Prüfung aller Dauermedikamente auf Wechselwirkungen und Doppelungen. | GKV | N | 0 | Ab fünf Dauermedikamenten, in der Regel einmal in zwölf Monaten.
Blutdruckmessung in der Apotheke | Standardisierte Risikoerfassung hoher Blutdruck (pDL) | Blutdruck messen Apotheke | Messung nach Standard bei Blutdruckmedikamenten. | GKV | N | 0
Inhalationsschulung | Erweiterte Einweisung in die korrekte Arzneimittelanwendung mit Übung der Inhalationstechnik (pDL) | Asthmaspray richtig anwenden, Inhalator | Üben mit dem Inhalator bei Asthma oder COPD. | GKV | N | 0
Betreuung nach Organtransplantation | Pharmazeutische Betreuung von Organtransplantierten (pDL) | Transplantation Medikamente | Medikationsberatung nach einer Transplantation. | GKV | N | 0
Betreuung bei Krebstherapie mit Tabletten | Pharmazeutische Betreuung bei oraler Antitumortherapie (pDL) | Krebs Tabletten Beratung | Begleitung bei Krebstherapie zum Einnehmen. | GKV | N | 0
Arzneimittel auf Rezept | Abgabe verschreibungspflichtiger Arzneimittel | Rezept einlösen, Medikamente holen | Abgabe mit Beratung. | GKV_EA | N | 0 | Zuzahlung 10 %, mindestens 5 €, höchstens 10 € je Mittel.
Rezeptfreie Arzneimittel | Beratung in der Selbstmedikation | rezeptfrei, Erkältungsmittel, Schmerzmittel | Beratung und Verkauf ohne Rezept. | SZ | N | 0
Botendienst | Arzneimittel-Botendienst | Lieferung nach Hause, Medikamente bringen | Lieferung von Arzneimitteln nach Hause. | GKV | N | 0 | Für Rezeptarzneimittel trägt die Kasse die Botendienstpauschale; für Rezeptfreies kann eine Gebühr anfallen.
Wochenblister | Patientenindividuelle Verblisterung | Tablettenbox, Medikamente stellen | Arzneimittel nach Einnahmezeit verpackt. | SZ | N | 0
Kompressionsstrümpfe anmessen | Maßnehmen für medizinische Kompressionsstrümpfe | Stützstrümpfe Apotheke | Messen und Anpassen auf Rezept. | GKV_EA | N | 0
Blutzucker- und Cholesterintest | Gesundheitscheck in der Apotheke | Blutzucker messen, Cholesterin Schnelltest | Schnelltest aus einem Tropfen Blut. | SZ | N | 0
Rezepturen | Herstellung individueller Rezepturen | Salbe anrühren, Kapseln herstellen | Arzneimittel nach ärztlicher Verordnung hergestellt. | GKV_EA | N | 0
""", gebo="Arzneimittelpreisverordnung / pDL-Vereinbarung / Privat")

F("Hilfsmittel & Gesundheitshandwerk", "Augenoptiker/in", """
## Augenoptik
Sehtest beim Optiker | Augenglasbestimmung | Sehtest, Sehstärke messen | Bestimmung der Sehstärke für Brille oder Kontaktlinsen. | SZ | N | 0 | Ersetzt keine augenärztliche Untersuchung.
Kinderbrille | Brillengläser bis 18 Jahre | Brille Kind | Gläser für Kinder und Jugendliche. | GKV_EA | N | 0 | Kasse zahlt Gläser bis 18 Jahre bis zum Festbetrag; die Fassung zahlen Sie selbst.
Kontaktlinsenanpassung | Anpassung von Kontaktlinsen | Linsen anpassen, Probelinsen | Ausmessen, Probetragen und Kontrolle. | SZ | N | 0 | Kasse nur bei bestimmten Augenerkrankungen.
Sportbrille und Schutzbrille | Sport- und Arbeitsschutzbrille mit Sehstärke | Sportbrille, Schutzbrille | Brille für Sport oder Beruf. | SZ | N | 0 | Arbeitsschutzbrillen zahlt oft der Arbeitgeber.
Vergrößernde Sehhilfen | Versorgung mit vergrößernden Sehhilfen | Lupe, Lupenbrille, Bildschirmlesegerät | Hilfen bei starker Sehschwäche. | GKV_EA | N | 0
""", gebo="Hilfsmittelverzeichnis (GKV) / Privat")

F("Hilfsmittel & Gesundheitshandwerk", "Hörakustiker/in", """
## Hörakustik
Hörtest beim Hörakustiker | Ton- und Sprachaudiometrie | Hörtest kostenlos | Hörtest ohne Rezept. | SZ | N | 0 | Für eine Versorgung über die Kasse braucht es eine ärztliche Verordnung.
Gehörschutz nach Maß | Individueller Gehörschutz (Otoplastik) | Musiker Gehörschutz, Schlafen, Lärm | Angepasster Schutz aus einem Ohrabdruck. | SZ | N | 0
Tinnitus-Versorgung | Hörsystem mit Rauschgenerator | Tinnitus Gerät, Noiser | Geräte gegen Ohrgeräusche. | GKV_EA | N | 0
Hörgeräte-Service | Nachsorge und Reparatur von Hörsystemen | Hörgerät reparieren, reinigen | Reinigung, Kontrolle und Reparatur. | GKV | N | 0 | Bei Kassenversorgung meist in der Versorgungspauschale enthalten.
""", gebo="Hilfsmittelverzeichnis (GKV) / Privat")

F("Hilfsmittel & Gesundheitshandwerk", "Sanitätshaus / Orthopädietechnik", """
## Sanitätshaus
Bandagen | Bandagenversorgung | Kniebandage, Sprunggelenk Bandage | Stützende Bandagen auf Rezept. | GKV_EA | N | 0
Pflegebett | Pflegebett für zu Hause | Pflegebett mieten | Pflegebett, meist leihweise. | GKV | N | 0 | Kostenträger je nach Fall Kranken- oder Pflegekasse.
Brustprothetik | Brustprothesen und Spezial-BH | Brustprothese nach Krebs | Versorgung nach einer Brustoperation. | GKV_EA | N | 0
Stomaversorgung | Stoma-Hilfsmittel | Stoma, künstlicher Darmausgang | Beutel, Platten und Beratung. | GKV_EA | N | 0
Inkontinenzhilfen | Aufsaugende Inkontinenzhilfsmittel | Inkontinenzeinlagen, Windeln Erwachsene | Versorgung bei Blasenschwäche. | GKV_EA | N | 0
Milchpumpe | Elektrische Milchpumpe (Miete) | Milchpumpe leihen | Milchpumpe auf Rezept. | GKV | N | 0
Hilfen für Bad und Wohnung | Hilfsmittel für Bad und Toilette | Badewannenlift, Toilettensitzerhöhung, Duschhocker | Hilfen für einen sicheren Alltag. | GKV_EA | N | 0
""", gebo="Hilfsmittelverzeichnis (GKV) / Privat")

F("Naturheilkunde & Komplementärmedizin", "Heilpraktiker / Arzt mit Zusatzbezeichnung", """
## Komplementär
Erstgespräch beim Heilpraktiker | Ausführliche Anamnese | Heilpraktiker Termin | Ausführliches Gespräch und Untersuchung. | SZ | N | 0 | Private Zusatzversicherungen erstatten teilweise.
Fußreflexzonenmassage | Reflexzonentherapie am Fuß | Reflexzonen | Massage bestimmter Zonen am Fuß. | SZ | N | 0 | Wirksamkeit wissenschaftlich nicht belegt – keine Heilversprechen.
Craniosacrale Behandlung | Craniosacrale Therapie | Cranio, sanfte Osteopathie | Sanfte manuelle Behandlung an Kopf und Rücken. | SZ | N | 0 | Wirksamkeit wissenschaftlich nicht belegt – keine Heilversprechen.
""")

F("Krankenhaus & Wahlleistungen", "Krankenhaus", """
## Krankenhaus
Stationäre Behandlung | Krankenhausbehandlung | Krankenhaus, stationär, Aufnahme | Behandlung mit Übernachtung im Krankenhaus. | GKV_EA | N | 0 | Zuzahlung 10 € pro Tag, höchstens 28 Tage im Kalenderjahr.
Ambulante Operation im Krankenhaus | Ambulantes Operieren im Krankenhaus | ambulante OP Klinik | Eingriff ohne Übernachtung. | GKV | O | 1
Übergangspflege | Übergangspflege im Krankenhaus | Pflege nach dem Krankenhaus | Pflege in der Klinik, wenn sie zu Hause noch nicht möglich ist. | GKV | N | 0
## Wahlleistungen
Einbettzimmer | Wahlleistung Unterkunft (Einbettzimmer) | Einzelzimmer Krankenhaus | Eigenes Zimmer gegen Aufpreis. | PKV | N | 0 | Zahlen viele private Zusatzversicherungen.
Zweibettzimmer | Wahlleistung Unterkunft (Zweibettzimmer) | Doppelzimmer Krankenhaus | Zimmer mit höchstens einer weiteren Person. | PKV | N | 0
Chefarztbehandlung | Wahlärztliche Leistungen | Chefarzt, Privatbehandlung Krankenhaus | Behandlung durch die Chefärztin oder den Chefarzt. | PKV | N | 0 | Abrechnung nach GOÄ; vorher schriftlich vereinbaren.
Begleitperson | Mitaufnahme einer Begleitperson | Rooming-in, Eltern im Krankenhaus | Eine Begleitperson übernachtet mit. | IND | N | 0 | Kasse zahlt, wenn medizinisch nötig, etwa bei kleinen Kindern.
""", gebo="DRG / Wahlleistungsvereinbarung (GOÄ)")

F("Therapieberufe (Heilmittel)", "Ergotherapeut / Logopäde / Podologe", """
## Ergotherapie
Motorisch-funktionelle Ergotherapie | Motorisch-funktionelle Behandlung | Feinmotorik, Beweglichkeit Hände | Training von Bewegung und Geschicklichkeit im Alltag. | GKV_EA | N | 0
Psychisch-funktionelle Ergotherapie | Psychisch-funktionelle Behandlung | Ergotherapie Depression, Tagesstruktur | Hilfe bei Antrieb, Tagesstruktur und Belastbarkeit. | GKV_EA | N | 0
Ergotherapie als Hausbesuch | Ergotherapie im Hausbesuch | Ergo zu Hause | Behandlung zu Hause, wenn der Weg nicht möglich ist. | GKV_EA | N | 0
## Logopädie
Stottertherapie | Redeflusstherapie | Stottern, Poltern | Therapie bei Stottern und Poltern. | GKV_EA | N | 0
Aphasietherapie | Sprachtherapie nach Schlaganfall | Aphasie, Sprache nach Schlaganfall | Wiedererlernen von Sprechen und Verstehen. | GKV_EA | N | 0
Stimmtherapie | Therapie bei Stimmstörungen | Heiserkeit, Stimmstörung | Therapie bei kranker oder überlasteter Stimme auf Rezept. | GKV_EA | N | 0
Logopädie als Hausbesuch | Logopädie im Hausbesuch | Logopädie zu Hause | Behandlung zu Hause, wenn der Weg nicht möglich ist. | GKV_EA | N | 0
## Podologie
Podologie bei Nervenschäden | Podologische Therapie bei Neuropathie oder Querschnittsyndrom | Fußpflege Neuropathie, gefühllose Füße | Fußbehandlung auf Rezept bei Nervenschäden. | GKV_EA | N | 0
Druckentlastung am Fuß | Orthesen aus Silikon (Druckschutz) | Zehenkorrektur, Druckstelle Zeh | Angepasste Polster gegen Druckstellen. | SZ | N | 0
""", gebo="Heilmittel-Richtlinie (GKV) / Privat")

F("Hilfsmittel & Gesundheitshandwerk", "Augenoptiker/in", """
## Augenoptik
Bildschirmarbeitsplatzbrille | Bildschirmarbeitsplatzbrille | Computerbrille, Büro Brille | Brille für den Abstand zum Bildschirm. | SZ | N | 0 | Bei ärztlicher Bescheinigung zahlt oft der Arbeitgeber.
Brillen-Service | Anpassung und Reparatur von Brillen | Brille richten, Brille reparieren | Nachanpassen, Reinigen und kleine Reparaturen. | SZ | N | 0
""", gebo="Hilfsmittelverzeichnis (GKV) / Privat")

F("Hilfsmittel & Gesundheitshandwerk", "Hörakustiker/in", """
## Hörakustik
Hörgeräte für Kinder | Kinderhörsystem-Versorgung (Pädakustik) | Hörgerät Kind | Hörversorgung für Kinder und Jugendliche. | GKV | N | 0
Hörgeräte-Zubehör | Zubehör für Hörsysteme | Akkus, Batterien, Streamer, Ladegerät | Batterien, Akkus und Verbindungszubehör. | SZ | N | 0
""", gebo="Hilfsmittelverzeichnis (GKV) / Privat")
