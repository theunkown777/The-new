"use client";

import { useEffect, useState } from "react";
import { Hinweis } from "@/components/Hinweis";
import { ROLLEN, ROLLEN_HINWEIS, ROLLEN_LABEL, freigabeLabel, rollenLabel, type Rolle } from "@/lib/rollen";
import { STANDORT_HINWEIS } from "@/lib/standortRechte";

type Member = { id: string; name: string; email: string; role: string; canSeeAnalytics?: boolean; createdAt: string; standortIds?: string[] };
type Standort = { id: string; name: string };
type Invite = { id: string; email: string; role: string; createdAt: string; expiresAt: string };

export function TeamSettings({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [standorte, setStandorte] = useState<Standort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Rolle>("staff");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/settings/team")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users ?? []);
        setInvites(data.invites ?? []);
        setStandorte(data.standorte ?? []);
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
    setInviteUrl(data.inviteUrl ?? null);
    setInviteMessage(
      data.inviteUrl
        ? "Einladung angelegt. Es wurde keine Mail verschickt. Geben Sie diesen Link an die Person weiter (7 Tage gültig):"
        : "Einladung verschickt.",
    );
    load();
  }

  async function changeRole(userId: string, role: Rolle) {
    setError(null);
    if (userId === currentUserId && role !== "admin" && !confirm("Sie nehmen sich selbst die Rechte der Geschäftsführung. Danach können Sie Team und Einstellungen nicht mehr verwalten. Fortfahren?")) return;
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

  // Standorte ankreuzen: leer = alle Standorte.
  async function setOrte(userId: string, standortIds: string[]) {
    setError(null);
    setUsers((list) => list.map((u) => (u.id === userId ? { ...u, standortIds } : u)));
    const res = await fetch(`/api/settings/team/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ standorte: standortIds }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Ändern fehlgeschlagen.");
      load();
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

      <div className="card p-0" data-hilfe="team-liste">
        <h2 className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Mitglieder
        </h2>
        <div className="divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">
                  {u.name} {u.id === currentUserId && <span className="text-xs text-slate-500">(Sie)</span>}
                </div>
                <div className="text-xs text-slate-500 [overflow-wrap:anywhere]">{u.email}</div>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-700">
                  <span className="sr-only">Rolle von {u.name}</span>
                  <select
                    className="input w-auto py-1 text-xs"
                    value={(ROLLEN as readonly string[]).includes(u.role) ? u.role : "behandler"}
                    onChange={(e) => changeRole(u.id, e.target.value as Rolle)}
                    aria-label={`Rolle von ${u.name}`}
                    data-testid={`rolle-${u.id}`}
                  >
                    {ROLLEN.map((r) => (
                      <option key={r} value={r}>{ROLLEN_LABEL[r]}</option>
                    ))}
                  </select>
                </label>
                {u.role === "admin" ? (
                  <span className="text-xs text-slate-500">Zahlungen und Analyse: immer</span>
                ) : (
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700" data-testid={`analyse-freigabe-${u.id}`}>
                    <input type="checkbox" checked={!!u.canSeeAnalytics} onChange={(e) => setAnalytics(u.id, e.target.checked)} />
                    {freigabeLabel(u.role)}
                  </label>
                )}
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
              {standorte.length > 0 && (
                <fieldset className="w-full border-t border-slate-100 pt-2" data-testid={`standorte-${u.id}`}>
                  <legend className="sr-only">Standorte von {u.name}</legend>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
                    <span className="font-medium text-slate-600" aria-hidden="true">Standorte:</span>
                    {u.role === "admin" ? (
                      <span className="text-slate-500">alle (Geschäftsführung sieht immer alle Standorte)</span>
                    ) : (
                      <>
                        {standorte.map((o) => {
                          const an = (u.standortIds ?? []).includes(o.id);
                          return (
                            <label key={o.id} className="flex min-h-[24px] cursor-pointer items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={an}
                                onChange={(e) => setOrte(u.id, e.target.checked ? [...(u.standortIds ?? []), o.id] : (u.standortIds ?? []).filter((id) => id !== o.id))}
                                data-testid={`standort-${u.id}-${o.id}`}
                              />
                              {o.name}
                            </label>
                          );
                        })}
                        <span className="text-slate-500" data-testid={`standorte-stand-${u.id}`}>{(u.standortIds ?? []).length === 0 ? "nichts angekreuzt = alle Standorte" : `nur ${(u.standortIds ?? []).length === 1 ? "dieser Standort" : "diese Standorte"}`}</span>
                      </>
                    )}
                  </div>
                </fieldset>
              )}
            </div>
          ))}
        </div>
      </div>

      {invites.length > 0 && (
        <div className="card p-0">
          <h2 className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ausstehende Einladungen
          </h2>
          <div className="divide-y divide-slate-100">
            {invites.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{inv.email}</div>
                  <div className="text-xs text-slate-500">
                    {rollenLabel(inv.role)} · gültig bis{" "}
                    {new Date(inv.expiresAt).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" data-hilfe="team-einladen">
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
              onChange={(e) => setInviteRole(e.target.value as Rolle)}
              data-testid="einladung-rolle"
            >
              <option value="staff">Mitarbeiter/in (Analyse nur mit Freigabe)</option>
              <option value="behandler">Behandler/in (ohne Verwaltung)</option>
              <option value="admin">Geschäftsführung (alles inkl. Analyse)</option>
            </select>
          </div>
          <button type="submit" disabled={inviting} className="btn-primary">
            {inviting ? "Sendet…" : "Einladen"}
          </button>
        </form>
        {inviteMessage && <p className="mt-2 text-sm text-green-700">{inviteMessage}</p>}
        {inviteUrl && (
          <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700" data-testid="invite-link">
            {inviteUrl}
          </p>
        )}
      </div>

      <Hinweis id="team-rollen" titel="Was die Rollen dürfen" ebene={2} className="text-sm" testid="rollen-erklaerung">
        <div className="space-y-3">
        <dl className="space-y-2">
          {ROLLEN.map((r) => (
            <div key={r}>
              <dt className="font-medium text-slate-800">{ROLLEN_LABEL[r]}</dt>
              <dd className="text-slate-600">{ROLLEN_HINWEIS[r]}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-slate-500">Eine neue Rolle gilt sofort; die Person wird dafür einmal abgemeldet und meldet sich neu an.</p>
        <h3 className="pt-1 font-medium text-slate-900">Standorte</h3>
        <p className="text-slate-600" data-testid="standort-hinweis">{STANDORT_HINWEIS}</p>
        {standorte.length === 0 && (
          <p className="text-xs text-slate-500">Ihre Praxis hat noch keine Standorte angelegt. Das geht unter Einstellungen → Standorte; danach können Sie hier ankreuzen, wer wo arbeitet.</p>
        )}
        </div>
      </Hinweis>
    </div>
  );
}
