import { anlegen, vorschlagUeberPortal } from "@/lib/zweitmeinungApi";

export async function POST(req: Request, { params }: { params: { token: string; id: string } }) {
  return anlegen(req, await vorschlagUeberPortal(params.token, params.id));
}
