import { aendern, loeschen, vorschlagUeberPortal } from "@/lib/zweitmeinungApi";

export async function PATCH(req: Request, props: { params: Promise<{ token: string; id: string; zid: string }> }) {
  const params = await props.params;
  return aendern(req, await vorschlagUeberPortal(params.token, params.id), params.zid);
}
export async function DELETE(req: Request, props: { params: Promise<{ token: string; id: string; zid: string }> }) {
  const params = await props.params;
  return loeschen(req, await vorschlagUeberPortal(params.token, params.id), params.zid);
}
