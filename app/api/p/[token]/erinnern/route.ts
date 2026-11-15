import { erinnernAntwort, zugangLink } from "@/lib/patientAktionen";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ token: string }> };
// „Erinnern Sie mich“ über den Patienten-Link (lib/erinnerungWunsch.ts). Es geht keine Nachricht raus.
export const POST = async (req: Request, props: P) => erinnernAntwort(req, await zugangLink((await props.params).token));
export const DELETE = async (req: Request, props: P) => erinnernAntwort(req, await zugangLink((await props.params).token));
