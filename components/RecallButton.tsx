"use client";

import { useRouter } from "next/navigation";
import { PortalLinkButton } from "@/components/PortalLinkButton";
import { recallText } from "@/lib/recall";

export function RecallButton({ patientId, firstName, practiceName, leistung, hinweis }: { patientId: string; firstName: string; practiceName: string; leistung: string; hinweis: string }) {
  const router = useRouter();
  return (
    <PortalLinkButton
      patientId={patientId}
      firstName={firstName}
      practiceName={practiceName}
      label="Erinnerung erstellen"
      copyLabel="Text kopieren"
      message={(url) => recallText({ firstName, practiceName, leistung, hinweis, url })}
      onCreated={async () => {
        await fetch(`/api/patients/${patientId}/recall`, { method: "POST" });
        router.refresh();
      }}
    />
  );
}
