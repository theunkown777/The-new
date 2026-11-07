import { anlegen, vorschlagUeberLink } from "@/lib/zweitmeinungApi";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  return anlegen(req, await vorschlagUeberLink(params.token));
}
