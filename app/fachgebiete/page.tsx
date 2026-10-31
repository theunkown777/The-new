import { redirect } from "next/navigation";

// Die Fachauswahl ist jetzt die Startseite.
export default function SpecialtiesIndex() {
  redirect("/#fach");
}
