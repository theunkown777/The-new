import { permanentRedirect } from "next/navigation";

// Zahnmedizin hat jetzt dieselbe Fachseite wie alle anderen Fächer.
// Alte Links und Suchergebnisse auf /zahnmedizin führen dorthin.
export default function Zahnmedizin() {
  permanentRedirect("/fachgebiete/zahn");
}
