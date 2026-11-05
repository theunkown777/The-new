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
  }
}
