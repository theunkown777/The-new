import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const report = await prisma.report.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
  });
  if (!report) return NextResponse.json({ error: "Bericht nicht gefunden" }, { status: 404 });

  const revisions = await prisma.reportRevision.findMany({
    where: { reportId: params.id },
    orderBy: { createdAt: "desc" },
    include: { editedBy: { select: { name: true } } },
  });

  return NextResponse.json({ revisions });
}
