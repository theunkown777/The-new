import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { praxisFach } from "@/lib/katalogScope";
import { PatientNeuForm } from "@/components/PatientNeuForm";

// Neu anlegen: das Formular spricht mit dem Personenwort des Fachs (Patient, Kunde, Klient, Frau).
export default async function NewPatientPage() {
  const session = await getServerSession(authOptions);
  return <PatientNeuForm fach={await praxisFach(session!.user.practiceId)} />;
}
