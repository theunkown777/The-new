import { aendern, loeschen, vorschlagUeberLink } from "@/lib/zweitmeinungApi";

export async function PATCH(req: Request, props: { params: Promise<{ token: string; zid: string }> }) {
  const params = await props.params;
  return aendern(req, await vorschlagUeberLink(params.token), params.zid);
}
export async function DELETE(req: Request, props: { params: Promise<{ token: string; zid: string }> }) {
  const params = await props.params;
  return loeschen(req, await vorschlagUeberLink(params.token), params.zid);
}
