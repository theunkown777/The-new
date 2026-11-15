import { anlegen, vorschlagUeberLink } from "@/lib/zweitmeinungApi";

export async function POST(req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return anlegen(req, await vorschlagUeberLink(params.token));
}
