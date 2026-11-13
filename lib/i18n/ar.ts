import type { PatientLocale, Ui } from "./types";
import { gruppiert, NBSP } from "./format";

// العربية (Hocharabisch, von rechts nach links). Höfliche Anrede in der
// Mehrzahlform (‑كم), die zugleich geschlechtsneutral ist. Ziffern bleiben
// lateinisch, Beträge stehen als „2,088 €“ in einer links-nach-rechts-Insel.
// Begriffe: التأمين الصحي (Krankenkasse), حصتكم (Eigenanteil), الدعم الثابت
// (Festzuschuss), خطة العلاج والتكاليف (Heil- und Kostenplan), العلاج القياسي
// (Regelversorgung), التأمين الإضافي (Zusatzversicherung), المساهمة القانونية
// (gesetzliche Zuzahlung), العيادة (Praxis).

/** Links-nach-rechts-Insel (LRI … PDI): hält Zahl und € in jeder Umgebung zusammen und in Leserichtung. */
const ltr = (s: string) => `⁦${s}⁩`;
/** Unsichtbare Links-nach-rechts-Marke vor lateinischem Text, der mit einem Zeichen wie „§“ beginnt. */
const LRM = "‎";

const tage = (n: number) => (n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n >= 3 && n <= 10 ? `${n} أيام` : `${n} يومًا`);
/** „35, 36“ → „35، 36“ */
const liste = (s: string) => s.replace(/, /g, "، ");

const ui: Ui = {
  pageTitle: "مقترح العلاج الخاص بكم",
  hello: (name) => `مرحبًا ${name}، هذا مقترح العلاج الخاص بكم`,
  intro: (arzt) =>
    `يمكنكم الاطلاع بهدوء على الخيارات المتاحة وتكلفتها عليكم. اضغطوا على أحد الخيارات لرؤية حصتكم من التكاليف. لا يُتخذ القرار إلا بعد الحديث ${arzt ? "في عيادتكم" : "مع طبيب أسنانكم"}.`,
  kasseWenn: "يدفع التأمين الصحي:",
  nutzen: "عن الفائدة:",
  fineMed: (until) =>
    `تقدير غير ملزم للتكاليف وفق لائحة أتعاب الأطباء الألمانية (Gebührenordnung für Ärzte, GOÄ). الخدمات التي يدفعها المريض بنفسه (IGeL) اختيارية؛ قبل تقديم الخدمة نبرم معكم اتفاقًا كتابيًا. خذوا وقتكم في اتخاذ القرار. هذا الرابط صالح حتى ${until}.`,
  deadlineTitle: "مهم للتيجان والجسور وأطقم الأسنان:",
  deadline: (days) =>
    `اعتبارًا من عام 2027 ستدفع صناديق التأمين الصحي القانوني مبلغًا أقل. إذا تمت الموافقة على خطة العلاج والتكاليف (Heil- und Kostenplan) حتى 31.12.2026 (بعد ${tage(days)})، فستوفّرون مع اختياركم نحو`,
  optionsFor: (t) => `خيارات: ${t}`,
  recommended: "التوصية",
  yourShare: "حصتكم",
  total: "الإجمالي",
  insurerGkv: "التأمين الصحي",
  insurerPkv: "التأمين",
  supplementary: "التأمين الإضافي تقريبًا",
  from2027: "عند الموافقة اعتبارًا من 2027:",
  coPayment: "المساهمة القانونية",
  nextTitle: "كيف تودّون المتابعة؟",
  thanks: "شكرًا لكم، لقد استلمت عيادتكم ردّكم وستتواصل معكم. يمكنكم إعادة إرسال اختياركم من هنا في أي وقت.",
  change: "تغيير الاختيار",
  noteLabel: "سؤال أو موعد مفضّل (اختياري)",
  notePlaceholder: "مثلًا: أفضل وقت للاتصال بي بعد الظهر.",
  installmentsInterest: "أرغب في معرفة المزيد عن الدفع بالتقسيط",
  discuss: "مناقشة هذا الاختيار",
  callMe: "الرجاء الاتصال بي",
  callMeLead: "هل تفضّلون التحدث مباشرة؟",
  pick: "الرجاء اختيار أحد الخيارات.",
  open: (n) => `بقي للاختيار: ${n}`,
  missing: (titles) => `الرجاء اختيار ما يلي أيضًا: ${titles}.`,
  optional: "اختياري. اضغطوا إذا رغبتم في ذلك؛ واضغطوا مرة أخرى لإلغاء الاختيار.",
  fineTherapie: (until) =>
    `تقدير غير ملزم للتكاليف وفق قائمة أسعار عيادتكم. الخدمات التي يدفعها المريض بنفسه اختيارية؛ قبل العلاج نتفق معكم عليها كتابيًا. تسري المساهمة القانونية على الخدمات المقدَّمة بوصفة طبية. هذا الرابط صالح حتى ${until}.`,
  seeRec: "هنا ترون توصيتنا",
  recTitle: "توصيتنا للمقارنة",
  recIntro: "للمراجعة: اختياركم بجانب ما كانت عيادتكم ستوصي به. القرار لكم بكل حرية.",
  yourChoice: "اختياركم",
  ourRec: "التوصية",
  notChosen: "لم يتم الاختيار بعد",
  same: "مطابق للتوصية",
  why: "السبب:",
  variants: "نظرة عامة على ثلاثة خيارات",
  vYours: "اختياركم",
  vRec: "حسب التوصية",
  vLow: "أقل حصة ذاتية",
  takeRec: "اعتماد التوصية",
  keepMine: "الإبقاء على اختياري",
  close: "إغلاق",
  sendFailed: "تعذّر الإرسال. الرجاء المحاولة مرة أخرى أو الاتصال بالعيادة.",
  fine: (gkv, until) =>
    `تقدير غير ملزم للتكاليف. الملزم هو خطة العلاج والتكاليف (Heil- und Kostenplan) أو الاتفاق مع عيادتكم.${gkv ? " في التيجان والجسور وأطقم الأسنان تتحدد حصة التأمين الصحي حسب تاريخ موافقة صندوق تأمينكم الصحي." : ""} المبالغ التي يعوّضها تأمينكم الإضافي تقديرية. هذا الرابط صالح حتى ${until}.`,
  installmentsFine: (provider) =>
    ` الدفع بالتقسيط بدون فوائد${provider ? ` عبر ${provider}` : ""}، وقد تم تقريب القسط المذكور كمثال إلى الأعلى؛ التفاصيل يحددها الاتفاق مع عيادتكم.`,
  barLabel: "حصتكم لهذا الاختيار",
  rate: (months, monthly) => `أو ${months} × ${monthly} بدون فوائد`,
  ask: "الدفع بالتقسيط ممكن، تواصلوا معنا",
  bar2027: "عند الموافقة اعتبارًا من 2027:",
  back: "العودة إلى مسار علاجكم",
  langLabel: "اللغة",
  langNote: "هذه الترجمة للمساعدة على الفهم فقط. المرجع هو النص الألماني والحديث في العيادة.",
  contentNote: "بعض أسماء الخدمات وشروحها متوفرة باللغة الألمانية فقط. إذا كان هناك ما هو غير واضح، يُرجى السؤال في عيادتكم.",
  germanOnlyNote: "القسم التالي (مقارنة الرأي الطبي الثاني) متوفر حاليًا باللغة الألمانية فقط.",
  expiredTitle: "هذا الرابط لم يعد صالحًا",
  expiredText: "لأسباب تتعلق بحماية البيانات، روابط المرضى صالحة لفترة محدودة فقط. يُرجى طلب رابط جديد من عيادتكم.",
  goneTitle: "هذا المقترح غير متاح",
  goneText: "يُرجى الاستفسار في عيادتكم.",
};

const content: Record<string, string> = {
  // Befunde
  "Alte Füllung defekt": "حشوة قديمة تالفة",
  "Entzündeter Nerv": "التهاب عصب السن",
  "Karies, 1–2 Flächen": "تسوس يشمل من 1 إلى 2 من أسطح السن",
  "Karies, ab 3 Flächen": "تسوس يشمل 3 أسطح أو أكثر",
  "Knirschen oder Pressen": "صرير الأسنان أو الضغط عليها",
  "Parodontitis (PSI-Code 3 oder 4)": "التهاب دواعم السن (رمز PSI 3 أو 4)",
  "Patient wünscht hellere Zähne": "ترغبون في أسنان أكثر بياضًا",
  "Stark zerstört, Krone nötig": "متضرر بشدة، يلزم تاج",
  "Wurzelbehandelt, Krone mit Stiftaufbau nötig": "معالَج الجذور، يلزم تاج مع وتد داعم",
  "Großer Defekt, Zahnwand erhalten (Teilkrone)": "تلف كبير مع بقاء جدار السن (تاج جزئي)",
  "Krone mit Stiftaufbau, Regelversorgung": "تاج مع وتد داعم، العلاج القياسي",
  "Krone mit Stiftaufbau, Standardausführung": "تاج مع وتد داعم، النوع القياسي",
  "Vollkeramik-Krone mit Stiftaufbau": "تاج خزفي كامل مع وتد داعم",
  "Teilkrone aus Metall, Regelversorgung": "تاج جزئي معدني، العلاج القياسي",
  "Teilkrone aus Metall, Standardausführung": "تاج جزئي معدني، النوع القياسي",
  "Keramik-Teilkrone": "تاج جزئي خزفي",
  "erhält die gesunde Zahnwand": "يحافظ على جدار السن السليم",
  "Der Stiftaufbau gibt der Krone Halt, wenn vom Zahn zu wenig übrig ist. Die Kasse gibt dafür einen eigenen Festzuschuss.":
    "الوتد الداعم يثبّت التاج عندما يكون المتبقي من السن قليلًا جدًا. يقدّم التأمين الصحي لذلك دعمًا ثابتًا مستقلًا (Festzuschuss).",
  "Der Stiftaufbau gibt der Krone Halt, wenn vom Zahn zu wenig übrig ist.": "الوتد الداعم يثبّت التاج عندما يكون المتبقي من السن قليلًا جدًا.",
  "Eine Teilkrone schont mehr Zahnsubstanz als eine Vollkrone. Sie kommt infrage, solange die äußere oder innere Zahnwand stabil ist.":
    "التاج الجزئي يحافظ على قدر أكبر من مادة السن مقارنةً بالتاج الكامل. وهو خيار ممكن ما دام الجدار الخارجي أو الداخلي للسن متينًا.",
  "Bei Knirschen Material und Schichtstärke der Keramik darauf abstimmen.": "في حالة صرير الأسنان يُختار نوع الخزف وسماكته بما يناسب ذلك.",
  "Tiefe Fissuren, kariesfrei": "شقوق عميقة، بدون تسوس",
  "Zahn fehlt": "سن مفقود",
  "Zahnstein und Beläge": "جير الأسنان والترسبات",
  Raucher: "التدخين",
  Allgemein: "عام",
  // Optionen
  Aufbissschiene: "واقي الأسنان الليلي (جبيرة العضّ)",
  Bleaching: "تبييض الأسنان",
  "Brücke, Regelversorgung": "جسر، العلاج القياسي",
  Fissurenversiegelung: "سدّ شقوق الأسنان",
  "Implantat mit Krone": "زرعة مع تاج",
  "Kassenfüllung (selbstadhäsiv)": "حشوة على نفقة التأمين الصحي (ذاتية الالتصاق)",
  "Keramik-Inlay": "حشوة خزفية مصبوبة (إنلاي)",
  "Komposit-Füllung": "حشوة كومبوزيت",
  "Krone, Regelversorgung": "تاج، العلاج القياسي",
  "Mehrschicht-Komposit, adhäsiv": "كومبوزيت متعدد الطبقات، بتقنية اللصق",
  "Parodontitis-Behandlung mit Nachsorge": "علاج التهاب دواعم السن مع المتابعة",
  "Professionelle Zahnreinigung": "تنظيف الأسنان الاحترافي",
  "Teilprothese (Modellguss)": "طقم أسنان جزئي (بهيكل معدني مصبوب)",
  "Vollkeramik-Brücke": "جسر خزفي كامل",
  "Vollkeramik-Krone": "تاج خزفي كامل",
  "Wurzelbehandlung mit Endo-Zusatz": "علاج الجذور مع خدمات إضافية متخصصة",
  "Wurzelbehandlung, Kassenleistung": "علاج الجذور، على نفقة التأمين الصحي",
  Zahnsteinentfernung: "إزالة جير الأسنان",
  // Vorteile
  "Ergebnis hält 1–3 Jahre": "تدوم النتيجة من 1 إلى 3 سنوات",
  "Festzuschuss wie Regelversorgung": "الدعم الثابت نفسه (Festzuschuss) كما في العلاج القياسي",
  "Kasse zahlt Grundleistung": "التأمين الصحي يدفع العلاج الأساسي",
  "Kasse zahlt Kassenfüllung anteilig": "التأمين الصحي يدفع ما يعادل تكلفة الحشوة القياسية",
  Kassenleistung: "على نفقة التأمين الصحي",
  "Kassenleistung bis 17 Jahre": "على نفقة التأمين الصحي حتى سن 17 عامًا",
  "Kassenleistung inklusive Nachsorge (UPT)": "على نفقة التأمين الصحي، شاملةً المتابعة (UPT)",
  "Kieferknochen bleibt belastet": "يبقى عظم الفك تحت التحميل الطبيعي",
  "Metall mit Keramikverblendung": "معدن مع تلبيس خزفي",
  "Metall mit Keramikverblendung auf der sichtbaren Seite": "معدن مع تلبيس خزفي على الجهة الظاهرة",
  "als Brückenpfeiler in der Brücke enthalten": "مشمول ضمن الجسر كدعامة له",
  "keine eigene Krone nötig": "لا يلزم تاج مستقل",
  "In der Brücke enthalten": "مشمول ضمن الجسر",
  "Bei mehreren fehlenden Zähnen ist die Brücke die Regelversorgung. Implantate sind möglich, aber deutlich aufwendiger.":
    "عند فقدان عدة أسنان يكون الجسر هو العلاج القياسي (Regelversorgung). الزرعات ممكنة، لكنها أكثر تعقيدًا بشكل واضح.",
  "Im Seitenzahnbereich ist die Krone in Standardausführung funktional gleichwertig. Vollkeramik ist hier vor allem eine Frage der Optik.":
    "في منطقة الأسنان الخلفية يكون التاج من النوع القياسي مساويًا من الناحية الوظيفية. الخزف الكامل هنا مسألة مظهر في المقام الأول.",
  "Bei mehreren fehlenden Zähnen ist die Brücke die übliche Versorgung. Implantate sind möglich, aber deutlich aufwendiger.":
    "عند فقدان عدة أسنان يكون الجسر هو العلاج المعتاد. الزرعات ممكنة، لكنها أكثر تعقيدًا بشكل واضح.",
  "Krone, Standardausführung": "تاج، النوع القياسي",
  "Brücke, Standardausführung": "جسر، النوع القياسي",
  "ersetzt den fehlenden Zahn": "يعوّض السن المفقود",
  "ersetzt alle fehlenden Zähne des Kiefers": "يعوّض جميع الأسنان المفقودة في الفك",
  "ersetzt alle Zähne des Kiefers": "يعوّض جميع أسنان الفك",
  "Fehlt nur der letzte Backenzahn, ist ein Ersatz oft nicht nötig (verkürzte Zahnreihe). Bitte im Gespräch klären.":
    "إذا كان المفقود هو الضرس الأخير فقط، فغالبًا لا يلزم تعويضه (قوس سني قصير). يُرجى توضيح ذلك أثناء المحادثة.",
  Totalprothese: "طقم أسنان كامل",
  "Deckprothese über den verbliebenen Zähnen": "طقم أسنان يغطي الأسنان المتبقية",
  "Zahnloser Kiefer": "فك بلا أسنان",
  Oberkiefer: "الفك العلوي",
  Unterkiefer: "الفك السفلي",
  "Metall, im Seitenzahnbereich unverblendet": "معدن، بدون تلبيس في منطقة الأسنان الخلفية",
  "Nachbarzähne bleiben unberührt": "الأسنان المجاورة تبقى دون مساس",
  "Nachbarzähne werden beschliffen": "يتم برد الأسنان المجاورة",
  Standardinstrumente: "أدوات قياسية",
  "Zahnzwischenräume, Politur, Fluorid": "ما بين الأسنان، التلميع، الفلورايد",
  "auch weiche Beläge und Verfärbungen": "يزيل أيضًا الترسبات اللينة والتصبغات",
  "auf ausdrücklichen Wunsch (§ 2 Abs. 3 GOZ)": `بناءً على رغبتكم الصريحة فقط (${LRM}§ 2 Abs. 3 GOZ)`,
  "bei Indikation Kassenleistung": "على نفقة التأمين الصحي عند وجود داعٍ طبي",
  "bei großen Flächen begrenzt haltbar": "عمرها محدود في المساحات الكبيرة",
  "bewährt und haltbar": "مجرَّب ومتين",
  "dicht und langlebig": "محكم الإغلاق وطويل العمر",
  "einmal im Kalenderjahr Kassenleistung": "على نفقة التأمين الصحي مرة واحدة في السنة التقويمية",
  "entfernt harte Beläge": "يزيل الترسبات الصلبة",
  "erhält den Zahn": "يحافظ على السن",
  "ersetzt mehrere Zähne": "يعوّض عدة أسنان",
  festsitzend: "ثابت",
  "gleicher Festzuschuss": "الدعم الثابت نفسه (Festzuschuss)",
  herausnehmbar: "متحرك (قابل للنزع)",
  "hochwertige Schichttechnik": "تقنية طبقات عالية الجودة",
  "höhere Erfolgsquote bei gekrümmten Kanälen": "نسبة نجاح أعلى في القنوات المنحنية",
  "im Frontzahnbereich Kassenleistung": "على نفقة التأمين الصحي في الأسنان الأمامية",
  "kürzere Haltbarkeit": "عمر أقصر",
  "maschinelle Aufbereitung und Mikroskop": "تحضير آلي للقنوات واستخدام المجهر",
  "metallfrei, natürliche Optik": "خالٍ من المعدن، مظهر طبيعي",
  "schnelle Lösung": "حل سريع",
  "schützt Zähne und Versorgungen": "يحمي الأسنان والتركيبات",
  "schützt tiefe Fissuren vor Karies": "يحمي الشقوق العميقة من التسوس",
  "sehr gut verträglich": "يتقبّله الجسم جيدًا جدًا",
  "sehr langlebig": "طويل العمر جدًا",
  "stabilisiert den geschwächten Zahn": "يقوّي السن الضعيف",
  "stoppt Knochenabbau": "يوقف تآكل العظم",
  "viele Zusatzversicherungen erstatten": "كثير من التأمينات الإضافية تعوّض التكلفة",
  zahnfarben: "بلون السن",
  "zahnfarben, gute Randdichte": "بلون السن، إحكام جيد عند الحواف",
  "zahnfarben, metallfrei": "بلون السن، خالٍ من المعدن",
  "zahnfarben, schnell gelegt": "بلون السن، توضع بسرعة",
  // Hinweise
  "Alte Amalgamfüllungen nur ersetzen, wenn sie defekt sind. Intakte Füllungen bleiben.":
    "لا تُستبدل حشوات الأملغم القديمة إلا إذا كانت تالفة. الحشوات السليمة تبقى.",
  "Bei Front- und Prämolaren mit geradem Kanal reicht die Kassenleistung meist aus.":
    "في الأسنان الأمامية والضواحك ذات القناة المستقيمة يكفي غالبًا العلاج الذي يغطيه التأمين الصحي.",
  "Im Seitenzahnbereich ist die Kassenkrone funktional gleichwertig. Vollkeramik ist hier vor allem eine Frage der Optik.":
    "في منطقة الأسنان الخلفية يكون التاج الذي يغطيه التأمين الصحي مساويًا من الناحية الوظيفية. الخزف الكامل هنا مسألة مظهر في المقام الأول.",
  "Seitenzähne brauchen nach einer Wurzelbehandlung meist eine Krone, damit sie nicht brechen.":
    "بعد علاج الجذور تحتاج الأسنان الخلفية غالبًا إلى تاج حتى لا تنكسر.",
  "Erst kariöse Zähne versorgen, dann aufhellen. Füllungen hellen nicht mit auf und werden danach farblich angepasst.":
    "تُعالَج الأسنان المتسوسة أولًا ثم يتم التبييض. الحشوات لا تتأثر بالتبييض ويُعدَّل لونها بعد ذلك.",
  "Knirschen erhöht die Bruchgefahr. Zusätzlich eine Aufbissschiene einplanen.":
    "صرير الأسنان يزيد خطر الكسر. يُنصح إضافةً إلى ذلك بواقي أسنان ليلي.",
  "Bei Knirschen monolithisches Zirkon wählen, keine verblendete Keramik.":
    "في حالة صرير الأسنان يُختار الزركونيا أحادي الكتلة بدلًا من الخزف المُلبَّس.",
  "Rauchen erhöht das Risiko eines Implantatverlusts deutlich. Vorher Rauchstopp besprechen.":
    "التدخين يزيد خطر فقدان الزرعة بشكل واضح. سنتحدث قبل ذلك عن الإقلاع عن التدخين.",
  "Vor Implantat oder Brücke zuerst die Parodontitis behandeln.": "قبل الزرعة أو الجسر يُعالَج التهاب دواعم السن أولًا.",
  "Bei sehr großem Defekt am Frontzahn prüfen, ob eine Krone langfristig sinnvoller ist.":
    "عند وجود تلف كبير جدًا في سن أمامي يُدرَس ما إذا كان التاج أنسب على المدى الطويل.",
  // Leistungsarten
  Andersartig: "علاج من نوع مختلف (andersartig)",
  "Basis + Zusatz": "أساسي + إضافي",
  Basisleistung: "خدمة أساسية",
  Basisversorgung: "علاج أساسي",
  Gleichartig: "علاج من النوع نفسه مع إضافات (gleichartig)",
  "Kasse + Privatzusatz": "التأمين الصحي + إضافة خاصة",
  Mehrkostenvereinbarung: "اتفاق التكاليف الإضافية (Mehrkostenvereinbarung)",
  Privatleistung: "خدمة خاصة",
  Regelversorgung: "العلاج القياسي (Regelversorgung)",
  Wahlleistung: "خدمة اختيارية",
  // Arztpraxen und Therapie: fachübergreifende Bezeichnungen und Hinweise
  "Selbstzahlerleistung (IGeL)": "خدمة يدفعها المريض بنفسه (IGeL)",
  Selbstzahlerleistung: "خدمة يدفعها المريض بنفسه",
  "Kassenleistung mit Zuzahlung": "على نفقة التأمين الصحي، مع مساهمة منكم",
  "Kassenanteil + Aufzahlung": "حصة التأمين الصحي + مبلغ إضافي منكم",
  "Leistung der Praxis": "خدمة تقدمها العيادة",
  "Kassenleistung bei Beschwerden": "على نفقة التأمين الصحي عند وجود أعراض",
  "Kassenleistung mit gesetzlicher Zuzahlung": "على نفقة التأمين الصحي، مع المساهمة القانونية",
  "Bei Beschwerden Kassenleistung.": "عند وجود أعراض تكون على نفقة التأمين الصحي.",
  "Private Zusatzversicherungen übernehmen das oft.": "التأمينات الإضافية الخاصة تغطي ذلك في كثير من الأحيان.",
  "Private Zusatzversicherungen erstatten oft anteilig.": "التأمينات الإضافية الخاصة تعوّض جزءًا من التكلفة في كثير من الأحيان.",
  "Ersetzt keine ärztliche Untersuchung.": "لا يغني عن الفحص الطبي.",
  "Ohne Beschwerden ist ein Nutzen nicht belegt.": "عند عدم وجود أعراض لم تثبت فائدة ذلك.",
  "Mit neuer Verordnung wieder Kassenleistung.": "بوصفة طبية جديدة تعود على نفقة التأمين الصحي.",
};

export const ar: PatientLocale = {
  code: "ar",
  name: "العربية",
  dir: "rtl",
  // Tag/Monat/Jahr mit lateinischen Ziffern („13/11/2026“), in arabischem Text gut lesbar.
  dateLocale: "en-GB",
  euro: (n) => ltr(`${gruppiert(n, ",")}${NBSP}€`),
  ui,
  content,
  patterns: {
    tooth: (m) => `السن ${m[1]}`,
    teeth: (m) => `الأسنان ${liste(m[1])}`,
    nMissing: (m) => `عدد الأسنان المفقودة: ${m[1]}`,
    bridgeUnitsStandard: (m) => `جسر (عدد الوحدات: ${m[1]})، العلاج القياسي`,
    bridgeUnitsCeramic: (m) => `جسر خزفي كامل (عدد الوحدات: ${m[1]})`,
    bridgeUnitsPrivate: (m) => `جسر (عدد الوحدات: ${m[1]})، النوع القياسي`,
    nImplants: (m) => `زرعات مع تيجان (العدد: ${m[1]})`,
    notNeededWithBridge: (m, t) => `لا يلزم في حال عمل جسر (${t(m[1])})`,
    abutmentNote: (m, t) =>
      `إذا أصبح هذا السن دعامة لجسر (${t(m[1])})، فإن تاجه مشمول ضمن الجسر. لا يحتاج إلى تاج مستقل إلا إذا عُولج الفراغ بطريقة أخرى.`,
    neighboursNeedCare: (m) => `الأسنان المجاورة ${liste(m[1])} و${m[2]} تحتاج إلى علاج على أي حال. الجسر يحلّ الأمرين معًا.`,
    neighboursHealthy: (m) => `الأسنان المجاورة ${liste(m[1])} و${m[2]} سليمة. الزرعة تغني عن بردها.`,
    coveredOnlyFromAge: (m, t) => `على نفقة التأمين الصحي ابتداءً من سن ${m[1]} فقط.${m[2] ? ` ${t(m[2])}` : ""}`,
    coveredFromAge: (m, t) => `على نفقة التأمين الصحي ابتداءً من سن ${m[1]}.${m[2] ? ` ${t(m[2])}` : ""}`,
  },
};
