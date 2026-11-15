import { leseLinkAntwort, zugangLink } from "@/lib/patientAktionen";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ token: string }> };
// Lese-Link für eine Vertrauensperson über den Patienten-Link (lib/leseLink.ts).
export const GET = async (req: Request, props: P) => leseLinkAntwort(req, await zugangLink((await props.params).token));
export const POST = async (req: Request, props: P) => leseLinkAntwort(req, await zugangLink((await props.params).token));
export const DELETE = async (req: Request, props: P) => leseLinkAntwort(req, await zugangLink((await props.params).token));
