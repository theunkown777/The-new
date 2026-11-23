"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Kein gültiger Bestätigungslink.");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setStatus("error");
          setError(data.error ?? "Bestätigung fehlgeschlagen.");
          return;
        }
        setStatus("ok");
      });
  }, [token]);

  if (status === "pending") return <p className="text-sm text-slate-500">Wird bestätigt…</p>;

  if (status === "error") {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }

  return (
    <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
      E-Mail-Adresse bestätigt. Vielen Dank!
    </p>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="website flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">E-Mail-Bestätigung</h1>
        <Suspense fallback={null}>
          <VerifyEmailInner />
        </Suspense>
        <p className="mt-4 text-sm text-slate-500">
          <Link href="/dashboard" className="font-medium text-brand-600 hover:underline">
            Zur App
          </Link>
        </p>
      </div>
    </main>
  );
}
