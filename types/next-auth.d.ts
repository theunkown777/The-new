import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      practiceId: string;
      practiceName: string;
      mfaPending?: boolean;
    };
  }

  interface User {
    id: string;
    role: string;
    practiceId: string;
    practiceName: string;
    /** Zwei-Faktor-Pflicht, aber noch nicht eingerichtet: API gesperrt bis zur Neuanmeldung mit 2FA. */
    mfaPending?: boolean;
    /** Stand des Kontos bei der Anmeldung (User.sessionVersion). */
    sessionVersion?: number;
    /** Konto einer Demo-Praxis (Gastzugang). */
    demo?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    practiceId: string;
    practiceName: string;
    /** Zwei-Faktor-Pflicht, aber noch nicht eingerichtet: API gesperrt bis zur Neuanmeldung mit 2FA. */
    mfaPending?: boolean;
    /** Stand des Kontos bei der Anmeldung; weicht er vom Konto ab, ist die Sitzung ungültig (lib/sitzung.ts). */
    sessionVersion?: number;
    /** Sitzung widerrufen: Konto entfernt oder Stand veraltet. */
    widerrufen?: boolean;
    /** Sitzung einer Demo-Praxis (Gastzugang). Nur für das Vorschau-Schloss in der Stufe „demo“ (lib/vorschau.ts); Rechte hängen nicht daran. */
    demo?: boolean;
  }
}
