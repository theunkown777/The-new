import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appTextFuer } from "@/lib/fachText";

/** Fach der angemeldeten Praxis; je Anfrage einmal gelesen. null ohne Sitzung oder ohne Praxis. */
export const praxisFach = cache(async (): Promise<string | null> => {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const praxis = await prisma.practice.findUnique({ where: { id: session.user.practiceId }, select: { specialty: true } });
  return praxis?.specialty ?? null;
});

/** Für Server-Seiten der App: feste Texte in den Wörtern des Fachs der angemeldeten Praxis. */
export const praxisText = async (): Promise<(text: string) => string> => appTextFuer(await praxisFach());
