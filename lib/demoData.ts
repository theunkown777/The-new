// Erfundene Patientendaten für Demo-Praxen. Deterministisch über einen
// Startwert, damit Tests stabil sind. Namen sind häufige Vor- und Nachnamen
// in Deutschland, bewusst gemischt; Kombinationen sind Zufall.

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FEMALE = ["Anna", "Maria", "Sophie", "Laura", "Julia", "Lea", "Lena", "Hannah", "Emma", "Mia", "Sarah", "Lisa", "Katharina", "Johanna", "Sabine", "Petra", "Claudia", "Andrea", "Monika", "Ursula", "Ingrid", "Renate", "Helga", "Karin", "Birgit", "Susanne", "Nicole", "Stefanie", "Melanie", "Christina", "Elif", "Ayşe", "Fatma", "Zeynep", "Natalia", "Olga", "Anastasia", "Marta", "Agnieszka", "Fatima", "Amira", "Giulia", "Sofia", "Elena", "Charlotte", "Clara", "Marie", "Greta", "Ida", "Frieda"];
const MALE = ["Peter", "Thomas", "Michael", "Andreas", "Stefan", "Klaus", "Jürgen", "Wolfgang", "Hans", "Uwe", "Frank", "Markus", "Christian", "Daniel", "Tobias", "Jan", "Lukas", "Felix", "Jonas", "Leon", "Paul", "Ben", "Finn", "Elias", "Noah", "Max", "Moritz", "Sebastian", "Florian", "Matthias", "Mehmet", "Ali", "Mustafa", "Can", "Emre", "Dmitri", "Sergej", "Piotr", "Tomasz", "Ahmad", "Omar", "Luca", "Marco", "Alessandro", "Nikola", "Karl", "Heinz", "Dieter", "Günter", "Bernd"];
const LAST = ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger", "Hofmann", "Hartmann", "Lange", "Schmitt", "Werner", "Schmitz", "Krause", "Meier", "Lehmann", "Schmid", "Schulze", "Maier", "Köhler", "Herrmann", "König", "Walter", "Mayer", "Huber", "Kaiser", "Fuchs", "Peters", "Lang", "Scholz", "Möller", "Weiß", "Jung", "Hahn", "Schubert", "Vogel", "Friedrich", "Keller", "Günther", "Frank", "Berger", "Winkler", "Roth", "Beck", "Lorenz", "Baumann", "Franke", "Albrecht", "Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Nowak", "Kowalski", "Wiśniewski", "Ivanov", "Popov", "Rossi", "Russo", "Nguyen", "Haddad", "Al-Masri", "Kovačević", "Horvat"];
const GKV = ["AOK", "Techniker Krankenkasse", "Barmer", "DAK-Gesundheit", "IKK classic", "KKH", "hkk", "BKK firmus", "Knappschaft", "SBK"];
const PKV = ["Debeka", "Allianz Private", "AXA", "DKV", "Signal Iduna", "HUK-Coburg", "Barmenia"];

export type Profile = { minAge: number; maxAge: number; meanAge: number; female: number };

/** Alters- und Geschlechterverteilung je Fach, grob nach typischem Patientengut. */
export function profileFor(fach: string): Profile {
  switch (fach) {
    case "kinder":
      return { minAge: 0, maxAge: 17, meanAge: 7, female: 0.49 };
    case "gyn":
      return { minAge: 16, maxAge: 85, meanAge: 42, female: 1 };
    case "uro":
      return { minAge: 18, maxAge: 90, meanAge: 61, female: 0.18 };
    case "logo":
    case "ergo":
      return { minAge: 3, maxAge: 90, meanAge: 30, female: 0.45 };
    case "podo":
    case "kardio":
    case "endo":
      return { minAge: 30, maxAge: 95, meanAge: 66, female: 0.5 };
    case "ortho":
    case "physio":
    case "radiologie":
      return { minAge: 12, maxAge: 92, meanAge: 52, female: 0.55 };
    case "aesthetik":
      return { minAge: 20, maxAge: 75, meanAge: 44, female: 0.8 };
    default:
      return { minAge: 0, maxAge: 95, meanAge: 45, female: 0.52 };
  }
}

export type DemoPatientRow = {
  firstName: string;
  lastName: string;
  birthDate: Date;
  sex: "W" | "M";
  insuranceType: "GKV" | "PKV";
  insuranceName: string;
};

const pick = <T,>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length)];

/** Annähernd normalverteiltes Alter, auf den Bereich des Fachs begrenzt. */
function age(r: () => number, p: Profile): number {
  const g = (r() + r() + r() + r() - 2) / 2; // ca. -1..1
  const span = Math.max(p.meanAge - p.minAge, p.maxAge - p.meanAge);
  return Math.round(Math.min(p.maxAge, Math.max(p.minAge, p.meanAge + g * span)));
}

export function generatePatients(count: number, fach: string, seed: number, today = new Date()): DemoPatientRow[] {
  const r = rng(seed);
  const p = profileFor(fach);
  const out: DemoPatientRow[] = [];
  for (let i = 0; i < count; i++) {
    const female = r() < p.female;
    const a = age(r, p);
    const birth = new Date(Date.UTC(today.getFullYear() - a, Math.floor(r() * 12), 1 + Math.floor(r() * 28)));
    const pkv = r() < 0.12;
    out.push({
      firstName: pick(r, female ? FEMALE : MALE),
      lastName: pick(r, LAST),
      birthDate: birth,
      sex: female ? "W" : "M",
      insuranceType: pkv ? "PKV" : "GKV",
      insuranceName: pkv ? pick(r, PKV) : pick(r, GKV),
    });
  }
  return out;
}

export const ageOn = (birth: Date, today = new Date()) => {
  let a = today.getFullYear() - birth.getUTCFullYear();
  if (today.getMonth() < birth.getUTCMonth() || (today.getMonth() === birth.getUTCMonth() && today.getDate() < birth.getUTCDate())) a--;
  return a;
};
