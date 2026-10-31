"use client";

import { useEffect, useState } from "react";

type Member = { id: string; name: string; email: string; role: string; canSeeAnalytics?: boolean; createdAt: string };
type Invite = { id: string; email: string; role: string; createdAt: string; expiresAt: string };

export function TeamSettings({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "staff">("staff");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/settings/team")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users ?? []);
        setInvites(data.invites ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMessage(null);
    setError(null);

    const res = await fetch("/api/settings/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    setInviting(false);

    if (!res.ok) {
      setError(data.error ?? "Einladung fehlgeschlagen.");
      return;
    }
    setInviteEmail("");
    setInviteMessage("Einladung verschickt.");
    load();
  }

  async function changeRole(userId: string, role: "admin" | "staff") {
    setError(null);
    const res = await fetch(`/api/settings/team/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Ändern fehlgeschlagen.");
      return;
    }
    load();
  }

  async function setAnalytics(userId: string, canSeeAnalytics: boolean) {
    setError(null);
    // Sofort anzeigen, bei Fehler lädt load() den echten Stand zurück.
    setUsers((list) => list.map((u) => (u.id === userId ? { ...u, canSeeAnalytics } : u)));
    const res = await fetch(`/api/settings/team/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canSeeAnalytics }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Ändern fehlgeschlagen.");
      load();
      return;
    }
  }

  async function removeUser(userId: string) {
    if (!confirm("Dieses Konto wirklich entfernen? Die Person kann sich danach nicht mehr anmelden.")) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/settings/team/${userId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Entfernen fehlgeschlagen.");
      return;
    }
    load();
  }

  if (loading) return <div className="card text-sm text-slate-500">Lädt…</div>;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="card p-0">
        <h2 className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Mitglieder
        </h2>
        <div className="divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {u.name} {u.id === currentUserId && <span className="text-xs text-slate-400">(Sie)</span>}
                </div>
                <div className="text-xs text-slate-400">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    u.role === "admin"
                      ? "rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                      : "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                  }
                >
                  {u.role === "admin" ? "Geschäftsführung" : "Mitarbeiter/in"}
                </span>
                {u.role === "admin" ? (
                  <span className="text-xs text-slate-500">Analyse: immer</span>
                ) : (
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700" data-testid={`analyse-freigabe-${u.id}`}>
                    <input type="checkbox" checked={!!u.canSeeAnalytics} onChange={(e) => setAnalytics(u.id, e.target.checked)} />
                    Analyse freigeben
                  </label>
                )}
                <button
                  type="button"
                  className="text-xs font-medium text-brand-600 hover:underline"
                  onClick={() => changeRole(u.id, u.role === "admin" ? "staff" : "admin")}
                >
                  {u.role === "admin" ? "Zu Mitarbeiter/in machen" : "Zur Geschäftsführung machen"}
                </button>
                {u.id !== currentUserId && (
                  <button
                    type="button"
                    className="text-xs font-medium text-red-600 hover:underline"
                    onClick={() => removeUser(u.id)}
                  >
                    Entfernen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {invites.length > 0 && (
        <div className="card p-0">
          <h2 className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Ausstehende Einladungen
          </h2>
          <div className="divide-y divide-slate-100">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{inv.email}</div>
                  <div className="text-xs text-slate-400">
                    {inv.role === "admin" ? "Geschäftsführung" : "Mitarbeiter/in"} · gültig bis{" "}
                    {new Date(inv.expiresAt).toLocaleDateString("de-DE")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="mb-3 font-medium text-slate-900">Mitglied einladen</h2>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="label" htmlFor="invite-email">E-Mail</label>
            <input
              id="invite-email"
              type="email"
              required
              className="input"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="invite-role">Rolle</label>
            <select
              id="invite-role"
              className="input"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "staff")}
            >
              <option value="staff">Mitarbeiter/in (Analyse nur mit Freigabe)</option>
              <option value="admin">Geschäftsführung (alles inkl. Analyse)</option>
            </select>
          </div>
          <button type="submit" disabled={inviting} className="btn-primary">
            {inviting ? "Sendet…" : "Einladen"}
          </button>
        </form>
        {inviteMessage && <p className="mt-2 text-sm text-green-700">{inviteMessage}</p>}
        <p className="mt-3 text-xs text-slate-400">
          Admins können praxisweite Einstellungen (Abrechnung, Katalog, Team) ändern; Staff kann
          Patienten und Berichte bearbeiten, aber keine dieser Einstellungen.
        </p>
      </div>
    </div>
  );
}
