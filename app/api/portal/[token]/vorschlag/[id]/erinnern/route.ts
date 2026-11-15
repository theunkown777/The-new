import { erinnernAntwort, zugangPortal } from "@/lib/patientAktionen";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ token: string; id: string }> };
const zugang = async (props: P) => { const p = await props.params; return zugangPortal(p.token, p.id); };
// „Erinnern Sie mich“ aus dem Patientenportal (lib/erinnerungWunsch.ts). Es geht keine Nachricht raus.
export const POST = async (req: Request, props: P) => erinnernAntwort(req, await zugang(props));
export const DELETE = async (req: Request, props: P) => erinnernAntwort(req, await zugang(props));
