import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDental } from "@/lib/specialties";
import { kiHilfenStand } from "@/lib/kiHilfen";
import { HilfePraxis } from "@/components/HilfePraxis";
import { RundgangStart } from "@/components/RundgangStart";

export const metadata = { title: "Frag Sorrida" };

export default async function HilfePraxisPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const praxis = await prisma.practice.findUnique({ where: { id: session.user.practiceId }, select: { specialty: true, kiHilfen: true } });
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-slate-900">Frag Sorrida</h1>
      <p className="mb-6 text-sm text-slate-500">Fragen zur Bedienung: Wo finde ich was, und wie geht es? Die Antworten kommen aus einer festen Sammlung von Hilfetexten.</p>
      <HilfePraxis fach={isDental(praxis?.specialty) ? "zahn" : "andere"} ki={kiHilfenStand(praxis?.kiHilfen).aktiv} />
      {/* Rundgang neu starten (components/RundgangStart.tsx) */}
      <RundgangStart userId={session.user.id} practiceId={session.user.practiceId} />
    </div>
  );
}
