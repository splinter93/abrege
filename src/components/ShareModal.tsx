"use client";

import { useCallback, useEffect, useState } from "react";
import { X, UserMinus, Info } from "lucide-react";

import "@/app/private/settings/settings.css";

export type ShareResourceType = "classeur" | "folder" | "note";

export interface ShareModalProps {
  resourceType: ShareResourceType;
  /** Always the parent classeur UUID, even when resourceType is "folder" or "note". */
  resourceRef: string;
  resourceName: string;
  onClose: () => void;
  getAccessToken: () => Promise<string | null>;
}

interface TeammateRow {
  id: string;
  otherUserId: string;
  name: string;
  email: string;
  since: string;
}

interface ActiveShareRow {
  shareId: string;
  sharedWith: string;
  name: string;
  email: string;
  permissionLevel: string;
  createdAt: string;
}

async function parseJsonSafe(res: Response): Promise<{ error?: string } & Record<string, unknown>> {
  try {
    return (await res.json()) as { error?: string } & Record<string, unknown>;
  } catch {
    return {};
  }
}

const RESOURCE_LABEL: Record<ShareResourceType, string> = {
  classeur: "Classeur",
  folder: "Dossier",
  note: "Note",
};

export default function ShareModal({
  resourceType,
  resourceRef,
  resourceName,
  onClose,
  getAccessToken,
}: ShareModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teammates, setTeammates] = useState<TeammateRow[]>([]);
  const [activeShares, setActiveShares] = useState<ActiveShareRow[]>([]);
  const [selectedTeammateId, setSelectedTeammateId] = useState<string>("");
  const [permissionLevel, setPermissionLevel] = useState<"read" | "write">("read");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Session expirée.");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      // resourceRef is always the parent classeur ID, regardless of resourceType.
      const [tmRes, shRes] = await Promise.all([
        fetch("/api/v2/teammates", { headers }),
        fetch(`/api/v2/classeur/${encodeURIComponent(resourceRef)}/share`, { headers }),
      ]);

      if (!tmRes.ok) {
        const j = await parseJsonSafe(tmRes);
        throw new Error(typeof j.error === "string" ? j.error : "Coéquipiers indisponibles");
      }
      const tmJson = (await tmRes.json()) as {
        teammates?: Array<{ id: string; otherUserId: string; name: string; email: string; since: string }>;
      };
      setTeammates(tmJson.teammates ?? []);

      if (!shRes.ok) {
        const j = await parseJsonSafe(shRes);
        throw new Error(typeof j.error === "string" ? j.error : "Partages indisponibles");
      }
      const shJson = (await shRes.json()) as {
        items?: Array<{
          shareId: string;
          sharedWith: string;
          name: string;
          email: string;
          permissionLevel: string;
          createdAt: string;
        }>;
      };
      setActiveShares(
        (shJson.items ?? []).map((i) => ({
          shareId: i.shareId,
          sharedWith: i.sharedWith,
          name: i.name,
          email: i.email,
          permissionLevel: i.permissionLevel,
          createdAt: i.createdAt,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, resourceRef]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleShare = useCallback(async () => {
    if (!selectedTeammateId) {
      setError("Choisissez un coéquipier.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Session expirée.");
        return;
      }
      const res = await fetch(`/api/v2/classeur/${encodeURIComponent(resourceRef)}/share`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teammate_id: selectedTeammateId,
          permission_level: permissionLevel,
        }),
      });
      const j = await parseJsonSafe(res);
      if (!res.ok) {
        throw new Error(typeof j.error === "string" ? j.error : "Échec du partage");
      }
      setSelectedTeammateId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }, [getAccessToken, load, permissionLevel, resourceRef, selectedTeammateId]);

  const handleRevoke = useCallback(
    async (shareId: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const token = await getAccessToken();
        if (!token) {
          setError("Session expirée.");
          return;
        }
        const res = await fetch(
          `/api/v2/classeur/${encodeURIComponent(resourceRef)}/share/${encodeURIComponent(shareId)}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        );
        const j = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(typeof j.error === "string" ? j.error : "Révocation impossible");
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setSubmitting(false);
      }
    },
    [getAccessToken, load, resourceRef],
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="settings-api-key-edit-modal relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl border border-white/[0.1] bg-[#141414] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <div className="settings-api-key-edit-modal__header flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="share-modal-title" className="settings-api-key-edit-modal__title">
              Partager
            </h3>
            <p className="mt-1 truncate text-xs text-zinc-500">
              {RESOURCE_LABEL[resourceType]} · <span className="text-zinc-400">{resourceName}</span>
            </p>
          </div>
          <button
            type="button"
            className="settings-api-key-edit-modal__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="settings-api-key-edit-modal__body max-h-[60vh] overflow-y-auto no-scrollbar">
          {loading ? (
            <p className="text-sm text-zinc-500">Chargement…</p>
          ) : (
            <>
              {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

              {resourceType !== "classeur" && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/[0.07] px-3 py-2.5">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" aria-hidden />
                  <p className="text-xs text-blue-300/90">
                    Le partage s&apos;applique au <strong>classeur parent</strong> et donne accès à l&apos;intégralité de son contenu.
                  </p>
                </div>
              )}

              <p className="settings-api-key-edit-modal__section-title">Coéquipier</p>
              {teammates.length === 0 ? (
                <p className="mb-4 text-sm text-zinc-500">
                  Aucun coéquipier accepté. Invitez des coéquipiers depuis{" "}
                  <span className="text-zinc-400">Partage &amp; équipe</span>.
                </p>
              ) : (
                <select
                  className="settings-v-input mb-4 w-full"
                  value={selectedTeammateId}
                  onChange={(e) => setSelectedTeammateId(e.target.value)}
                >
                  <option value="">— Sélectionner —</option>
                  {teammates.map((t) => (
                    <option key={t.otherUserId} value={t.otherUserId}>
                      {t.name} ({t.email || t.otherUserId})
                    </option>
                  ))}
                </select>
              )}

              <p className="settings-api-key-edit-modal__section-title">Droit</p>
              <div className="mb-4 flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="radio"
                    name="perm"
                    checked={permissionLevel === "read"}
                    onChange={() => setPermissionLevel("read")}
                  />
                  Lecture
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="radio"
                    name="perm"
                    checked={permissionLevel === "write"}
                    onChange={() => setPermissionLevel("write")}
                  />
                  Édition
                </label>
              </div>

              <div className="settings-api-key-edit-modal__footer border-t border-white/[0.08] pt-4">
                <button
                  type="button"
                  className="settings-v-btn w-full sm:w-auto"
                  disabled={submitting || teammates.length === 0 || !selectedTeammateId}
                  onClick={() => void handleShare()}
                >
                  {submitting ? "Envoi…" : "Partager"}
                </button>
              </div>

              <p className="settings-api-key-edit-modal__section-title mt-6">Partages actifs</p>
              {activeShares.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucun partage sur ce classeur.</p>
              ) : (
                <ul className="space-y-2">
                  {activeShares.map((s) => (
                    <li
                      key={s.shareId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-200">{s.name}</div>
                        <div className="truncate text-xs text-zinc-500">
                          {s.email} · {s.permissionLevel === "write" ? "Édition" : "Lecture"}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="settings-v-btn-secondary inline-flex shrink-0 items-center gap-1 px-2 py-1 text-xs"
                        disabled={submitting}
                        onClick={() => void handleRevoke(s.shareId)}
                      >
                        <UserMinus className="h-3.5 w-3.5" aria-hidden />
                        Révoquer
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
