// Geburtsdatum-Prüfung im Patientenportal (Sicherheitsbericht S5).
//
// Der Portal-Link allein reicht zum Ansehen. Vor rechtlich oder finanziell
// bindenden Handlungen (Einverständnis unterschreiben, Lastschriftmandat
// erteilen) bestätigt der Patient zusätzlich sein Geburtsdatum. Diese Datei
// enthält nur reine Logik und Texte, ohne Node-Module und ohne Datenbank,
// damit auch Client-Komponenten sie nutzen können. Signatur der Bestätigung:
// lib/portalPruefungCookie.ts, Datenbank und Cookie: lib/portalPruefungServer.ts.

export const MAX_FEHLVERSUCHE = 5;
/** Erste Sperre; jede weitere Sperre in Folge dauert doppelt so lang. */
export const SPERRE_MINUTEN = 15;
export const SPERRE_MAX_MINUTEN = 24 * 60;
/** So lange gilt eine richtige Eingabe, ohne dass erneut gefragt wird. */
export const BESTAETIGUNG_MINUTEN = 30;

const TZ = "Europe/Berlin";

/** Kalendertag in deutscher Zeit als "JJJJ-MM-TT", unabhängig von der Zeitzone des Servers. */
export function berlinTag(d: Date): string {
  const teile = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const t = (art: string) => teile.find((p) => p.type === art)?.value ?? "";
  return `${t("year").padStart(4, "0")}-${t("month")}-${t("day")}`;
}

/**
 * Eingabe aus drei Feldern in "JJJJ-MM-TT" wandeln. null bei allem, was kein
 * echter Kalendertag ist (31.02., Jahr zweistellig, Zukunft, Buchstaben).
 */
export function eingabeTag(e: { tag: unknown; monat: unknown; jahr: unknown }, now = new Date()): string | null {
  const zahl = (v: unknown, stellen: RegExp) => {
    const s = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim() : "";
    return stellen.test(s) ? Number(s) : null;
  };
  const tag = zahl(e.tag, /^\d{1,2}$/);
  const monat = zahl(e.monat, /^\d{1,2}$/);
  const jahr = zahl(e.jahr, /^\d{4}$/);
  if (tag === null || monat === null || jahr === null) return null;
  if (jahr < 1900 || monat < 1 || monat > 12 || tag < 1 || tag > 31) return null;
  const probe = new Date(Date.UTC(jahr, monat - 1, tag));
  if (probe.getUTCFullYear() !== jahr || probe.getUTCMonth() !== monat - 1 || probe.getUTCDate() !== tag) return null;
  const key = `${String(jahr).padStart(4, "0")}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
  return key > berlinTag(now) ? null : key;
}

/**
 * Stimmt die Eingabe mit dem hinterlegten Geburtsdatum überein? Verglichen wird
 * der Kalendertag in deutscher Zeit, so wie die Praxis das Datum sieht. Das
 * Ergebnis ist nur ja oder nein; es gibt keine Auskunft, wie nah die Eingabe war.
 */
export function geburtsdatumStimmt(hinterlegt: Date, eingabe: string | null): boolean {
  if (!eingabe) return false;
  const soll = berlinTag(hinterlegt);
  if (soll.length !== eingabe.length) return false;
  let diff = 0;
  for (let i = 0; i < soll.length; i++) diff |= soll.charCodeAt(i) ^ eingabe.charCodeAt(i);
  return diff === 0;
}

/** Dauer der nächsten Sperre: 15 Minuten, dann 30, 60 … höchstens 24 Stunden. */
export function sperrMinuten(bisherigeSperren: number): number {
  const n = Math.max(0, Math.min(Math.floor(bisherigeSperren) || 0, 20));
  return Math.min(SPERRE_MAX_MINUTEN, SPERRE_MINUTEN * 2 ** n);
}

/** Restdauer einer laufenden Sperre in vollen Minuten, 0 = nicht gesperrt. */
export function restSperre(gesperrtBis: Date | null | undefined, now = Date.now()): number {
  if (!gesperrtBis) return 0;
  const ms = gesperrtBis.getTime() - now;
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

export type FehlversuchFolge = { gesperrt: false; rest: number } | { gesperrt: true; bis: Date; minuten: number };

/**
 * Was nach einem falschen Datum gilt. `fehler` zählt diesen Versuch schon mit,
 * `sperren` sind die bisherigen Sperren in Folge für diesen Link.
 */
export function nachFehlversuch(fehler: number, sperren: number, now = Date.now()): FehlversuchFolge {
  if (fehler < MAX_FEHLVERSUCHE) return { gesperrt: false, rest: MAX_FEHLVERSUCHE - fehler };
  const minuten = sperrMinuten(sperren);
  return { gesperrt: true, bis: new Date(now + minuten * 60_000), minuten };
}

// ---------------------------------------------------------------------------
// Antworten der API (die Oberfläche übersetzt anhand von `code`)

export type PruefStatus = "noetig" | "bestaetigt" | "ohne";
export type PruefCode = "PRUEFUNG_NOETIG" | "FALSCH" | "GESPERRT" | "UNVOLLSTAENDIG" | "OHNE_GEBURTSDATUM" | "ZU_VIELE";
export const PRUEFUNG_NOETIG: PruefCode = "PRUEFUNG_NOETIG";

/** Vermerk für die Praxis (Vorschlag, PDF, Zahlungen). */
export function pruefVermerk(geprueftAt: Date | null | undefined): string {
  return geprueftAt
    ? `Geburtsdatum im Portal bestätigt am ${geprueftAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: TZ })}`
    : "Ohne Geburtsdatum-Prüfung";
}

// ---------------------------------------------------------------------------
// Texte. Bewusst als Partial<Record<string, …>> mit Rückfall auf Deutsch:
// Kommt im Portal eine neue Sprache dazu, fehlt hier höchstens die Übersetzung.

export type PruefText = {
  titel: string;
  grundUnterschrift: string;
  grundLastschrift: string;
  feld: string;
  tag: string;
  monat: string;
  jahr: string;
  platzhalter: [string, string, string];
  senden: string;
  laeuft: string;
  unvollstaendig: string;
  falsch: (rest: number) => string;
  gesperrt: (minuten: number) => string;
  abgelaufen: string;
  bestaetigt: string;
  ohneGeburtsdatum: string;
  zuViele: string;
  fehler: string;
  demo: (datum: string) => string;
};

const dauerDe = (min: number) => (min >= 120 ? `etwa ${Math.round(min / 60)} Stunden` : min === 1 ? "1 Minute" : `${min} Minuten`);
const dauerEn = (min: number) => (min >= 120 ? `about ${Math.round(min / 60)} hours` : min === 1 ? "1 minute" : `${min} minutes`);

const DE: PruefText = {
  titel: "Bitte bestätigen Sie Ihr Geburtsdatum",
  grundUnterschrift: "Bevor Sie unterschreiben, fragen wir zur Sicherheit Ihr Geburtsdatum ab. So kann niemand in Ihrem Namen unterschreiben, der nur Ihren Link kennt.",
  grundLastschrift: "Bevor Sie eine Lastschrift erteilen, fragen wir zur Sicherheit Ihr Geburtsdatum ab. So kann niemand in Ihrem Namen ein Mandat erteilen, der nur Ihren Link kennt.",
  feld: "Ihr Geburtsdatum",
  tag: "Tag",
  monat: "Monat",
  jahr: "Jahr",
  platzhalter: ["TT", "MM", "JJJJ"],
  senden: "Geburtsdatum bestätigen",
  laeuft: "Wird geprüft …",
  unvollstaendig: "Bitte geben Sie Tag, Monat und Jahr (vierstellig) Ihres Geburtsdatums ein.",
  falsch: (rest) => `Das Geburtsdatum stimmt nicht mit den Angaben Ihrer Praxis überein. Sie haben noch ${rest === 1 ? "1 Versuch" : `${rest} Versuche`}.`,
  gesperrt: (min) => `Zu viele Fehlversuche. Zu Ihrem Schutz ist die Bestätigung für ${dauerDe(min)} gesperrt. Bitte versuchen Sie es danach erneut oder wenden Sie sich an Ihre Praxis.`,
  abgelaufen: "Ihre Bestätigung ist abgelaufen. Bitte bestätigen Sie Ihr Geburtsdatum noch einmal.",
  bestaetigt: "Geburtsdatum bestätigt",
  ohneGeburtsdatum: "Lastschrift ist hier erst möglich, wenn Ihre Praxis Ihr Geburtsdatum hinterlegt hat. Bitte überweisen Sie den Betrag oder sprechen Sie Ihre Praxis an.",
  zuViele: "Zu viele Anfragen. Bitte später erneut versuchen.",
  fehler: "Das hat nicht geklappt. Bitte versuchen Sie es erneut.",
  demo: (datum) => `Demo: Das Geburtsdatum dieses Beispielpatienten ist ${datum}.`,
};

const EN: PruefText = {
  titel: "Please confirm your date of birth",
  grundUnterschrift: "Before you sign, we ask for your date of birth as a safeguard. This way nobody who only has your link can sign in your name.",
  grundLastschrift: "Before you authorise a direct debit, we ask for your date of birth as a safeguard. This way nobody who only has your link can authorise a mandate in your name.",
  feld: "Your date of birth",
  tag: "Day",
  monat: "Month",
  jahr: "Year",
  platzhalter: ["DD", "MM", "YYYY"],
  senden: "Confirm date of birth",
  laeuft: "Checking …",
  unvollstaendig: "Please enter the day, month and year (four digits) of your date of birth.",
  falsch: (rest) => `The date of birth does not match your practice's records. You have ${rest === 1 ? "1 attempt" : `${rest} attempts`} left.`,
  gesperrt: (min) => `Too many failed attempts. For your protection, confirmation is locked for ${dauerEn(min)}. Please try again afterwards or contact your practice.`,
  abgelaufen: "Your confirmation has expired. Please confirm your date of birth again.",
  bestaetigt: "Date of birth confirmed",
  ohneGeburtsdatum: "Direct debit is only available here once your practice has your date of birth on file. Please pay by bank transfer or contact your practice.",
  zuViele: "Too many requests. Please try again later.",
  fehler: "That did not work. Please try again.",
  demo: (datum) => `Demo: this sample patient's date of birth is ${datum}.`,
};

/** Zahlwort für slawische Sprachen: eins (1, 21 …), wenige (2–4, 22–24 …), viele (0, 5–20 …). */
const slawisch = (n: number, eins: string, wenige: string, viele: string) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  return a > 10 && a < 20 ? viele : b === 1 ? eins : b >= 2 && b <= 4 ? wenige : viele;
};
const stunden = (min: number) => Math.round(min / 60);

const TR: PruefText = {
  titel: "Lütfen doğum tarihinizi onaylayın",
  grundUnterschrift: "İmzalamadan önce güvenlik amacıyla doğum tarihinizi soruyoruz. Böylece yalnızca bağlantınızı bilen biri sizin adınıza imza atamaz.",
  grundLastschrift: "Otomatik ödeme talimatı (Lastschrift) vermeden önce güvenlik amacıyla doğum tarihinizi soruyoruz. Böylece yalnızca bağlantınızı bilen biri sizin adınıza talimat veremez.",
  feld: "Doğum tarihiniz",
  tag: "Gün",
  monat: "Ay",
  jahr: "Yıl",
  platzhalter: ["GG", "AA", "YYYY"],
  senden: "Doğum tarihini onayla",
  laeuft: "Kontrol ediliyor …",
  unvollstaendig: "Lütfen doğum tarihinizin gününü, ayını ve yılını (dört haneli) girin.",
  falsch: (rest) => `Doğum tarihi muayenehanenizdeki kayıtla uyuşmuyor. ${rest} deneme hakkınız kaldı.`,
  gesperrt: (min) => `Çok fazla hatalı deneme yapıldı. Güvenliğiniz için onay ${min >= 120 ? `yaklaşık ${stunden(min)} saat` : `${min} dakika`} süreyle kilitlendi. Lütfen daha sonra yeniden deneyin veya muayenehanenize başvurun.`,
  abgelaufen: "Onayınızın süresi doldu. Lütfen doğum tarihinizi yeniden onaylayın.",
  bestaetigt: "Doğum tarihi onaylandı",
  ohneGeburtsdatum: "Otomatik ödeme talimatı burada ancak muayenehaneniz doğum tarihinizi kaydettikten sonra mümkündür. Lütfen tutarı havale ile ödeyin veya muayenehanenize başvurun.",
  zuViele: "Çok fazla istek gönderildi. Lütfen daha sonra yeniden deneyin.",
  fehler: "İşlem başarısız oldu. Lütfen yeniden deneyin.",
  demo: (datum) => `Demo: Bu örnek hastanın doğum tarihi ${datum}.`,
};

const UK: PruefText = {
  titel: "Будь ласка, підтвердьте Вашу дату народження",
  grundUnterschrift: "Перш ніж Ви підпишете, ми з міркувань безпеки запитуємо Вашу дату народження. Так ніхто, хто знає лише Ваше посилання, не зможе підписати від Вашого імені.",
  grundLastschrift: "Перш ніж Ви надасте дозвіл на пряме списання коштів (Lastschrift), ми з міркувань безпеки запитуємо Вашу дату народження. Так ніхто, хто знає лише Ваше посилання, не зможе надати такий дозвіл від Вашого імені.",
  feld: "Ваша дата народження",
  tag: "День",
  monat: "Місяць",
  jahr: "Рік",
  platzhalter: ["ДД", "ММ", "РРРР"],
  senden: "Підтвердити дату народження",
  laeuft: "Перевіряємо …",
  unvollstaendig: "Будь ласка, введіть день, місяць і рік (чотири цифри) Вашої дати народження.",
  falsch: (rest) => `Дата народження не збігається з даними Вашої практики. Залишилося спроб: ${rest}.`,
  gesperrt: (min) =>
    `Забагато невдалих спроб. Для Вашого захисту підтвердження заблоковано на ${min >= 120 ? `приблизно ${stunden(min)} ${slawisch(stunden(min), "годину", "години", "годин")}` : `${min} ${slawisch(min, "хвилину", "хвилини", "хвилин")}`}. Будь ласка, спробуйте пізніше або зверніться до Вашої практики.`,
  abgelaufen: "Термін дії Вашого підтвердження минув. Будь ласка, підтвердьте дату народження ще раз.",
  bestaetigt: "Дату народження підтверджено",
  ohneGeburtsdatum: "Пряме списання коштів тут можливе лише після того, як Ваша практика внесе Вашу дату народження. Будь ласка, сплатіть суму банківським переказом або зверніться до Вашої практики.",
  zuViele: "Забагато запитів. Будь ласка, спробуйте пізніше.",
  fehler: "Не вдалося. Будь ласка, спробуйте ще раз.",
  demo: (datum) => `Демо: дата народження цього умовного пацієнта — ${datum}.`,
};

const RU: PruefText = {
  titel: "Пожалуйста, подтвердите Вашу дату рождения",
  grundUnterschrift: "Прежде чем Вы подпишете, мы в целях безопасности запрашиваем Вашу дату рождения. Так никто, кто знает только Вашу ссылку, не сможет подписать от Вашего имени.",
  grundLastschrift: "Прежде чем Вы дадите разрешение на прямое списание средств (Lastschrift), мы в целях безопасности запрашиваем Вашу дату рождения. Так никто, кто знает только Вашу ссылку, не сможет дать такое разрешение от Вашего имени.",
  feld: "Ваша дата рождения",
  tag: "День",
  monat: "Месяц",
  jahr: "Год",
  platzhalter: ["ДД", "ММ", "ГГГГ"],
  senden: "Подтвердить дату рождения",
  laeuft: "Проверяем …",
  unvollstaendig: "Пожалуйста, введите день, месяц и год (четыре цифры) Вашей даты рождения.",
  falsch: (rest) => `Дата рождения не совпадает с данными Вашей практики. Осталось попыток: ${rest}.`,
  gesperrt: (min) =>
    `Слишком много неудачных попыток. Для Вашей защиты подтверждение заблокировано на ${min >= 120 ? `примерно ${stunden(min)} ${slawisch(stunden(min), "час", "часа", "часов")}` : `${min} ${slawisch(min, "минуту", "минуты", "минут")}`}. Пожалуйста, попробуйте позже или обратитесь в Вашу практику.`,
  abgelaufen: "Срок действия Вашего подтверждения истёк. Пожалуйста, подтвердите дату рождения ещё раз.",
  bestaetigt: "Дата рождения подтверждена",
  ohneGeburtsdatum: "Прямое списание средств здесь возможно только после того, как Ваша практика внесёт Вашу дату рождения. Пожалуйста, оплатите сумму банковским переводом или обратитесь в Вашу практику.",
  zuViele: "Слишком много запросов. Пожалуйста, попробуйте позже.",
  fehler: "Не получилось. Пожалуйста, попробуйте ещё раз.",
  demo: (datum) => `Демо: дата рождения этого условного пациента — ${datum}.`,
};

const PL: PruefText = {
  titel: "Proszę potwierdzić swoją datę urodzenia",
  grundUnterschrift: "Przed złożeniem podpisu dla bezpieczeństwa pytamy o Pani/Pana datę urodzenia. Dzięki temu nikt, kto zna tylko Pani/Pana link, nie może podpisać w Pani/Pana imieniu.",
  grundLastschrift: "Przed udzieleniem zgody na polecenie zapłaty (Lastschrift) dla bezpieczeństwa pytamy o Pani/Pana datę urodzenia. Dzięki temu nikt, kto zna tylko Pani/Pana link, nie może udzielić takiej zgody w Pani/Pana imieniu.",
  feld: "Pani/Pana data urodzenia",
  tag: "Dzień",
  monat: "Miesiąc",
  jahr: "Rok",
  platzhalter: ["DD", "MM", "RRRR"],
  senden: "Potwierdź datę urodzenia",
  laeuft: "Sprawdzanie …",
  unvollstaendig: "Proszę podać dzień, miesiąc i rok (cztery cyfry) swojej daty urodzenia.",
  falsch: (rest) => `Data urodzenia nie zgadza się z danymi w gabinecie. Pozostało prób: ${rest}.`,
  gesperrt: (min) =>
    `Zbyt wiele nieudanych prób. Dla Pani/Pana bezpieczeństwa potwierdzenie zostało zablokowane na ${min >= 120 ? `około ${stunden(min)} ${slawisch(stunden(min), "godzinę", "godziny", "godzin")}` : `${min} ${slawisch(min, "minutę", "minuty", "minut")}`}. Proszę spróbować ponownie później lub skontaktować się z gabinetem.`,
  abgelaufen: "Pani/Pana potwierdzenie wygasło. Proszę ponownie potwierdzić datę urodzenia.",
  bestaetigt: "Data urodzenia potwierdzona",
  ohneGeburtsdatum: "Polecenie zapłaty jest tutaj możliwe dopiero wtedy, gdy gabinet zapisze Pani/Pana datę urodzenia. Proszę zapłacić przelewem lub skontaktować się z gabinetem.",
  zuViele: "Zbyt wiele zapytań. Proszę spróbować ponownie później.",
  fehler: "Nie udało się. Proszę spróbować ponownie.",
  demo: (datum) => `Demo: data urodzenia tego przykładowego pacjenta to ${datum}.`,
};

// Arabisch läuft von rechts nach links. Ganze Sätze stehen als rechts-nach-links-Insel (RLI … PDI),
// damit Satzzeichen und Zahlen auch dann richtig stehen, wenn das umgebende Formular kein dir="rtl" setzt.
const rtl = (s: string) => `\u2067${s}\u2069`;
const dauerAr = (min: number) => {
  if (min >= 120) {
    const h = stunden(min);
    return h === 2 ? "نحو ساعتين" : h <= 10 ? `نحو ${h} ساعات` : `نحو ${h} ساعة`;
  }
  return min === 1 ? "دقيقة واحدة" : min === 2 ? "دقيقتين" : min <= 10 ? `${min} دقائق` : `${min} دقيقة`;
};

const AR: PruefText = {
  titel: "يُرجى تأكيد تاريخ ميلادكم",
  grundUnterschrift: rtl("قبل التوقيع نسأل عن تاريخ ميلادكم حرصًا على الأمان. بذلك لا يستطيع من يعرف رابطكم فقط أن يوقّع باسمكم."),
  grundLastschrift: rtl("قبل منح تفويض الخصم المباشر من الحساب (Lastschrift) نسأل عن تاريخ ميلادكم حرصًا على الأمان. بذلك لا يستطيع من يعرف رابطكم فقط أن يمنح تفويضًا باسمكم."),
  feld: "تاريخ ميلادكم",
  tag: "اليوم",
  monat: "الشهر",
  jahr: "السنة",
  platzhalter: ["يوم", "شهر", "سنة"],
  senden: "تأكيد تاريخ الميلاد",
  laeuft: rtl("جارٍ التحقق …"),
  unvollstaendig: rtl("يُرجى إدخال اليوم والشهر والسنة (بأربعة أرقام) لتاريخ ميلادكم."),
  falsch: (rest) => rtl(`تاريخ الميلاد لا يطابق البيانات المسجلة لدى عيادتكم. عدد المحاولات المتبقية: ${rest}.`),
  gesperrt: (min) => rtl(`محاولات خاطئة كثيرة. لحمايتكم تم إيقاف التأكيد لمدة ${dauerAr(min)}. يُرجى المحاولة لاحقًا أو التواصل مع عيادتكم.`),
  abgelaufen: rtl("انتهت صلاحية تأكيدكم. يُرجى تأكيد تاريخ ميلادكم مرة أخرى."),
  bestaetigt: "تم تأكيد تاريخ الميلاد",
  ohneGeburtsdatum: rtl("الخصم المباشر من الحساب غير ممكن هنا إلا بعد أن تسجّل عيادتكم تاريخ ميلادكم. يُرجى تحويل المبلغ مصرفيًا أو التواصل مع عيادتكم."),
  zuViele: rtl("طلبات كثيرة جدًا. يُرجى المحاولة لاحقًا."),
  fehler: rtl("لم تنجح العملية. يُرجى المحاولة مرة أخرى."),
  demo: (datum) => rtl(`عرض تجريبي: تاريخ ميلاد هذا المريض النموذجي هو ${datum}.`),
};

export const PRUEF_TEXTE: Partial<Record<string, PruefText>> = { de: DE, en: EN, tr: TR, uk: UK, ru: RU, pl: PL, ar: AR };

/** Texte in der Sprache des Portals, sonst Deutsch. */
export function pruefText(lang: string | null | undefined): PruefText {
  return (lang && Object.prototype.hasOwnProperty.call(PRUEF_TEXTE, lang) ? PRUEF_TEXTE[lang] : undefined) ?? DE;
}

/** Fehlertext zu einer API-Antwort. */
export function pruefFehlerText(t: PruefText, d: { code?: string; rest?: number; minuten?: number } | null | undefined): string {
  switch (d?.code) {
    case "FALSCH": return t.falsch(Math.max(1, Number(d.rest) || 1));
    case "GESPERRT": return t.gesperrt(Math.max(1, Number(d.minuten) || SPERRE_MINUTEN));
    case "UNVOLLSTAENDIG": return t.unvollstaendig;
    case "OHNE_GEBURTSDATUM": return t.ohneGeburtsdatum;
    case "ZU_VIELE": return t.zuViele;
    case "PRUEFUNG_NOETIG": return t.abgelaufen;
    default: return t.fehler;
  }
}
