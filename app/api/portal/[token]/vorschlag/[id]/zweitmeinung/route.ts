import { anlegen, vorschlagUeberPortal } from "@/lib/zweitmeinungApi";

export async function POST(req: Request, props: { params: Promise<{ token: string; id: string }> }) {
  const params = await props.params;
  return anlegen(req, await vorschlagUeberPortal(params.token, params.id));
}
