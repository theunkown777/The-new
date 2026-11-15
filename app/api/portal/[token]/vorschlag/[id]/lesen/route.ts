import { leseLinkAntwort, zugangPortal } from "@/lib/patientAktionen";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ token: string; id: string }> };
const zugang = async (props: P) => { const p = await props.params; return zugangPortal(p.token, p.id); };
// Lese-Link für eine Vertrauensperson aus dem Patientenportal (lib/leseLink.ts).
export const GET = async (req: Request, props: P) => leseLinkAntwort(req, await zugang(props));
export const POST = async (req: Request, props: P) => leseLinkAntwort(req, await zugang(props));
export const DELETE = async (req: Request, props: P) => leseLinkAntwort(req, await zugang(props));
