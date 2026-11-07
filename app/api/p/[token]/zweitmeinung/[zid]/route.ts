import { aendern, loeschen, vorschlagUeberLink } from "@/lib/zweitmeinungApi";

export async function PATCH(req: Request, { params }: { params: { token: string; zid: string } }) {
  return aendern(req, await vorschlagUeberLink(params.token), params.zid);
}
export async function DELETE(req: Request, { params }: { params: { token: string; zid: string } }) {
  return loeschen(req, await vorschlagUeberLink(params.token), params.zid);
}
