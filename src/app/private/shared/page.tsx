"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import PageWithSidebarLayout from "@/components/PageWithSidebarLayout";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { SimpleLoadingState } from "@/components/DossierLoadingStates";
import "@/components/DossierLoadingStates.css";
import {
  Check,
  FolderInput,
  Inbox,
  Mail,
  SendHorizontal,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import "@/styles/main.css";
import "@/app/private/settings/settings.css";

interface TeammateRequest {
  id: string;
  direction: "incoming" | "outgoing";
  name: string;
  email: string;
  avatar: string | null;
  sentAt: string;
}

interface Teammate {
  id: string;
  otherUserId: string;
  name: string;
  email: string;
  avatar: string | null;
  since: string;
}

interface SharedNotePreview {
  id: string;
  title: string;
  author: string;
  authorHint: string;
  sharedAt: string;
  access: "lecture" | "édition";
  kind: "note";
}

interface SharedFolderPreview {
  id: string;
  classeurId: string;
  title: string;
  author: string;
  authorHint: string;
  sharedAt: string;
  access: "lecture" | "édition";
  kind: "classeur";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

export default function SharedNotesPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <PageWithSidebarLayout>
          <SharedWorkspaceContent />
        </PageWithSidebarLayout>
      </AuthGuard>
    </ErrorBoundary>
  );
}

function SharedWorkspaceContent() {
  const { user, getAccessToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const inviteInputRef = useRef<HTMLInputElement>(null);

  const [incoming, setIncoming] = useState<TeammateRequest[]>([]);
  const [outgoing, setOutgoing] = useState<TeammateRequest[]>([]);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [received, setReceived] = useState<(SharedNotePreview | SharedFolderPreview)[]>([]);
  const [sent] = useState<SharedNotePreview[]>([]);

  const refreshAll = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setLoadError("Session expirée.");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const [tmRes, shRes] = await Promise.all([
        fetch("/api/v2/teammates", { headers }),
        fetch("/api/v2/classeur/shared", { headers }),
      ]);
      if (!tmRes.ok) {
        const j = (await tmRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Impossible de charger les coéquipiers");
      }
      const tm = (await tmRes.json()) as {
        incoming?: TeammateRequest[];
        outgoing?: TeammateRequest[];
        teammates?: Teammate[];
      };
      setIncoming(tm.incoming ?? []);
      setOutgoing(tm.outgoing ?? []);
      setTeammates(tm.teammates ?? []);

      if (shRes.ok) {
        const sh = (await shRes.json()) as {
          items?: Array<{
            shareId: string;
            classeurId: string;
            name: string;
            sharedBy: string;
            sharedByEmail: string;
            sharedAt: string;
            permissionLevel: string;
          }>;
        };
        const items = sh.items ?? [];
        setReceived(
          items.map((it) => ({
            id: it.shareId,
            classeurId: it.classeurId,
            title: it.name,
            author: it.sharedBy,
            authorHint: it.sharedByEmail || "coéquipier",
            sharedAt: it.sharedAt,
            access: it.permissionLevel === "write" ? "édition" : "lecture",
            kind: "classeur" as const,
          })),
        );
      } else {
        setReceived([]);
        setLoadError("Impossible de charger les classeurs reçus.");
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!user?.id) return;
    void refreshAll();
  }, [user?.id, refreshAll]);

  const submitInvite = useCallback(async () => {
    const email = inviteEmail.trim();
    if (!email) {
      setInviteFeedback("Saisissez un e-mail ou un nom d'utilisateur.");
      return;
    }
    setInviteFeedback(null);
    setInviteSending(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setInviteFeedback("Session expirée.");
        return;
      }
      const res = await fetch("/api/v2/teammates", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; request?: TeammateRequest };
      if (!res.ok) {
        setInviteFeedback(j.error || "Invitation impossible.");
        return;
      }
      if (j.request) {
        setOutgoing((prev) => [j.request!, ...prev]);
      }
      setInviteEmail("");
      setInviteFeedback(null);
      setInviteModalOpen(false);
    } catch {
      setInviteFeedback("Erreur réseau.");
    } finally {
      setInviteSending(false);
    }
  }, [getAccessToken, inviteEmail]);

  const handleInviteSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      void submitInvite();
    },
    [submitInvite],
  );

  useEffect(() => {
    if (!inviteModalOpen) return;
    const t = window.setTimeout(() => inviteInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [inviteModalOpen]);

  useEffect(() => {
    if (!inviteModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInviteModalOpen(false);
        setInviteFeedback(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inviteModalOpen]);

  const patchTeammate = useCallback(
    async (id: string, status: "accepted" | "blocked") => {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/v2/teammates/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        void refreshAll();
      } else {
        const j = await res.json().catch(() => ({})) as { error?: string };
        setLoadError(j.error ?? "Mise à jour impossible. Réessayez.");
      }
    },
    [getAccessToken, refreshAll],
  );

  const deleteTeammateRow = useCallback(
    async (id: string) => {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/v2/teammates/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        void refreshAll();
      } else {
        const j = await res.json().catch(() => ({})) as { error?: string };
        setLoadError(j.error ?? "Suppression impossible. Réessayez.");
      }
    },
    [getAccessToken, refreshAll],
  );

  const openSharedClasseur = useCallback(
    (classeurId: string) => {
      router.push(`/private/dossiers?classeur=${encodeURIComponent(classeurId)}`);
    },
    [router],
  );

  return (
    <div className="page-content-inner page-content-inner-shared flex min-h-full w-full flex-col bg-[var(--color-bg-primary)]">
      <div className="settings-page-shell flex min-h-0 flex-1 flex-col">
        <header className="settings-page-header shrink-0 pb-6 pt-10 sm:pb-8 sm:pt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 font-sans">
              <h1 className="bg-gradient-to-b from-white to-white/55 bg-clip-text pb-0.5 text-3xl font-bold leading-snug tracking-tight text-transparent sm:pb-1 sm:text-4xl">
                Partage & équipe
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-zinc-500">
                Invitez des coéquipiers, acceptez les demandes et retrouvez ici les classeurs partagés
                avec vous.
              </p>
              {loadError ? (
                <p className="mt-2 text-sm text-red-400">{loadError}</p>
              ) : null}
            </div>
          </div>
        </header>

        <main className="settings-page-main no-scrollbar min-h-0 flex-1 overflow-y-auto pb-8 sm:pb-10">
          {loading ? (
            <div className="flex flex-1 justify-center py-20">
              <SimpleLoadingState message="Chargement…" />
            </div>
          ) : (
            <div className="flex w-full flex-col gap-8">
              {/* Coéquipiers */}
              <motion.section
                className="settings-v-section"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0 }}
              >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="settings-v-title mb-0">Coéquipiers</h2>
                  <button
                    type="button"
                    className="settings-v-btn w-full shrink-0 sm:w-auto"
                    onClick={() => {
                      setInviteModalOpen(true);
                      setInviteFeedback(null);
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <UserPlus className="h-3.5 w-3.5" aria-hidden />
                      Inviter
                    </span>
                  </button>
                </div>
                <div className="settings-v-card">
                  {incoming.length > 0 ? (
                    <>
                      <p className="shared-v-list-heading">Demandes entrantes</p>
                      <div className="settings-api-key-list">
                        {incoming.map((r, index) => (
                          <div
                            key={r.id}
                            className="settings-api-key-list__item border-b [border-bottom:var(--border-block)] last:border-b-0"
                          >
                            <motion.div
                              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: index * 0.04 }}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                {r.avatar ? (
                                  <img
                                    src={r.avatar}
                                    alt={r.name}
                                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className="settings-v-avatar flex h-10 w-10 shrink-0 items-center justify-center text-xs font-semibold text-zinc-300"
                                    aria-hidden
                                  >
                                    {initials(r.name)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-[var(--color-text-primary,#ededed)]">
                                    {r.name}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--color-text-secondary,#a1a1aa)]">
                                    <span className="inline-flex items-center gap-1">
                                      <Mail className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                                      {r.email}
                                    </span>
                                    <span className="opacity-50">·</span>
                                    <span>Envoyée le {new Date(r.sentAt).toLocaleDateString("fr-FR")}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="settings-v-btn"
                                  onClick={() => void patchTeammate(r.id, "accepted")}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <Check className="h-3.5 w-3.5" aria-hidden />
                                    Accepter
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className="settings-v-btn-secondary"
                                  onClick={() => void patchTeammate(r.id, "blocked")}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <X className="h-3.5 w-3.5" aria-hidden />
                                    Refuser
                                  </span>
                                </button>
                              </div>
                            </motion.div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {outgoing.length > 0 ? (
                    <>
                      <p className="shared-v-list-heading">Invitations envoyées</p>
                      <div className="settings-api-key-list">
                        {outgoing.map((r, index) => (
                          <div
                            key={r.id}
                            className="settings-api-key-list__item border-b [border-bottom:var(--border-block)] last:border-b-0"
                          >
                            <motion.div
                              className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: index * 0.04 }}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                {r.avatar ? (
                                  <img
                                    src={r.avatar}
                                    alt={r.name}
                                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className="settings-v-avatar flex h-10 w-10 shrink-0 items-center justify-center text-xs font-semibold text-zinc-300"
                                    aria-hidden
                                  >
                                    {initials(r.name)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-[var(--color-text-primary,#ededed)]">
                                    {r.name}
                                  </div>
                                  <div className="mt-0.5 text-xs text-[var(--color-text-secondary,#a1a1aa)]">
                                    {r.email} · En attente · {new Date(r.sentAt).toLocaleDateString("fr-FR")}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="settings-v-btn-secondary shrink-0"
                                onClick={() => void deleteTeammateRow(r.id)}
                              >
                                Annuler l’invitation
                              </button>
                            </motion.div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {teammates.length === 0 ? (
                    <div className="shared-v-empty">
                      <strong>Aucun coéquipier pour l’instant</strong>
                      Utilisez le bouton « Inviter » pour envoyer une demande par e-mail ou nom
                      d&apos;utilisateur, puis partagez des classeurs ou des notes.
                    </div>
                  ) : (
                    <div className="settings-api-key-list">
                      {teammates.map((m, index) => (
                        <div
                          key={m.id}
                          className="settings-api-key-list__item border-b [border-bottom:var(--border-block)] last:border-b-0"
                        >
                          <motion.div
                            className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.04 }}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              {m.avatar ? (
                                <img
                                  src={m.avatar}
                                  alt={m.name}
                                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                                />
                              ) : (
                                <div
                                  className="settings-v-avatar flex h-10 w-10 shrink-0 items-center justify-center text-xs font-semibold text-zinc-300"
                                  aria-hidden
                                >
                                  {initials(m.name)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="truncate text-sm font-medium text-[var(--color-text-primary,#ededed)]">
                                    {m.name}
                                  </span>
                                  <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                                    Actif
                                  </span>
                                </div>
                                <div className="mt-0.5 text-xs text-[var(--color-text-secondary,#a1a1aa)]">
                                  <span className="inline-flex items-center gap-1">
                                    <Mail className="h-3 w-3 opacity-70" aria-hidden />
                                    {m.email}
                                  </span>
                                  <span className="mx-1.5 opacity-40">·</span>
                                  <span>Depuis le {new Date(m.since).toLocaleDateString("fr-FR")}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="settings-v-btn-secondary inline-flex h-9 w-9 shrink-0 items-center justify-center !p-0"
                              onClick={() => void deleteTeammateRow(m.id)}
                              aria-label={`Retirer ${m.name} de l’équipe`}
                              title="Retirer"
                            >
                              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                            </button>
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Reçu */}
              <motion.section
                className="settings-v-section"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.06 }}
              >
                <h2 className="settings-v-title">Reçu</h2>
                <p className="-mt-2 mb-3 max-w-2xl text-sm text-zinc-500">
                  Classeurs dont un coéquipier vous a donné l’accès. Ouvrez-les dans Notebooks.
                </p>
                <div className="settings-v-card">
                  {received.length === 0 ? (
                    <div className="shared-v-empty">
                      <strong>Rien pour l’instant</strong>
                      Lorsqu’un coéquipier partagera un classeur ou une note, elle apparaîtra ici.
                    </div>
                  ) : (
                    <div className="settings-api-key-list">
                      {received.map((item, index) => (
                        <div
                          key={item.id}
                          className="settings-api-key-list__item border-b [border-bottom:var(--border-block)] last:border-b-0"
                        >
                          <motion.div
                            className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.04 }}
                          >
                            <div className="min-w-0 flex-1 pr-4">
                              <div className="flex flex-wrap items-center gap-2">
                                {item.kind === "classeur" ? (
                                  <FolderInput
                                    className="h-4 w-4 shrink-0 text-zinc-500"
                                    aria-hidden
                                  />
                                ) : (
                                  <Inbox className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                                )}
                                <span className="truncate text-[0.875rem] font-medium text-[var(--color-text-primary,#ededed)]">
                                  {item.title}
                                </span>
                                <span className="shrink-0 rounded-full border border-white/[0.12] bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                                  {item.kind === "classeur" ? "Classeur" : "Note"}
                                </span>
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                    item.access === "édition"
                                      ? "border-blue-500/25 bg-blue-500/10 text-blue-300"
                                      : "border-zinc-600/40 bg-zinc-800/60 text-zinc-400"
                                  }`}
                                >
                                  {item.access}
                                </span>
                              </div>
                              <div className="mt-2 text-[0.8125rem] text-[var(--color-text-secondary,#a1a1aa)]">
                                <span className="opacity-70">Partagé par</span>{" "}
                                <span className="text-zinc-300">{item.author}</span>
                                <span className="mx-1 opacity-40">·</span>
                                <span className="opacity-70">{item.authorHint}</span>
                                <span className="mx-1.5 opacity-40">·</span>
                                <span className="opacity-70">Reçu le</span>{" "}
                                {new Date(item.sharedAt).toLocaleDateString("fr-FR")}
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                className="settings-v-btn"
                                onClick={() => {
                                  if (item.kind === "classeur" && "classeurId" in item) {
                                    openSharedClasseur(item.classeurId);
                                  }
                                }}
                              >
                                Ouvrir
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Envoyé */}
              <motion.section
                className="settings-v-section"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
              >
                <h2 className="settings-v-title">Partages actifs</h2>
                <p className="-mt-2 mb-3 max-w-2xl text-sm text-zinc-500">
                  Ce que vous exposez à d’autres (lien, coéquipier ou classeur). Gestion fine des
                  droits à brancher sur l’éditeur et les classeurs.
                </p>
                <div className="settings-v-card">
                  {sent.length === 0 ? (
                    <div className="shared-v-empty">
                      <strong>Aucun partage sortant listé</strong>
                      Depuis une note ou un classeur, choisissez « Partager » pour alimenter cette
                      liste.
                    </div>
                  ) : (
                    <div className="settings-api-key-list">
                      {sent.map((item, index) => (
                        <div
                          key={item.id}
                          className="settings-api-key-list__item border-b [border-bottom:var(--border-block)] last:border-b-0"
                        >
                          <motion.div
                            className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.04 }}
                          >
                            <div className="min-w-0 flex-1 pr-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <SendHorizontal
                                  className="h-4 w-4 shrink-0 text-zinc-500"
                                  aria-hidden
                                />
                                <span className="truncate text-[0.875rem] font-medium text-[var(--color-text-primary,#ededed)]">
                                  {item.title}
                                </span>
                                <span className="shrink-0 rounded-full border border-white/[0.12] bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                                  Note
                                </span>
                                <span className="shrink-0 rounded-full border border-zinc-600/40 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                                  {item.access}
                                </span>
                              </div>
                              <div className="mt-2 text-[0.8125rem] text-[var(--color-text-secondary,#a1a1aa)]">
                                <span className="opacity-70">Mis en avant le</span>{" "}
                                {new Date(item.sharedAt).toLocaleDateString("fr-FR")}
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button type="button" className="settings-v-btn-secondary">
                                Gérer
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Rappel produit */}
              <motion.section
                className="settings-v-section"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.14 }}
              >
                <h2 className="settings-v-title flex items-center gap-2">
                  <Users className="h-5 w-5 text-zinc-500" aria-hidden />
                  Prochaine étape
                </h2>
                <div className="settings-v-card">
                  <div className="p-5 text-sm leading-relaxed text-[var(--color-text-secondary,#a1a1aa)]">
                    <p className="m-0 mb-3 text-[var(--color-text-primary,#ededed)]">
                      Modèle cible : une couche d’autorisation unique (coéquipier → droit sur
                      classeur / note), puis ouverture des ressources depuis cette page et
                      l’arborescence.
                    </p>
                    <ul className="m-0 list-inside list-disc space-y-1.5 pl-0.5">
                      <li>API invitations et liste « partagé avec moi »</li>
                      <li>Actions « Partager » sur classeur et note (choix du coéquipier + lecture / édition)</li>
                      <li>Notifications pour les demandes en attente</li>
                    </ul>
                  </div>
                </div>
              </motion.section>
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {inviteModalOpen ? (
          <motion.div
            key="shared-invite-modal"
            className="modal-overlay z-[9999]"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setInviteModalOpen(false);
              setInviteFeedback(null);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="shared-invite-modal-title"
              className="modal-content shared-invite-modal"
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 id="shared-invite-modal-title">Inviter un coéquipier</h3>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Fermer"
                  onClick={() => {
                    setInviteModalOpen(false);
                    setInviteFeedback(null);
                  }}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleInviteSubmit}>
                <div className="modal-body shared-invite-modal__body">
                  <p className="shared-invite-modal__intro">
                    Saisissez l&apos;adresse e-mail ou le nom d&apos;utilisateur de la personne que
                    vous souhaitez inviter. Une demande lui sera envoyée immédiatement.
                  </p>
                  <div className="shared-invite-modal__field">
                    <label htmlFor="shared-invite-email" className="shared-invite-modal__label">
                      E-mail ou nom d&apos;utilisateur
                    </label>
                    <input
                      ref={inviteInputRef}
                      id="shared-invite-email"
                      type="text"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        if (inviteFeedback) setInviteFeedback(null);
                      }}
                      placeholder="email@exemple.com ou @username"
                      className="settings-v-input shared-invite-modal__input"
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      disabled={inviteSending}
                    />
                  </div>
                  {inviteFeedback ? (
                    <p className="shared-invite-modal__error" role="alert">
                      {inviteFeedback}
                    </p>
                  ) : null}
                </div>
                <div className="modal-footer shared-invite-modal__footer">
                  <button
                    type="button"
                    className="settings-v-btn-secondary shared-invite-modal__btn-secondary"
                    disabled={inviteSending}
                    onClick={() => {
                      setInviteModalOpen(false);
                      setInviteFeedback(null);
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="modal-button shared-invite-modal__submit"
                    disabled={inviteSending}
                  >
                    {inviteSending ? "Envoi…" : "Envoyer l’invitation"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
