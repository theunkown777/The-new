// Texte des Kurz-Fragebogens für Patienten in den Sprachen des Patientenportals (lib/portalI18n.ts).
// Die Oberfläche hat kurze Schlüssel; Stellen, Beschreibungen und Antworten hängen am deutschen Wort
// aus lib/kurzcheck.ts. Fehlt etwas, bleibt der deutsche Text stehen. Die Akte der Praxis bleibt deutsch.
import type { PortalLang } from "@/lib/portalI18n";
import { ORT_NACH, ORTE, SEIT_KURZ, WICHTIG, ZEICHEN, type KurzArt } from "@/lib/kurzcheck";

export const KURZ_UI = {
  wo: "Wo haben Sie Beschwerden?",
  staerke: "Wie stark sind die Beschwerden?",
  seit: "Seit wann haben Sie das?",
  wannZahn: "Wann merken Sie es?",
  wieKoerper: "Wie fühlt es sich an?",
  wasSonst: "Was bemerken Sie?",
  wichtig: "Was ist Ihnen für den Termin am wichtigsten?",
  unterZahn: "Tippen Sie auf den Zahn (bis zu {n}). Sie müssen es nicht genau wissen.",
  unterWo: "Tippen Sie auf die Stelle (bis zu {n}).",
  unterStaerke: "Schieben Sie den Regler: 0 bedeutet keine Beschwerden, 10 die stärksten, die Sie sich vorstellen können.",
  eine: "Eine Antwort genügt.",
  mehrere: "Mehrere Antworten sind möglich. Wenn nichts passt, tippen Sie einfach auf „Weiter“.",
  frage: "Frage {i} von {n}",
  ansicht: "Ansicht",
  vorn: "Von vorn",
  hinten: "Von hinten",
  zahnSeite: "Wie beim Blick in den Mund: Ihre rechte Seite liegt links im Bild.",
  keine: "Ich habe keine Beschwerden",
  entfernen: "{ort} entfernen",
  gewaehlt: "Ihre Angaben",
  bitteWaehlen: "Bitte wählen",
  vonZehn: "von 10",
  staerkeRegler: "Stärke der Beschwerden von 0 bis 10",
  staerkeWahl: "Stärke wählen",
  dringend: "Bei sehr starken Beschwerden rufen Sie bitte direkt in der Praxis an und warten nicht auf den Termin. Im Notfall wählen Sie die 112.",
  notiz: "Möchten Sie der Praxis noch etwas sagen? (freiwillig)",
  notizPlatz: "In eigenen Worten, höchstens zwei Sätze",
  zurueck: "Zurück",
  weiter: "Weiter",
  absenden: "Absenden",
  sendet: "Sendet …",
  fehler: "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.",
  fuss: "Ihre Antworten gehen nur an {praxis}. Der Fragebogen stellt keine Diagnose.",
  danke: "Danke, {name}.",
  dankeText: "{praxis} hat Ihre Antworten erhalten und kann sich auf Ihren Termin vorbereiten.",
  uebersicht: "Zurück zur Übersicht",
  seitenTitel: "Fünf Fragen vor dem Termin",
  seitenUnter: "Dauert etwa eine Minute. So weiß {praxis} schon vorher, worum es geht.",
  modellKoerper: "Modell eines Körpers, nicht Ihr eigener.",
  modellKopf: "Modell eines Kopfes, nicht Ihr eigener.",
  modellGebiss: "Modell eines Gebisses, nicht Ihr eigenes.",
  drehen: "Mit dem Finger drehen, mit zwei Fingern vergrößern. Tippen Sie auf die Stelle.",
  drehenMaus: "Mit der Maus ziehen dreht das Modell, das Mausrad vergrößert. Klicken Sie auf die Stelle.",
  laedt: "Das 3D-Modell wird geladen. Sie können schon in der Zeichnung tippen.",
  gelenke: "Gelenke zeigen",
  darstellung: "Darstellung",
  schema: "Schema",
  liste: "Stelle aus einer Liste wählen",
  nachbar: "Nicht ganz getroffen? Nachbarzahn:",
  keinOrt: "Hier lässt sich keine Stelle wählen. Tippen Sie etwas daneben oder wählen Sie aus der Liste.",
  genug: "Sie können bis zu {n} Stellen wählen. Mit ✕ entfernen Sie eine.",
  schonGewaehlt: "Schon gewählt: {ort}. Mit ✕ können Sie das ändern.",
  zahn: "Zahn {nr}",
  oben: "Oberkiefer",
  unten: "Unterkiefer",
  rechts: "rechts",
  links: "links",
  g_kopf: "Kopf und Hals",
  g_augen: "Augen",
  g_ohren: "Ohren",
  g_gesicht: "Gesicht",
  g_rumpf: "Brust, Bauch und Leiste",
  g_ruecken: "Rücken",
  g_arme: "Arme und Hände",
  g_beine: "Beine und Füße",
  g_ueberall: "Mehrere Stellen",
  g_mund: "Im Mund",
  g_zaehneOben: "Zähne oben",
  g_zaehneUnten: "Zähne unten",
  vorTermin: "Vor Ihrem Termin",
  fuenf: "Fünf kurze Fragen",
  fuenfText: "Zeigen Sie am Bild, wo es Beschwerden gibt. Dauert etwa eine Minute.",
  starten: "Starten",
  figurVorn: "Körper von vorn",
  figurHinten: "Körper von hinten",
  gebiss: "Gebiss: Oberkiefer oben, Unterkiefer unten",
  modellAria: "Modell zum Antippen der Stelle",
} as const;
export type KurzUiKey = keyof typeof KURZ_UI;

/** Ein Sprachpaket: als reine Daten, damit die Seite nur die gewählte Sprache an den Browser gibt. */
export interface KurzPaket {
  lang: PortalLang;
  ui: Partial<Record<KurzUiKey, string>>;
  /** Stellen, Beschreibungen, Antworten: deutsches Wort → Übersetzung */
  w: Record<string, string>;
  /** Seite an eine Stelle hängen: {x} = Stelle; klein = Stelle klein schreiben (in dieser Sprache) */
  seite: { R: string; L: string; klein?: boolean };
}

/** Alle deutschen Wörter, die übersetzt sein müssen (Grundlage für den Test). */
export function kurzWoerter(): string[] {
  const s = new Set<string>();
  for (const o of ORTE) s.add(o.basis);
  for (const l of Object.values(ZEICHEN)) for (const z of l) s.add(z.name);
  for (const x of Object.values(SEIT_KURZ)) s.add(x);
  for (const x of Object.values(WICHTIG)) s.add(x);
  for (const x of STAERKE_WORTE) s.add(x);
  return Array.from(s);
}
export const STAERKE_WORTE = ["keine", "leicht", "mittel", "stark", "sehr stark"] as const;

const DE: KurzPaket = { lang: "de", ui: {}, w: {}, seite: { R: "{x} rechts", L: "{x} links" } };

const EN: KurzPaket = {
  lang: "en",
  seite: { R: "Right {x}", L: "Left {x}", klein: true },
  ui: {
    wo: "Where do you have symptoms?", staerke: "How strong are the symptoms?", seit: "Since when have you had this?", wannZahn: "When do you notice it?", wieKoerper: "What does it feel like?", wasSonst: "What do you notice?", wichtig: "What matters most to you for the appointment?",
    unterZahn: "Tap the tooth (up to {n}). You do not need to know exactly.", unterWo: "Tap the spot (up to {n}).", unterStaerke: "Move the slider: 0 means no symptoms, 10 the strongest you can imagine.",
    eine: "One answer is enough.", mehrere: "You can choose several answers. If nothing fits, simply tap “Next”.", frage: "Question {i} of {n}", ansicht: "View", vorn: "From the front", hinten: "From the back",
    zahnSeite: "As if looking into your mouth: your right side is on the left of the picture.", keine: "I have no symptoms", entfernen: "Remove {ort}", gewaehlt: "Your answers", bitteWaehlen: "Please choose", vonZehn: "out of 10",
    staerkeRegler: "Strength of symptoms from 0 to 10", staerkeWahl: "Choose strength", dringend: "If your symptoms are very strong, please call the practice directly and do not wait for the appointment. In an emergency, dial 112.",
    notiz: "Would you like to tell the practice anything else? (optional)", notizPlatz: "In your own words, two sentences at most", zurueck: "Back", weiter: "Next", absenden: "Send", sendet: "Sending …",
    fehler: "That did not work. Please try again.", fuss: "Your answers go only to {praxis}. The questionnaire does not make a diagnosis.", danke: "Thank you, {name}.", dankeText: "{praxis} has received your answers and can prepare for your appointment.",
    uebersicht: "Back to overview", seitenTitel: "Five questions before your appointment", seitenUnter: "Takes about one minute. This way {praxis} knows in advance what it is about.",
    modellKoerper: "A model of a body, not your own.", modellKopf: "A model of a head, not your own.", modellGebiss: "A model of teeth, not your own.", drehen: "Turn with one finger, zoom with two fingers. Tap the spot.", drehenMaus: "Drag with the mouse to turn the model, use the scroll wheel to zoom. Click the spot.",
    laedt: "The 3D model is loading. You can already tap in the drawing.", gelenke: "Show joints", darstellung: "Display", schema: "Diagram", liste: "Choose a spot from a list", nachbar: "Not quite? Neighbouring tooth:",
    keinOrt: "No spot can be chosen here. Tap a little to the side or choose from the list.", genug: "You can choose up to {n} spots. Use ✕ to remove one.", schonGewaehlt: "Already chosen: {ort}. Use ✕ to change this.", zahn: "Tooth {nr}", oben: "Upper jaw", unten: "Lower jaw", rechts: "right", links: "left",
    g_kopf: "Head and neck", g_augen: "Eyes", g_ohren: "Ears", g_gesicht: "Face", g_rumpf: "Chest, abdomen and groin", g_ruecken: "Back", g_arme: "Arms and hands", g_beine: "Legs and feet", g_ueberall: "Several spots", g_mund: "In the mouth", g_zaehneOben: "Upper teeth", g_zaehneUnten: "Lower teeth",
    vorTermin: "Before your appointment", fuenf: "Five short questions", fuenfText: "Show on the picture where you have symptoms. Takes about one minute.", starten: "Start", figurVorn: "Body from the front", figurHinten: "Body from the back", gebiss: "Teeth: upper jaw at the top, lower jaw at the bottom", modellAria: "Model for tapping the spot",
  },
  w: {
    Kopf: "Head", Gesicht: "Face", Kiefergelenk: "Jaw joint", Hals: "Neck", Nacken: "Back of the neck", Auge: "Eye", "Beide Augen": "Both eyes", Ohr: "Ear", "Beide Ohren": "Both ears", Nase: "Nose", "Hals und Rachen": "Throat", Stirn: "Forehead", "Schläfe": "Temple", Wange: "Cheek", "Mund und Lippen": "Mouth and lips", Kinn: "Chin",
    Brust: "Chest", "Brust, Mitte": "Chest, middle", Oberbauch: "Upper abdomen", Unterbauch: "Lower abdomen", Bauch: "Abdomen", Leiste: "Groin", "Oberer Rücken": "Upper back", "Unterer Rücken": "Lower back", "Gesäß": "Buttocks",
    Schulter: "Shoulder", Oberarm: "Upper arm", Ellenbogen: "Elbow", Unterarm: "Forearm", Handgelenk: "Wrist", "Hand und Finger": "Hand and fingers", "Hüfte": "Hip", Oberschenkel: "Thigh", Knie: "Knee", Unterschenkel: "Lower leg", "Wade und Achillessehne": "Calf and Achilles tendon", Sprunggelenk: "Ankle", "Fuß": "Foot", "An vielen Stellen": "In many places",
    Zahnfleisch: "Gums", "Kiefer oder Kiefergelenk": "Jaw or jaw joint", "Zunge oder Mundboden": "Tongue or floor of the mouth", Gaumen: "Palate", "Ich weiß nicht genau, wo": "I am not sure where",
    "Bei Kaltem": "With cold", "Bei Heißem oder Süßem": "With hot or sweet", "Beim Kauen oder Aufbeißen": "When chewing or biting", "Pochend, auch nachts": "Throbbing, also at night", "Zahnfleisch blutet": "Gums bleed", Geschwollen: "Swollen", "Etwas ist abgebrochen": "Something has broken off", "Zahn oder Füllung ist locker": "Tooth or filling is loose",
    Stechend: "Stabbing", "Dumpf oder drückend": "Dull or pressing", Pochend: "Throbbing", Brennend: "Burning", "Kribbelnd oder taub": "Tingling or numb", "Steif, schwer beweglich": "Stiff, hard to move", "Vor allem bei Bewegung": "Mainly when moving",
    "Gerötet": "Red", "Juckt oder brennt": "Itchy or burning", "Tränt": "Watery", "Trocken oder sandig": "Dry or gritty", "Ich sehe verschwommen": "My vision is blurred", "Licht blendet": "Light is dazzling", "Drückt oder schmerzt": "Pressure or pain", "Blitze, Schatten oder Flecken": "Flashes, shadows or spots",
    "Druck im Ohr": "Pressure in the ear", "Ich höre schlechter": "I hear less well", "Ohrgeräusch, Pfeifen oder Rauschen": "Noise in the ear, ringing or rushing", Schwindel: "Dizziness", "Schmerzt beim Schlucken": "Hurts when swallowing", "Nase verstopft oder läuft": "Blocked or runny nose", Heiser: "Hoarse", "Riechen oder Schmecken verändert": "Smell or taste has changed",
    Juckt: "Itchy", "Trocken oder schuppig": "Dry or scaly", "Nässt oder verkrustet": "Weeping or crusted", "Bläschen oder Pickel": "Blisters or pimples", "Fleck oder Muttermal verändert": "Spot or mole has changed", "Brennt oder schmerzt": "Burning or painful",
    Heute: "Today", "Ein paar Tage": "A few days", Wochen: "Weeks", "Monate oder länger": "Months or longer",
    "Schnell weniger Beschwerden": "Feeling better quickly", "Verstehen, woher es kommt": "Understanding the cause", "Kosten vorher kennen": "Knowing the costs beforehand", "Ich bin nervös vor der Behandlung": "I am nervous about the treatment", "Nur Kontrolle oder Vorsorge": "Only a check-up",
    keine: "none", leicht: "mild", mittel: "moderate", stark: "strong", "sehr stark": "very strong",
  },
};

const UK: KurzPaket = {
  lang: "uk",
  seite: { R: "{x} (праворуч)", L: "{x} (ліворуч)" },
  ui: {
    wo: "Де у вас скарги?", staerke: "Наскільки сильні скарги?", seit: "Відколи це у вас?", wannZahn: "Коли ви це помічаєте?", wieKoerper: "Яке це відчуття?", wasSonst: "Що ви помічаєте?", wichtig: "Що для вас найважливіше на прийомі?",
    unterZahn: "Торкніться зуба (до {n}). Не обов’язково знати точно.", unterWo: "Торкніться місця (до {n}).", unterStaerke: "Пересуньте повзунок: 0 означає без скарг, 10 означає найсильніші, які можна уявити.",
    eine: "Достатньо однієї відповіді.", mehrere: "Можна вибрати кілька відповідей. Якщо нічого не підходить, просто натисніть «Далі».", frage: "Питання {i} з {n}", ansicht: "Вигляд", vorn: "Спереду", hinten: "Ззаду",
    zahnSeite: "Як при погляді в рот: ваш правий бік зліва на зображенні.", keine: "У мене немає скарг", entfernen: "Видалити: {ort}", gewaehlt: "Ваші відповіді", bitteWaehlen: "Будь ласка, виберіть", vonZehn: "з 10",
    staerkeRegler: "Сила скарг від 0 до 10", staerkeWahl: "Виберіть силу", dringend: "Якщо скарги дуже сильні, будь ласка, зателефонуйте безпосередньо в практику і не чекайте прийому. У надзвичайній ситуації телефонуйте 112.",
    notiz: "Хочете ще щось сказати практиці? (необов’язково)", notizPlatz: "Своїми словами, не більше двох речень", zurueck: "Назад", weiter: "Далі", absenden: "Надіслати", sendet: "Надсилання …",
    fehler: "Не вдалося. Будь ласка, спробуйте ще раз.", fuss: "Ваші відповіді отримує лише {praxis}. Опитувальник не ставить діагноз.", danke: "Дякуємо, {name}.", dankeText: "{praxis} отримала ваші відповіді і може підготуватися до прийому.",
    uebersicht: "Назад до огляду", seitenTitel: "П’ять питань перед прийомом", seitenUnter: "Займає близько хвилини. Так {praxis} заздалегідь знає, про що йдеться.",
    modellKoerper: "Це модель тіла, а не ваше тіло.", modellKopf: "Це модель голови, а не ваша голова.", modellGebiss: "Це модель зубів, а не ваші зуби.", drehen: "Повертайте одним пальцем, збільшуйте двома. Торкніться місця.", drehenMaus: "Перетягуйте мишею, щоб повернути модель, коліщатком миші збільшуйте. Клацніть на місце.",
    laedt: "3D-модель завантажується. Ви вже можете торкатися малюнка.", gelenke: "Показати суглоби", darstellung: "Відображення", schema: "Схема", liste: "Вибрати місце зі списку", nachbar: "Не зовсім? Сусідній зуб:",
    keinOrt: "Тут не можна вибрати місце. Торкніться трохи поруч або виберіть зі списку.", genug: "Можна вибрати до {n} місць. Кнопкою ✕ можна видалити місце.", schonGewaehlt: "Уже вибрано: {ort}. Змінити це можна кнопкою ✕.", zahn: "Зуб {nr}", oben: "Верхня щелепа", unten: "Нижня щелепа", rechts: "праворуч", links: "ліворуч",
    g_kopf: "Голова і шия", g_augen: "Очі", g_ohren: "Вуха", g_gesicht: "Обличчя", g_rumpf: "Груди, живіт і пах", g_ruecken: "Спина", g_arme: "Руки і кисті", g_beine: "Ноги і стопи", g_ueberall: "Кілька місць", g_mund: "У роті", g_zaehneOben: "Верхні зуби", g_zaehneUnten: "Нижні зуби",
    vorTermin: "Перед прийомом", fuenf: "П’ять коротких питань", fuenfText: "Покажіть на малюнку, де у вас скарги. Займає близько хвилини.", starten: "Почати", figurVorn: "Тіло спереду", figurHinten: "Тіло ззаду", gebiss: "Зуби: верхня щелепа вгорі, нижня внизу", modellAria: "Модель для вибору місця",
  },
  w: {
    Kopf: "Голова", Gesicht: "Обличчя", Kiefergelenk: "Щелепний суглоб", Hals: "Шия", Nacken: "Задня частина шиї", Auge: "Око", "Beide Augen": "Обидва ока", Ohr: "Вухо", "Beide Ohren": "Обидва вуха", Nase: "Ніс", "Hals und Rachen": "Горло", Stirn: "Лоб", "Schläfe": "Скроня", Wange: "Щока", "Mund und Lippen": "Рот і губи", Kinn: "Підборіддя",
    Brust: "Груди", "Brust, Mitte": "Груди, середина", Oberbauch: "Верхня частина живота", Unterbauch: "Нижня частина живота", Bauch: "Живіт", Leiste: "Пах", "Oberer Rücken": "Верхня частина спини", "Unterer Rücken": "Нижня частина спини", "Gesäß": "Сідниці",
    Schulter: "Плече", Oberarm: "Верхня частина руки", Ellenbogen: "Лікоть", Unterarm: "Передпліччя", Handgelenk: "Зап’ястя", "Hand und Finger": "Кисть і пальці", "Hüfte": "Кульшовий суглоб", Oberschenkel: "Стегно", Knie: "Коліно", Unterschenkel: "Гомілка", "Wade und Achillessehne": "Литка й ахіллове сухожилля", Sprunggelenk: "Гомілковостопний суглоб", "Fuß": "Стопа", "An vielen Stellen": "У багатьох місцях",
    Zahnfleisch: "Ясна", "Kiefer oder Kiefergelenk": "Щелепа або щелепний суглоб", "Zunge oder Mundboden": "Язик або дно рота", Gaumen: "Піднебіння", "Ich weiß nicht genau, wo": "Не знаю точно, де",
    "Bei Kaltem": "Від холодного", "Bei Heißem oder Süßem": "Від гарячого або солодкого", "Beim Kauen oder Aufbeißen": "Під час жування або накушування", "Pochend, auch nachts": "Пульсує, також уночі", "Zahnfleisch blutet": "Ясна кровоточать", Geschwollen: "Набряк", "Etwas ist abgebrochen": "Щось відламалося", "Zahn oder Füllung ist locker": "Зуб або пломба хитається",
    Stechend: "Колючий біль", "Dumpf oder drückend": "Тупий або тиснучий біль", Pochend: "Пульсуючий біль", Brennend: "Пекучий біль", "Kribbelnd oder taub": "Поколювання або оніміння", "Steif, schwer beweglich": "Скутість, важко рухатися", "Vor allem bei Bewegung": "Переважно під час руху",
    "Gerötet": "Почервоніння", "Juckt oder brennt": "Свербить або пече", "Tränt": "Сльозиться", "Trocken oder sandig": "Сухість або відчуття піску", "Ich sehe verschwommen": "Бачу розмито", "Licht blendet": "Світло сліпить", "Drückt oder schmerzt": "Тисне або болить", "Blitze, Schatten oder Flecken": "Спалахи, тіні або плями",
    "Druck im Ohr": "Тиск у вусі", "Ich höre schlechter": "Гірше чую", "Ohrgeräusch, Pfeifen oder Rauschen": "Шум, свист або дзвін у вусі", Schwindel: "Запаморочення", "Schmerzt beim Schlucken": "Боляче ковтати", "Nase verstopft oder läuft": "Закладений ніс або нежить", Heiser: "Хрипкий голос", "Riechen oder Schmecken verändert": "Змінився нюх або смак",
    Juckt: "Свербить", "Trocken oder schuppig": "Сухість або лущення", "Nässt oder verkrustet": "Мокне або вкривається кіркою", "Bläschen oder Pickel": "Пухирці або прищі", "Fleck oder Muttermal verändert": "Пляма або родимка змінилася", "Brennt oder schmerzt": "Пече або болить",
    Heute: "Сьогодні", "Ein paar Tage": "Кілька днів", Wochen: "Тижні", "Monate oder länger": "Місяці або довше",
    "Schnell weniger Beschwerden": "Швидко полегшити скарги", "Verstehen, woher es kommt": "Зрозуміти причину", "Kosten vorher kennen": "Знати вартість заздалегідь", "Ich bin nervös vor der Behandlung": "Я хвилююся перед лікуванням", "Nur Kontrolle oder Vorsorge": "Лише огляд або профілактика",
    keine: "немає", leicht: "легкі", mittel: "середні", stark: "сильні", "sehr stark": "дуже сильні",
  },
};

const RU: KurzPaket = {
  lang: "ru",
  seite: { R: "{x} (справа)", L: "{x} (слева)" },
  ui: {
    wo: "Где у вас жалобы?", staerke: "Насколько сильные жалобы?", seit: "С какого времени это у вас?", wannZahn: "Когда вы это замечаете?", wieKoerper: "Какое это ощущение?", wasSonst: "Что вы замечаете?", wichtig: "Что для вас важнее всего на приёме?",
    unterZahn: "Нажмите на зуб (до {n}). Не обязательно знать точно.", unterWo: "Нажмите на место (до {n}).", unterStaerke: "Передвиньте ползунок: 0 означает без жалоб, 10 означает самые сильные, какие можно представить.",
    eine: "Достаточно одного ответа.", mehrere: "Можно выбрать несколько ответов. Если ничего не подходит, просто нажмите «Далее».", frage: "Вопрос {i} из {n}", ansicht: "Вид", vorn: "Спереди", hinten: "Сзади",
    zahnSeite: "Как при взгляде в рот: ваша правая сторона слева на картинке.", keine: "У меня нет жалоб", entfernen: "Удалить: {ort}", gewaehlt: "Ваши ответы", bitteWaehlen: "Пожалуйста, выберите", vonZehn: "из 10",
    staerkeRegler: "Сила жалоб от 0 до 10", staerkeWahl: "Выберите силу", dringend: "При очень сильных жалобах, пожалуйста, позвоните прямо в практику и не ждите приёма. В экстренном случае звоните 112.",
    notiz: "Хотите ещё что-то сообщить практике? (по желанию)", notizPlatz: "Своими словами, не больше двух предложений", zurueck: "Назад", weiter: "Далее", absenden: "Отправить", sendet: "Отправка …",
    fehler: "Не получилось. Пожалуйста, попробуйте ещё раз.", fuss: "Ваши ответы получает только {praxis}. Опросник не ставит диагноз.", danke: "Спасибо, {name}.", dankeText: "{praxis} получила ваши ответы и может подготовиться к приёму.",
    uebersicht: "Назад к обзору", seitenTitel: "Пять вопросов перед приёмом", seitenUnter: "Займёт около минуты. Так {praxis} заранее знает, о чём идёт речь.",
    modellKoerper: "Это модель тела, а не ваше тело.", modellKopf: "Это модель головы, а не ваша голова.", modellGebiss: "Это модель зубов, а не ваши зубы.", drehen: "Поворачивайте одним пальцем, увеличивайте двумя. Нажмите на место.", drehenMaus: "Перетаскивайте мышью, чтобы повернуть модель, колёсиком мыши увеличивайте. Щёлкните на место.",
    laedt: "3D-модель загружается. Вы уже можете нажимать на рисунок.", gelenke: "Показать суставы", darstellung: "Отображение", schema: "Схема", liste: "Выбрать место из списка", nachbar: "Не совсем? Соседний зуб:",
    keinOrt: "Здесь нельзя выбрать место. Нажмите чуть рядом или выберите из списка.", genug: "Можно выбрать до {n} мест. Кнопкой ✕ можно удалить место.", schonGewaehlt: "Уже выбрано: {ort}. Изменить это можно кнопкой ✕.", zahn: "Зуб {nr}", oben: "Верхняя челюсть", unten: "Нижняя челюсть", rechts: "справа", links: "слева",
    g_kopf: "Голова и шея", g_augen: "Глаза", g_ohren: "Уши", g_gesicht: "Лицо", g_rumpf: "Грудь, живот и пах", g_ruecken: "Спина", g_arme: "Руки и кисти", g_beine: "Ноги и стопы", g_ueberall: "Несколько мест", g_mund: "Во рту", g_zaehneOben: "Верхние зубы", g_zaehneUnten: "Нижние зубы",
    vorTermin: "Перед приёмом", fuenf: "Пять коротких вопросов", fuenfText: "Покажите на картинке, где у вас жалобы. Займёт около минуты.", starten: "Начать", figurVorn: "Тело спереди", figurHinten: "Тело сзади", gebiss: "Зубы: верхняя челюсть вверху, нижняя внизу", modellAria: "Модель для выбора места",
  },
  w: {
    Kopf: "Голова", Gesicht: "Лицо", Kiefergelenk: "Челюстной сустав", Hals: "Шея", Nacken: "Задняя часть шеи", Auge: "Глаз", "Beide Augen": "Оба глаза", Ohr: "Ухо", "Beide Ohren": "Оба уха", Nase: "Нос", "Hals und Rachen": "Горло", Stirn: "Лоб", "Schläfe": "Висок", Wange: "Щека", "Mund und Lippen": "Рот и губы", Kinn: "Подбородок",
    Brust: "Грудь", "Brust, Mitte": "Грудь, середина", Oberbauch: "Верхняя часть живота", Unterbauch: "Нижняя часть живота", Bauch: "Живот", Leiste: "Пах", "Oberer Rücken": "Верхняя часть спины", "Unterer Rücken": "Нижняя часть спины", "Gesäß": "Ягодицы",
    Schulter: "Плечо", Oberarm: "Верхняя часть руки", Ellenbogen: "Локоть", Unterarm: "Предплечье", Handgelenk: "Запястье", "Hand und Finger": "Кисть и пальцы", "Hüfte": "Тазобедренный сустав", Oberschenkel: "Бедро", Knie: "Колено", Unterschenkel: "Голень", "Wade und Achillessehne": "Икра и ахиллово сухожилие", Sprunggelenk: "Голеностопный сустав", "Fuß": "Стопа", "An vielen Stellen": "Во многих местах",
    Zahnfleisch: "Дёсны", "Kiefer oder Kiefergelenk": "Челюсть или челюстной сустав", "Zunge oder Mundboden": "Язык или дно рта", Gaumen: "Нёбо", "Ich weiß nicht genau, wo": "Не знаю точно, где",
    "Bei Kaltem": "От холодного", "Bei Heißem oder Süßem": "От горячего или сладкого", "Beim Kauen oder Aufbeißen": "При жевании или надкусывании", "Pochend, auch nachts": "Пульсирует, также ночью", "Zahnfleisch blutet": "Дёсны кровоточат", Geschwollen: "Отёк", "Etwas ist abgebrochen": "Что-то откололось", "Zahn oder Füllung ist locker": "Зуб или пломба шатается",
    Stechend: "Колющая боль", "Dumpf oder drückend": "Тупая или давящая боль", Pochend: "Пульсирующая боль", Brennend: "Жгучая боль", "Kribbelnd oder taub": "Покалывание или онемение", "Steif, schwer beweglich": "Скованность, трудно двигаться", "Vor allem bei Bewegung": "В основном при движении",
    "Gerötet": "Покраснение", "Juckt oder brennt": "Зудит или жжёт", "Tränt": "Слезится", "Trocken oder sandig": "Сухость или ощущение песка", "Ich sehe verschwommen": "Вижу размыто", "Licht blendet": "Свет слепит", "Drückt oder schmerzt": "Давит или болит", "Blitze, Schatten oder Flecken": "Вспышки, тени или пятна",
    "Druck im Ohr": "Давление в ухе", "Ich höre schlechter": "Слышу хуже", "Ohrgeräusch, Pfeifen oder Rauschen": "Шум, свист или звон в ухе", Schwindel: "Головокружение", "Schmerzt beim Schlucken": "Больно глотать", "Nase verstopft oder läuft": "Нос заложен или течёт", Heiser: "Хриплый голос", "Riechen oder Schmecken verändert": "Изменились обоняние или вкус",
    Juckt: "Зудит", "Trocken oder schuppig": "Сухость или шелушение", "Nässt oder verkrustet": "Мокнет или покрывается коркой", "Bläschen oder Pickel": "Пузырьки или прыщи", "Fleck oder Muttermal verändert": "Пятно или родинка изменились", "Brennt oder schmerzt": "Жжёт или болит",
    Heute: "Сегодня", "Ein paar Tage": "Несколько дней", Wochen: "Недели", "Monate oder länger": "Месяцы или дольше",
    "Schnell weniger Beschwerden": "Быстро облегчить жалобы", "Verstehen, woher es kommt": "Понять причину", "Kosten vorher kennen": "Знать стоимость заранее", "Ich bin nervös vor der Behandlung": "Я волнуюсь перед лечением", "Nur Kontrolle oder Vorsorge": "Только осмотр или профилактика",
    keine: "нет", leicht: "слабые", mittel: "средние", stark: "сильные", "sehr stark": "очень сильные",
  },
};

const PL: KurzPaket = {
  lang: "pl",
  seite: { R: "{x} (prawa strona)", L: "{x} (lewa strona)" },
  ui: {
    wo: "Gdzie występują dolegliwości?", staerke: "Jak silne są dolegliwości?", seit: "Od kiedy to trwa?", wannZahn: "Kiedy dolegliwość się pojawia?", wieKoerper: "Jakie to odczucie?", wasSonst: "Jakie są objawy?", wichtig: "Co jest najważniejsze podczas wizyty?",
    unterZahn: "Proszę dotknąć zęba (maksymalnie {n}). Nie trzeba wiedzieć dokładnie.", unterWo: "Proszę dotknąć miejsca (maksymalnie {n}).", unterStaerke: "Proszę przesunąć suwak: 0 oznacza brak dolegliwości, 10 najsilniejsze, jakie można sobie wyobrazić.",
    eine: "Wystarczy jedna odpowiedź.", mehrere: "Można wybrać kilka odpowiedzi. Jeśli nic nie pasuje, wystarczy nacisnąć „Dalej”.", frage: "Pytanie {i} z {n}", ansicht: "Widok", vorn: "Z przodu", hinten: "Z tyłu",
    zahnSeite: "Jak przy zaglądaniu do ust: prawa strona jest po lewej stronie obrazka.", keine: "Nie mam dolegliwości", entfernen: "Usuń: {ort}", gewaehlt: "Wybrane miejsca", bitteWaehlen: "Proszę wybrać", vonZehn: "z 10",
    staerkeRegler: "Siła dolegliwości od 0 do 10", staerkeWahl: "Wybierz siłę", dringend: "Przy bardzo silnych dolegliwościach proszę zadzwonić bezpośrednio do gabinetu i nie czekać na wizytę. W nagłym wypadku proszę dzwonić pod numer 112.",
    notiz: "Dodatkowa informacja dla gabinetu (dobrowolnie)", notizPlatz: "Własnymi słowami, najwyżej dwa zdania", zurueck: "Wstecz", weiter: "Dalej", absenden: "Wyślij", sendet: "Wysyłanie …",
    fehler: "Nie udało się. Proszę spróbować ponownie.", fuss: "Odpowiedzi trafiają tylko do: {praxis}. Ankieta nie stawia diagnozy.", danke: "Dziękujemy, {name}.", dankeText: "Odpowiedzi trafiły do: {praxis}. Gabinet może przygotować się do wizyty.",
    uebersicht: "Powrót do przeglądu", seitenTitel: "Pięć pytań przed wizytą", seitenUnter: "Zajmuje około minuty. Dzięki temu gabinet {praxis} wie wcześniej, o co chodzi.",
    modellKoerper: "Model ciała, a nie własne ciało.", modellKopf: "Model głowy, a nie własna głowa.", modellGebiss: "Model uzębienia, a nie własne zęby.", drehen: "Obracanie jednym palcem, powiększanie dwoma. Proszę dotknąć miejsca.", drehenMaus: "Obracanie przeciąganiem myszą, powiększanie kółkiem myszy. Proszę kliknąć miejsce.",
    laedt: "Model 3D się wczytuje. Można już dotykać rysunku.", gelenke: "Pokaż stawy", darstellung: "Sposób wyświetlania", schema: "Schemat", liste: "Wybierz miejsce z listy", nachbar: "Nie do końca? Sąsiedni ząb:",
    keinOrt: "Tu nie można wybrać miejsca. Proszę dotknąć obok lub wybrać z listy.", genug: "Można wybrać maksymalnie {n} miejsca. Przyciskiem ✕ można usunąć miejsce.", schonGewaehlt: "Już wybrano: {ort}. Przyciskiem ✕ można to zmienić.", zahn: "Ząb {nr}", oben: "Szczęka", unten: "Żuchwa", rechts: "prawa", links: "lewa",
    g_kopf: "Głowa i szyja", g_augen: "Oczy", g_ohren: "Uszy", g_gesicht: "Twarz", g_rumpf: "Klatka piersiowa, brzuch i pachwina", g_ruecken: "Plecy", g_arme: "Ręce i dłonie", g_beine: "Nogi i stopy", g_ueberall: "Kilka miejsc", g_mund: "W jamie ustnej", g_zaehneOben: "Zęby górne", g_zaehneUnten: "Zęby dolne",
    vorTermin: "Przed wizytą", fuenf: "Pięć krótkich pytań", fuenfText: "Proszę pokazać na obrazku, gdzie występują dolegliwości. Zajmuje około minuty.", starten: "Rozpocznij", figurVorn: "Ciało z przodu", figurHinten: "Ciało z tyłu", gebiss: "Uzębienie: szczęka u góry, żuchwa na dole", modellAria: "Model do wskazania miejsca",
  },
  w: {
    Kopf: "Głowa", Gesicht: "Twarz", Kiefergelenk: "Staw skroniowo-żuchwowy", Hals: "Szyja", Nacken: "Kark", Auge: "Oko", "Beide Augen": "Oboje oczu", Ohr: "Ucho", "Beide Ohren": "Oboje uszu", Nase: "Nos", "Hals und Rachen": "Gardło", Stirn: "Czoło", "Schläfe": "Skroń", Wange: "Policzek", "Mund und Lippen": "Usta i wargi", Kinn: "Podbródek",
    Brust: "Klatka piersiowa", "Brust, Mitte": "Klatka piersiowa, środek", Oberbauch: "Nadbrzusze", Unterbauch: "Podbrzusze", Bauch: "Brzuch", Leiste: "Pachwina", "Oberer Rücken": "Górna część pleców", "Unterer Rücken": "Dolna część pleców", "Gesäß": "Pośladki",
    Schulter: "Bark", Oberarm: "Ramię", Ellenbogen: "Łokieć", Unterarm: "Przedramię", Handgelenk: "Nadgarstek", "Hand und Finger": "Dłoń i palce", "Hüfte": "Biodro", Oberschenkel: "Udo", Knie: "Kolano", Unterschenkel: "Podudzie", "Wade und Achillessehne": "Łydka i ścięgno Achillesa", Sprunggelenk: "Staw skokowy", "Fuß": "Stopa", "An vielen Stellen": "W wielu miejscach",
    Zahnfleisch: "Dziąsła", "Kiefer oder Kiefergelenk": "Szczęka lub staw żuchwy", "Zunge oder Mundboden": "Język lub dno jamy ustnej", Gaumen: "Podniebienie", "Ich weiß nicht genau, wo": "Nie wiem dokładnie, gdzie",
    "Bei Kaltem": "Przy zimnym", "Bei Heißem oder Süßem": "Przy gorącym lub słodkim", "Beim Kauen oder Aufbeißen": "Przy żuciu lub nagryzaniu", "Pochend, auch nachts": "Pulsujący, także w nocy", "Zahnfleisch blutet": "Dziąsła krwawią", Geschwollen: "Obrzęk", "Etwas ist abgebrochen": "Coś się ułamało", "Zahn oder Füllung ist locker": "Ząb lub wypełnienie się rusza",
    Stechend: "Kłujący", "Dumpf oder drückend": "Tępy lub uciskający", Pochend: "Pulsujący", Brennend: "Piekący", "Kribbelnd oder taub": "Mrowienie lub drętwienie", "Steif, schwer beweglich": "Sztywność, trudno się ruszać", "Vor allem bei Bewegung": "Głównie przy ruchu",
    "Gerötet": "Zaczerwienienie", "Juckt oder brennt": "Swędzi lub piecze", "Tränt": "Łzawi", "Trocken oder sandig": "Suchość lub uczucie piasku", "Ich sehe verschwommen": "Widzę niewyraźnie", "Licht blendet": "Światło razi", "Drückt oder schmerzt": "Uciska lub boli", "Blitze, Schatten oder Flecken": "Błyski, cienie lub plamy",
    "Druck im Ohr": "Ucisk w uchu", "Ich höre schlechter": "Słyszę gorzej", "Ohrgeräusch, Pfeifen oder Rauschen": "Szum, pisk lub dzwonienie w uchu", Schwindel: "Zawroty głowy", "Schmerzt beim Schlucken": "Ból przy przełykaniu", "Nase verstopft oder läuft": "Zatkany lub cieknący nos", Heiser: "Chrypka", "Riechen oder Schmecken verändert": "Zmieniony węch lub smak",
    Juckt: "Swędzi", "Trocken oder schuppig": "Suchość lub łuszczenie", "Nässt oder verkrustet": "Sączy się lub tworzy strupy", "Bläschen oder Pickel": "Pęcherzyki lub krosty", "Fleck oder Muttermal verändert": "Zmieniona plama lub znamię", "Brennt oder schmerzt": "Piecze lub boli",
    Heute: "Dzisiaj", "Ein paar Tage": "Kilka dni", Wochen: "Tygodnie", "Monate oder länger": "Miesiące lub dłużej",
    "Schnell weniger Beschwerden": "Szybka ulga", "Verstehen, woher es kommt": "Zrozumieć przyczynę", "Kosten vorher kennen": "Znać koszty z góry", "Ich bin nervös vor der Behandlung": "Denerwuję się przed leczeniem", "Nur Kontrolle oder Vorsorge": "Tylko kontrola lub profilaktyka",
    keine: "brak", leicht: "lekkie", mittel: "średnie", stark: "silne", "sehr stark": "bardzo silne",
  },
};

const TR: KurzPaket = {
  lang: "tr",
  seite: { R: "Sağ {x}", L: "Sol {x}", klein: true },
  ui: {
    wo: "Şikâyetleriniz nerede?", staerke: "Şikâyetleriniz ne kadar güçlü?", seit: "Ne zamandan beri var?", wannZahn: "Ne zaman fark ediyorsunuz?", wieKoerper: "Nasıl bir his?", wasSonst: "Ne fark ediyorsunuz?", wichtig: "Randevuda sizin için en önemli olan ne?",
    unterZahn: "Dişe dokunun (en fazla {n}). Tam olarak bilmeniz gerekmez.", unterWo: "İlgili yere dokunun (en fazla {n}).", unterStaerke: "Sürgüyü kaydırın: 0 şikâyet yok, 10 hayal edebileceğiniz en güçlü şikâyet demektir.",
    eine: "Bir cevap yeterli.", mehrere: "Birden fazla cevap seçebilirsiniz. Hiçbiri uymuyorsa „İleri“ye dokunun.", frage: "Soru {i} / {n}", ansicht: "Görünüm", vorn: "Önden", hinten: "Arkadan",
    zahnSeite: "Ağza bakar gibi: sağ tarafınız resmin solundadır.", keine: "Şikâyetim yok", entfernen: "Kaldır: {ort}", gewaehlt: "Seçtikleriniz", bitteWaehlen: "Lütfen seçin", vonZehn: "/ 10",
    staerkeRegler: "Şikâyetin gücü, 0 ile 10 arası", staerkeWahl: "Gücü seçin", dringend: "Şikâyetleriniz çok güçlüyse lütfen randevuyu beklemeden doğrudan muayenehaneyi arayın. Acil durumda 112'yi arayın.",
    notiz: "Muayenehaneye söylemek istediğiniz başka bir şey var mı? (isteğe bağlı)", notizPlatz: "Kendi sözlerinizle, en fazla iki cümle", zurueck: "Geri", weiter: "İleri", absenden: "Gönder", sendet: "Gönderiliyor …",
    fehler: "Olmadı. Lütfen tekrar deneyin.", fuss: "Cevaplarınızı yalnızca {praxis} görür. Anket teşhis koymaz.", danke: "Teşekkürler, {name}.", dankeText: "{praxis} cevaplarınızı aldı ve randevunuza hazırlanabilir.",
    uebersicht: "Genel bakışa dön", seitenTitel: "Randevudan önce beş soru", seitenUnter: "Yaklaşık bir dakika sürer. Böylece {praxis} konuyu önceden bilir.",
    modellKoerper: "Bu bir vücut modelidir, sizin vücudunuz değil.", modellKopf: "Bu bir baş modelidir, sizin başınız değil.", modellGebiss: "Bu bir diş modelidir, sizin dişleriniz değil.", drehen: "Bir parmakla döndürün, iki parmakla büyütün. İlgili yere dokunun.", drehenMaus: "Fareyle sürükleyerek döndürün, fare tekerleğiyle büyütün. İlgili yere tıklayın.",
    laedt: "3D model yükleniyor. Çizimde şimdiden dokunabilirsiniz.", gelenke: "Eklemleri göster", darstellung: "Gösterim", schema: "Şema", liste: "Listeden bir yer seçin", nachbar: "Tam değil mi? Komşu diş:",
    keinOrt: "Burada bir yer seçilemiyor. Biraz yanına dokunun veya listeden seçin.", genug: "En fazla {n} yer seçebilirsiniz. ✕ ile birini kaldırabilirsiniz.", schonGewaehlt: "Zaten seçildi: {ort}. ✕ ile bunu değiştirebilirsiniz.", zahn: "Diş {nr}", oben: "Üst çene", unten: "Alt çene", rechts: "sağ", links: "sol",
    g_kopf: "Baş ve boyun", g_augen: "Gözler", g_ohren: "Kulaklar", g_gesicht: "Yüz", g_rumpf: "Göğüs, karın ve kasık", g_ruecken: "Sırt", g_arme: "Kollar ve eller", g_beine: "Bacaklar ve ayaklar", g_ueberall: "Birden fazla yer", g_mund: "Ağızda", g_zaehneOben: "Üst dişler", g_zaehneUnten: "Alt dişler",
    vorTermin: "Randevunuzdan önce", fuenf: "Beş kısa soru", fuenfText: "Şikâyetin nerede olduğunu resimde gösterin. Yaklaşık bir dakika sürer.", starten: "Başla", figurVorn: "Vücut önden", figurHinten: "Vücut arkadan", gebiss: "Dişler: üst çene yukarıda, alt çene aşağıda", modellAria: "Yeri seçmek için model",
  },
  w: {
    Kopf: "Baş", Gesicht: "Yüz", Kiefergelenk: "Çene eklemi", Hals: "Boyun", Nacken: "Ense", Auge: "Göz", "Beide Augen": "İki göz", Ohr: "Kulak", "Beide Ohren": "İki kulak", Nase: "Burun", "Hals und Rachen": "Boğaz", Stirn: "Alın", "Schläfe": "Şakak", Wange: "Yanak", "Mund und Lippen": "Ağız ve dudaklar", Kinn: "Çene ucu",
    Brust: "Göğüs", "Brust, Mitte": "Göğüs, orta", Oberbauch: "Üst karın", Unterbauch: "Alt karın", Bauch: "Karın", Leiste: "Kasık", "Oberer Rücken": "Sırtın üst kısmı", "Unterer Rücken": "Bel", "Gesäß": "Kalça",
    Schulter: "Omuz", Oberarm: "Üst kol", Ellenbogen: "Dirsek", Unterarm: "Ön kol", Handgelenk: "El bileği", "Hand und Finger": "El ve parmaklar", "Hüfte": "Kalça eklemi", Oberschenkel: "Uyluk", Knie: "Diz", Unterschenkel: "Alt bacak", "Wade und Achillessehne": "Baldır ve Aşil tendonu", Sprunggelenk: "Ayak bileği", "Fuß": "Ayak", "An vielen Stellen": "Birçok yerde",
    Zahnfleisch: "Diş eti", "Kiefer oder Kiefergelenk": "Çene veya çene eklemi", "Zunge oder Mundboden": "Dil veya ağız tabanı", Gaumen: "Damak", "Ich weiß nicht genau, wo": "Tam olarak nerede bilmiyorum",
    "Bei Kaltem": "Soğukta", "Bei Heißem oder Süßem": "Sıcakta veya tatlıda", "Beim Kauen oder Aufbeißen": "Çiğnerken veya ısırırken", "Pochend, auch nachts": "Zonklama, geceleri de", "Zahnfleisch blutet": "Diş eti kanıyor", Geschwollen: "Şişlik", "Etwas ist abgebrochen": "Bir parça kırıldı", "Zahn oder Füllung ist locker": "Diş veya dolgu sallanıyor",
    Stechend: "Batıcı", "Dumpf oder drückend": "Künt veya baskı yapan", Pochend: "Zonklayan", Brennend: "Yanan", "Kribbelnd oder taub": "Karıncalanma veya uyuşma", "Steif, schwer beweglich": "Sertlik, zor hareket", "Vor allem bei Bewegung": "Özellikle hareket ederken",
    "Gerötet": "Kızarıklık", "Juckt oder brennt": "Kaşıntı veya yanma", "Tränt": "Sulanma", "Trocken oder sandig": "Kuruluk veya kumlanma", "Ich sehe verschwommen": "Bulanık görüyorum", "Licht blendet": "Işık rahatsız ediyor", "Drückt oder schmerzt": "Baskı veya ağrı", "Blitze, Schatten oder Flecken": "Işık çakmaları, gölgeler veya lekeler",
    "Druck im Ohr": "Kulakta basınç", "Ich höre schlechter": "Daha kötü duyuyorum", "Ohrgeräusch, Pfeifen oder Rauschen": "Kulak çınlaması, ıslık veya uğultu", Schwindel: "Baş dönmesi", "Schmerzt beim Schlucken": "Yutkunurken ağrı", "Nase verstopft oder läuft": "Burun tıkalı veya akıyor", Heiser: "Ses kısıklığı", "Riechen oder Schmecken verändert": "Koku veya tat değişti",
    Juckt: "Kaşıntı", "Trocken oder schuppig": "Kuruluk veya pullanma", "Nässt oder verkrustet": "Sulanma veya kabuklanma", "Bläschen oder Pickel": "Kabarcık veya sivilce", "Fleck oder Muttermal verändert": "Leke veya ben değişti", "Brennt oder schmerzt": "Yanma veya ağrı",
    Heute: "Bugün", "Ein paar Tage": "Birkaç gün", Wochen: "Haftalar", "Monate oder länger": "Aylar veya daha uzun",
    "Schnell weniger Beschwerden": "Şikâyetlerin çabuk azalması", "Verstehen, woher es kommt": "Nedenini anlamak", "Kosten vorher kennen": "Maliyetleri önceden bilmek", "Ich bin nervös vor der Behandlung": "Tedaviden önce gerginim", "Nur Kontrolle oder Vorsorge": "Sadece kontrol veya koruyucu bakım",
    keine: "yok", leicht: "hafif", mittel: "orta", stark: "güçlü", "sehr stark": "çok güçlü",
  },
};

const AR: KurzPaket = {
  lang: "ar",
  seite: { R: "{x}، الجهة اليمنى", L: "{x}، الجهة اليسرى" },
  ui: {
    wo: "أين تشعرون بالأعراض؟", staerke: "ما مدى شدة الأعراض؟", seit: "منذ متى لديكم هذا؟", wannZahn: "متى تلاحظون ذلك؟", wieKoerper: "كيف تشعرون به؟", wasSonst: "ماذا تلاحظون؟", wichtig: "ما الأهم بالنسبة لكم في الموعد؟",
    unterZahn: "اضغطوا على السن (حتى {n}). لا داعي لمعرفة المكان بدقة.", unterWo: "اضغطوا على المكان (حتى {n}).", unterStaerke: "حرّكوا المؤشر: 0 تعني لا أعراض، و10 أشد ما يمكن تخيله.",
    eine: "إجابة واحدة تكفي.", mehrere: "يمكن اختيار عدة إجابات. إذا لم يناسب شيء، اضغطوا ببساطة على «التالي».", frage: "السؤال {i} من {n}", ansicht: "العرض", vorn: "من الأمام", hinten: "من الخلف",
    zahnSeite: "كما عند النظر في الفم: جهتكم اليمنى على يسار الصورة.", keine: "ليس لدي أعراض", entfernen: "إزالة: {ort}", gewaehlt: "اختياراتكم", bitteWaehlen: "يرجى الاختيار", vonZehn: "من 10",
    staerkeRegler: "شدة الأعراض من 0 إلى 10", staerkeWahl: "اختاروا الشدة", dringend: "عند الأعراض الشديدة جدًا، يرجى الاتصال بالعيادة مباشرة وعدم انتظار الموعد. في حالة الطوارئ اتصلوا بالرقم 112.",
    notiz: "هل تودون إخبار العيادة بشيء آخر؟ (اختياري)", notizPlatz: "بكلماتكم، جملتان على الأكثر", zurueck: "رجوع", weiter: "التالي", absenden: "إرسال", sendet: "جارٍ الإرسال …",
    fehler: "لم ينجح ذلك. يرجى المحاولة مرة أخرى.", fuss: "تصل إجاباتكم إلى {praxis} فقط. الاستبيان لا يضع تشخيصًا.", danke: "شكرًا، {name}.", dankeText: "استلمت {praxis} إجاباتكم ويمكنها الاستعداد لموعدكم.",
    uebersicht: "العودة إلى النظرة العامة", seitenTitel: "خمسة أسئلة قبل الموعد", seitenUnter: "يستغرق نحو دقيقة. هكذا تعرف {praxis} مسبقًا ما الأمر.",
    modellKoerper: "هذا نموذج لجسم، وليس جسمكم.", modellKopf: "هذا نموذج لرأس، وليس رأسكم.", modellGebiss: "هذا نموذج لأسنان، وليس أسنانكم.", drehen: "أديروا بإصبع واحد، وكبّروا بإصبعين. اضغطوا على المكان.", drehenMaus: "أديروا النموذج بالسحب بالفأرة، وكبّروا بعجلة الفأرة. انقروا على المكان.",
    laedt: "يجري تحميل النموذج ثلاثي الأبعاد. يمكنكم الضغط على الرسم من الآن.", gelenke: "إظهار المفاصل", darstellung: "طريقة العرض", schema: "رسم تخطيطي", liste: "اختيار المكان من قائمة", nachbar: "ليس تمامًا؟ السن المجاورة:",
    keinOrt: "لا يمكن اختيار مكان هنا. اضغطوا بجانبه قليلًا أو اختاروا من القائمة.", genug: "يمكنكم اختيار حتى {n} أماكن. يمكن إزالة مكان بالزر ✕.", schonGewaehlt: "تم اختيار ذلك بالفعل: {ort}. يمكنكم تغييره بالزر ✕.", zahn: "السن {nr}", oben: "الفك العلوي", unten: "الفك السفلي", rechts: "يمين", links: "يسار",
    g_kopf: "الرأس والرقبة", g_augen: "العينان", g_ohren: "الأذنان", g_gesicht: "الوجه", g_rumpf: "الصدر والبطن والأربية", g_ruecken: "الظهر", g_arme: "الذراعان واليدان", g_beine: "الساقان والقدمان", g_ueberall: "عدة أماكن", g_mund: "في الفم", g_zaehneOben: "الأسنان العلوية", g_zaehneUnten: "الأسنان السفلية",
    vorTermin: "قبل موعدكم", fuenf: "خمسة أسئلة قصيرة", fuenfText: "أظهروا على الصورة مكان الأعراض. يستغرق نحو دقيقة.", starten: "ابدأ", figurVorn: "الجسم من الأمام", figurHinten: "الجسم من الخلف", gebiss: "الأسنان: الفك العلوي في الأعلى والسفلي في الأسفل", modellAria: "نموذج لاختيار المكان",
  },
  w: {
    Kopf: "الرأس", Gesicht: "الوجه", Kiefergelenk: "مفصل الفك", Hals: "الرقبة", Nacken: "مؤخرة العنق", Auge: "العين", "Beide Augen": "العينان كلتاهما", Ohr: "الأذن", "Beide Ohren": "الأذنان كلتاهما", Nase: "الأنف", "Hals und Rachen": "الحلق", Stirn: "الجبهة", "Schläfe": "الصدغ", Wange: "الخد", "Mund und Lippen": "الفم والشفتان", Kinn: "الذقن",
    Brust: "الصدر", "Brust, Mitte": "الصدر، الوسط", Oberbauch: "أعلى البطن", Unterbauch: "أسفل البطن", Bauch: "البطن", Leiste: "الأربية", "Oberer Rücken": "أعلى الظهر", "Unterer Rücken": "أسفل الظهر", "Gesäß": "الأرداف",
    Schulter: "الكتف", Oberarm: "العضد", Ellenbogen: "المرفق", Unterarm: "الساعد", Handgelenk: "الرسغ", "Hand und Finger": "اليد والأصابع", "Hüfte": "الورك", Oberschenkel: "الفخذ", Knie: "الركبة", Unterschenkel: "أسفل الساق", "Wade und Achillessehne": "ربلة الساق ووتر أخيل", Sprunggelenk: "الكاحل", "Fuß": "القدم", "An vielen Stellen": "في أماكن كثيرة",
    Zahnfleisch: "اللثة", "Kiefer oder Kiefergelenk": "الفك أو مفصل الفك", "Zunge oder Mundboden": "اللسان أو قاع الفم", Gaumen: "الحنك", "Ich weiß nicht genau, wo": "لا أعرف المكان بالضبط",
    "Bei Kaltem": "مع البارد", "Bei Heißem oder Süßem": "مع الساخن أو الحلو", "Beim Kauen oder Aufbeißen": "عند المضغ أو العض", "Pochend, auch nachts": "نابض، في الليل أيضًا", "Zahnfleisch blutet": "نزيف اللثة", Geschwollen: "تورم", "Etwas ist abgebrochen": "انكسر جزء", "Zahn oder Füllung ist locker": "السن أو الحشوة متخلخلة",
    Stechend: "طاعن", "Dumpf oder drückend": "مكتوم أو ضاغط", Pochend: "نابض", Brennend: "حارق", "Kribbelnd oder taub": "وخز أو خدر", "Steif, schwer beweglich": "تيبس، صعوبة في الحركة", "Vor allem bei Bewegung": "خاصة عند الحركة",
    "Gerötet": "احمرار", "Juckt oder brennt": "حكة أو حرقة", "Tränt": "دموع", "Trocken oder sandig": "جفاف أو إحساس بالرمل", "Ich sehe verschwommen": "أرى بشكل ضبابي", "Licht blendet": "الضوء يبهرني", "Drückt oder schmerzt": "ضغط أو ألم", "Blitze, Schatten oder Flecken": "ومضات أو ظلال أو بقع",
    "Druck im Ohr": "ضغط في الأذن", "Ich höre schlechter": "أسمع بشكل أضعف", "Ohrgeräusch, Pfeifen oder Rauschen": "طنين أو صفير في الأذن", Schwindel: "دوار", "Schmerzt beim Schlucken": "ألم عند البلع", "Nase verstopft oder läuft": "انسداد الأنف أو سيلانه", Heiser: "بحة في الصوت", "Riechen oder Schmecken verändert": "تغير في الشم أو التذوق",
    Juckt: "حكة", "Trocken oder schuppig": "جفاف أو تقشر", "Nässt oder verkrustet": "نز أو قشور", "Bläschen oder Pickel": "بثور أو حبوب", "Fleck oder Muttermal verändert": "تغير في بقعة أو شامة", "Brennt oder schmerzt": "حرقة أو ألم",
    Heute: "اليوم", "Ein paar Tage": "بضعة أيام", Wochen: "أسابيع", "Monate oder länger": "أشهر أو أكثر",
    "Schnell weniger Beschwerden": "تخفيف الأعراض بسرعة", "Verstehen, woher es kommt": "فهم السبب", "Kosten vorher kennen": "معرفة التكاليف مسبقًا", "Ich bin nervös vor der Behandlung": "أشعر بالتوتر قبل العلاج", "Nur Kontrolle oder Vorsorge": "فحص أو وقاية فقط",
    keine: "لا شيء", leicht: "خفيفة", mittel: "متوسطة", stark: "شديدة", "sehr stark": "شديدة جدًا",
  },
};

export const KURZ_PAKETE: Record<PortalLang, KurzPaket> = { de: DE, en: EN, tr: TR, pl: PL, ru: RU, uk: UK, ar: AR };

/**
 * Fassung für Eltern: Wer für ein Kind antwortet, liest „Ihr Kind“ statt „Sie“. Es gilt dieselbe Regel wie im
 * Anamnesebogen (anspracheFuer in lib/anamneseProfile.ts): Kinder- und Jugendmedizin immer, sonst jünger als 16 Jahre
 * bzw. als `selbstAb` des Fachs. Hier stehen nur die Texte, die sich ändern. Die Akte der Praxis bleibt wie sonst.
 */
export const KURZ_UI_ELTERN = {
  wo: "Wo hat Ihr Kind Beschwerden?",
  seit: "Seit wann hat Ihr Kind das?",
  wannZahn: "Wann merkt Ihr Kind es?",
  wieKoerper: "Wie fühlt es sich für Ihr Kind an?",
  wasSonst: "Was bemerken Sie bei Ihrem Kind?",
  unterStaerke: "Schieben Sie den Regler: 0 bedeutet keine Beschwerden, 10 die stärksten, die man sich vorstellen kann.",
  zahnSeite: "Wie beim Blick in den Mund: Die rechte Seite Ihres Kindes liegt links im Bild.",
  keine: "Mein Kind hat keine Beschwerden",
  danke: "Danke für Ihre Angaben zu {name}.",
  dankeText: "{praxis} hat Ihre Antworten erhalten und kann sich auf den Termin Ihres Kindes vorbereiten.",
  modellKoerper: "Modell eines Körpers, nicht der Ihres Kindes.",
  modellKopf: "Modell eines Kopfes, nicht der Ihres Kindes.",
  modellGebiss: "Modell eines Gebisses, nicht das Ihres Kindes.",
} as const satisfies Partial<Record<KurzUiKey, string>>;
export type KurzElternKey = keyof typeof KURZ_UI_ELTERN;

/** Antworten in der Ich-Form, die für Eltern anders lauten (deutsches Wort → Fassung für Eltern). */
export const KURZ_W_ELTERN = ["Ich sehe verschwommen", "Ich höre schlechter", "Ich bin nervös vor der Behandlung"] as const;

export interface KurzEltern {
  ui: Record<KurzElternKey, string>;
  w: Record<(typeof KURZ_W_ELTERN)[number], string>;
}

export const KURZ_ELTERN: Record<PortalLang, KurzEltern> = {
  de: {
    ui: KURZ_UI_ELTERN,
    w: { "Ich sehe verschwommen": "Mein Kind sieht verschwommen", "Ich höre schlechter": "Mein Kind hört schlechter", "Ich bin nervös vor der Behandlung": "Mein Kind ist nervös vor der Behandlung" },
  },
  en: {
    ui: {
      wo: "Where does your child have symptoms?", seit: "Since when has your child had this?", wannZahn: "When does your child notice it?", wieKoerper: "What does it feel like for your child?", wasSonst: "What do you notice in your child?",
      unterStaerke: "Move the slider: 0 means no symptoms, 10 the strongest one can imagine.", zahnSeite: "As if looking into your child's mouth: your child's right side is on the left of the picture.",
      keine: "My child has no symptoms", danke: "Thank you for your answers about {name}.", dankeText: "{praxis} has received your answers and can prepare for your child's appointment.",
      modellKoerper: "A model of a body, not your child's.", modellKopf: "A model of a head, not your child's.", modellGebiss: "A model of teeth, not your child's.",
    },
    w: { "Ich sehe verschwommen": "My child's vision is blurred", "Ich höre schlechter": "My child hears less well", "Ich bin nervös vor der Behandlung": "My child is nervous about the treatment" },
  },
  tr: {
    ui: {
      wo: "Çocuğunuzun şikâyetleri nerede?", seit: "Çocuğunuzda bu ne zamandan beri var?", wannZahn: "Çocuğunuz bunu ne zaman fark ediyor?", wieKoerper: "Çocuğunuz bunu nasıl hissediyor?", wasSonst: "Çocuğunuzda ne fark ediyorsunuz?",
      unterStaerke: "Sürgüyü kaydırın: 0 şikâyet yok, 10 hayal edilebilecek en güçlü şikâyet demektir.", zahnSeite: "Çocuğunuzun ağzına bakar gibi: çocuğunuzun sağ tarafı resmin solundadır.",
      keine: "Çocuğumun şikâyeti yok", danke: "{name} hakkındaki bilgileriniz için teşekkürler.", dankeText: "{praxis} cevaplarınızı aldı ve çocuğunuzun randevusuna hazırlanabilir.",
      modellKoerper: "Bu bir vücut modelidir, çocuğunuzun vücudu değil.", modellKopf: "Bu bir baş modelidir, çocuğunuzun başı değil.", modellGebiss: "Bu bir diş modelidir, çocuğunuzun dişleri değil.",
    },
    w: { "Ich sehe verschwommen": "Çocuğum bulanık görüyor", "Ich höre schlechter": "Çocuğum daha kötü duyuyor", "Ich bin nervös vor der Behandlung": "Çocuğum tedaviden önce gergin" },
  },
  pl: {
    ui: {
      wo: "Gdzie dziecko ma dolegliwości?", seit: "Od kiedy dziecko to ma?", wannZahn: "Kiedy dziecko odczuwa dolegliwość?", wieKoerper: "Jak dziecko to odczuwa?", wasSonst: "Jakie objawy widać u dziecka?",
      unterStaerke: "Proszę przesunąć suwak: 0 oznacza brak dolegliwości, 10 najsilniejsze, jakie można sobie wyobrazić.", zahnSeite: "Jak przy zaglądaniu do ust dziecka: prawa strona dziecka jest po lewej stronie obrazka.",
      keine: "Moje dziecko nie ma dolegliwości", danke: "Dziękujemy za odpowiedzi dotyczące: {name}.", dankeText: "Odpowiedzi trafiły do: {praxis}. Gabinet może przygotować się do wizyty dziecka.",
      modellKoerper: "Model ciała, a nie ciało dziecka.", modellKopf: "Model głowy, a nie głowa dziecka.", modellGebiss: "Model uzębienia, a nie zęby dziecka.",
    },
    w: { "Ich sehe verschwommen": "Dziecko widzi niewyraźnie", "Ich höre schlechter": "Dziecko słyszy gorzej", "Ich bin nervös vor der Behandlung": "Dziecko denerwuje się przed leczeniem" },
  },
  ru: {
    ui: {
      wo: "Где у вашего ребёнка жалобы?", seit: "С какого времени это у ребёнка?", wannZahn: "Когда ребёнок это замечает?", wieKoerper: "Какое это ощущение у ребёнка?", wasSonst: "Что вы замечаете у ребёнка?",
      unterStaerke: "Передвиньте ползунок: 0 означает без жалоб, 10 означает самые сильные, какие можно представить.", zahnSeite: "Как при взгляде в рот ребёнка: правая сторона ребёнка слева на картинке.",
      keine: "У моего ребёнка нет жалоб", danke: "Спасибо за ответы о ребёнке: {name}.", dankeText: "{praxis} получила ваши ответы и может подготовиться к приёму ребёнка.",
      modellKoerper: "Это модель тела, а не тело вашего ребёнка.", modellKopf: "Это модель головы, а не голова вашего ребёнка.", modellGebiss: "Это модель зубов, а не зубы вашего ребёнка.",
    },
    w: { "Ich sehe verschwommen": "Ребёнок видит размыто", "Ich höre schlechter": "Ребёнок слышит хуже", "Ich bin nervös vor der Behandlung": "Ребёнок волнуется перед лечением" },
  },
  uk: {
    ui: {
      wo: "Де у вашої дитини скарги?", seit: "Відколи це в дитини?", wannZahn: "Коли дитина це помічає?", wieKoerper: "Яке це відчуття в дитини?", wasSonst: "Що ви помічаєте в дитини?",
      unterStaerke: "Пересуньте повзунок: 0 означає без скарг, 10 означає найсильніші, які можна уявити.", zahnSeite: "Як при погляді в рот дитини: правий бік дитини зліва на зображенні.",
      keine: "У моєї дитини немає скарг", danke: "Дякуємо за відповіді про дитину: {name}.", dankeText: "{praxis} отримала ваші відповіді і може підготуватися до прийому дитини.",
      modellKoerper: "Це модель тіла, а не тіло вашої дитини.", modellKopf: "Це модель голови, а не голова вашої дитини.", modellGebiss: "Це модель зубів, а не зуби вашої дитини.",
    },
    w: { "Ich sehe verschwommen": "Дитина бачить розмито", "Ich höre schlechter": "Дитина гірше чує", "Ich bin nervös vor der Behandlung": "Дитина хвилюється перед лікуванням" },
  },
  ar: {
    ui: {
      wo: "أين يشعر طفلكم بالأعراض؟", seit: "منذ متى لدى طفلكم هذا؟", wannZahn: "متى يلاحظ طفلكم ذلك؟", wieKoerper: "كيف يشعر به طفلكم؟", wasSonst: "ماذا تلاحظون لدى طفلكم؟",
      unterStaerke: "حرّكوا المؤشر: 0 تعني لا أعراض، و10 أشد ما يمكن تخيله.", zahnSeite: "كما عند النظر في فم طفلكم: جهته اليمنى على يسار الصورة.",
      keine: "ليس لدى طفلي أعراض", danke: "شكرًا على إجاباتكم عن {name}.", dankeText: "استلمت {praxis} إجاباتكم ويمكنها الاستعداد لموعد طفلكم.",
      modellKoerper: "هذا نموذج لجسم، وليس جسم طفلكم.", modellKopf: "هذا نموذج لرأس، وليس رأس طفلكم.", modellGebiss: "هذا نموذج لأسنان، وليس أسنان طفلكم.",
    },
    w: { "Ich sehe verschwommen": "طفلي يرى بشكل ضبابي", "Ich höre schlechter": "طفلي يسمع بشكل أضعف", "Ich bin nervös vor der Behandlung": "طفلي متوتر قبل العلاج" },
  },
};

/** Sprachpaket für die Seite. `eltern`: Fassung für Eltern (siehe KURZ_UI_ELTERN) über das Paket der Sprache legen. */
export const kurzPaket = (lang: string, opts: { eltern?: boolean } = {}): KurzPaket => {
  const p = KURZ_PAKETE[lang as PortalLang] ?? DE;
  if (!opts.eltern) return p;
  const e = KURZ_ELTERN[p.lang];
  return { ...p, ui: { ...p.ui, ...e.ui }, w: { ...p.w, ...e.w } };
};

/** Übersetzer für ein Paket: Oberfläche (t), Wörter (w) und Stellen mit Seite (ort). */
export function kurzUebersetzer(p: KurzPaket) {
  const ersetze = (s: string, werte?: Record<string, string | number>) => { if (werte) for (const [k, v] of Object.entries(werte)) s = s.split(`{${k}}`).join(String(v)); return s; };
  const t = (k: KurzUiKey, werte?: Record<string, string | number>) => ersetze(p.ui[k] ?? KURZ_UI[k], werte);
  const w = (de: string) => p.w[de] ?? de;
  const ort = (id: string): string => {
    if (id.startsWith("zahn:")) return t("zahn", { nr: id.slice(5) });
    const o = ORT_NACH.get(id);
    if (!o) return id;
    const basis = w(o.basis);
    if (!o.seite) return basis;
    const x = p.seite.klein ? basis.toLocaleLowerCase(p.lang === "tr" ? "tr" : p.lang) : basis;
    return p.seite[o.seite].replace("{x}", x);
  };
  const zeichen = (art: KurzArt, id: string) => w(ZEICHEN[art].find((z) => z.id === id)?.name ?? id);
  const staerke = (n: number) => w(n === 0 ? "keine" : n <= 3 ? "leicht" : n <= 6 ? "mittel" : n <= 8 ? "stark" : "sehr stark");
  return { t, w, ort, zeichen, staerke, lang: p.lang, dir: p.lang === "ar" ? ("rtl" as const) : ("ltr" as const) };
}
export type KurzT = ReturnType<typeof kurzUebersetzer>;
