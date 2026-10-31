"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className = "text-sm font-medium text-brand-100 hover:text-white" }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className}
    >
      Abmelden
    </button>
  );
}
