import { aendern, loeschen, vorschlagUeberPortal } from "@/lib/zweitmeinungApi";

export async function PATCH(req: Request, { params }: { params: { token: string; id: string; zid: string } }) {
  return aendern(req, await vorschlagUeberPortal(params.token, params.id), params.zid);
}
export async function DELETE(req: Request, { params }: { params: { token: string; id: string; zid: string } }) {
  return loeschen(req, await vorschlagUeberPortal(params.token, params.id), params.zid);
}
