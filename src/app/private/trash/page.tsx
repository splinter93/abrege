"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Archive,
  Clock,
  AlertCircle,
  FileText,
  Folder,
  RotateCcw,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { AuthenticatedUser } from "@/types/dossiers";
import type { TrashItem, TrashStatistics } from "@/types/supabase";
import AuthGuard from "@/components/AuthGuard";
import PageWithSidebarLayout from "@/components/PageWithSidebarLayout";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import { simpleLogger as logger } from "@/utils/logger";
import DossierErrorBoundary from "@/components/DossierErrorBoundary";
import { DossierLoadingState, DossierErrorState } from "@/components/DossierLoadingStates";

import "./index.css";

export default function TrashPage() {
  return (
    <DossierErrorBoundary>
      <AuthGuard>
        <TrashPageContent />
      </AuthGuard>
    </DossierErrorBoundary>
  );
}

function TrashPageContent() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading || !user?.id) {
    return <DossierLoadingState type="initial" message="Vérification de l'authentification..." />;
  }

  return <AuthenticatedTrashContent user={user} />;
}

function AuthenticatedTrashContent({ user }: { user: AuthenticatedUser }) {
  const { handleError } = useSecureErrorHandler({
    context: "TrashPage",
    operation: "gestion_corbeille",
    userId: user.id,
  });

  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [statistics, setStatistics] = useState<TrashStatistics>({
    total: 0,
    notes: 0,
    folders: 0,
    classeurs: 0,
    files: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [canRetry, setCanRetry] = useState(true);

  const loadTrashItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { TrashService } = await import("@/services/trashService");
      const data = await TrashService.getTrashItems();
      setTrashItems(data.items);
      setStatistics(data.statistics);
      setRetryCount(0);
      setCanRetry(true);
    } catch (err) {
      logger.error("[TrashPage] Erreur chargement corbeille:", err);
      handleError(err, "chargement corbeille");
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setRetryCount((prev) => prev + 1);
      setCanRetry(retryCount < 3);
    } finally {
      setLoading(false);
    }
  }, [user?.id, handleError, retryCount]);

  useEffect(() => {
    if (user) loadTrashItems();
  }, [user?.id, loadTrashItems]);

  const retryWithBackoff = useCallback(async () => {
    if (!canRetry) return;
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    await new Promise((resolve) => setTimeout(resolve, delay));
    await loadTrashItems();
  }, [canRetry, retryCount, loadTrashItems]);

  const refreshData = useCallback(() => loadTrashItems(), [loadTrashItems]);
  const forceReload = useCallback(() => {
    setRetryCount(0);
    setCanRetry(true);
    loadTrashItems();
  }, [loadTrashItems]);

  const handleRestore = useCallback(
    async (item: TrashItem) => {
      try {
        const { TrashService } = await import("@/services/trashService");
        await TrashService.restoreItem(item.type, item.id);
        await loadTrashItems();
      } catch (err) {
        logger.error("[TrashPage] Restauration erreur:", err);
        handleError(err, "restauration élément");
        setError(err instanceof Error ? err.message : "Erreur lors de la restauration");
      }
    },
    [loadTrashItems, handleError]
  );

  const handlePermanentDelete = useCallback(
    async (item: TrashItem) => {
      if (!confirm(`Supprimer définitivement « ${item.name} » ?`)) return;
      try {
        const { TrashService } = await import("@/services/trashService");
        await TrashService.permanentlyDeleteItem(item.type, item.id);
        await loadTrashItems();
      } catch (err) {
        logger.error("[TrashPage] Suppression erreur:", err);
        handleError(err, "suppression définitive");
        setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
      }
    },
    [loadTrashItems, handleError]
  );

  const handleEmptyTrash = useCallback(async () => {
    if (
      !confirm(
        "Vider toute la corbeille ? Cette action est irréversible."
      )
    )
      return;
    if (!user?.id) {
      setError("Utilisateur non authentifié");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { TrashService } = await import("@/services/trashService");
      await TrashService.emptyTrash();
      setTrashItems([]);
      setStatistics({
        total: 0,
        notes: 0,
        folders: 0,
        classeurs: 0,
        files: 0,
      });
    } catch (err) {
      logger.error("[TrashPage] Vidage erreur:", err);
      handleError(err, "vidage corbeille");
      setError(err instanceof Error ? err.message : "Erreur lors du vidage");
    } finally {
      setLoading(false);
    }
  }, [handleError, user?.id]);

  if (loading && trashItems.length === 0) {
    return <DossierLoadingState type="initial" message="Chargement de la corbeille…" />;
  }

  if (error) {
    return (
      <DossierErrorState
        message={error}
        retryCount={retryCount}
        canRetry={canRetry}
        onRetry={retryWithBackoff}
        onRefresh={refreshData}
        onForceReload={forceReload}
      />
    );
  }

  return (
    <PageWithSidebarLayout>
      <div className="page-content-inner page-content-inner-trash bg-[var(--color-bg-primary)] w-full max-w-none mx-0">
        <div className="px-4 sm:px-6 lg:px-8 pt-0 pb-6 sm:pb-6">
          {/* En-tête — style commun (titre gradient + sous-titre + action) */}
          <div className="mb-10 mt-5 sm:mt-8 flex w-full items-center justify-between">
            <div className="flex flex-col items-start font-sans">
              <h1 className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-[36px] font-bold leading-tight tracking-tighter text-transparent">
                Corbeille
              </h1>
              <p className="mt-2 hidden text-sm font-medium tracking-wide text-neutral-500 sm:block">
                Éléments supprimés. Conservation 30 jours, restauration possible.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleEmptyTrash}
                disabled={loading || trashItems.length === 0}
                className="trash-empty-btn flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Vider la corbeille"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>{loading ? "Vidage…" : "Vider la corbeille"}</span>
              </button>
            </div>
          </div>

          {trashItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="trash-empty-icon mb-4 flex h-20 w-20 items-center justify-center rounded-2xl">
                <Archive className="h-10 w-10 text-neutral-500" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-100 mb-1">Corbeille vide</h2>
              <p className="text-zinc-500 text-sm max-w-sm">
                Aucun élément supprimé. Les éléments supprimés sont conservés 30 jours.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {trashItems.map((item) => (
                  <TrashItemCard
                    key={item.id}
                    item={item}
                    onRestore={handleRestore}
                    onDelete={handlePermanentDelete}
                  />
                ))}
              </div>

              {/* Infos — cartes design system */}
              <div className="trash-info-grid mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="trash-info-card flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-block)', border: 'var(--border-block)' }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-blue-400" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-200">Conservation 30 jours</h3>
                    <p className="mt-1 text-xs text-neutral-500">
                      Les éléments sont définitivement supprimés après 30 jours.
                    </p>
                  </div>
                </div>
                <div className="trash-info-card flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-block)', border: 'var(--border-block)' }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-amber-400" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-200">Restauration</h3>
                    <p className="mt-1 text-xs text-neutral-500">
                      Cliquez sur « Restaurer » pour remettre un élément à sa place.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageWithSidebarLayout>
  );
}

// ——— Carte élément corbeille (style classeurs : bloc + bordure variables)
function TrashItemCard({
  item,
  onRestore,
  onDelete,
}: {
  item: TrashItem;
  onRestore: (item: TrashItem) => void;
  onDelete: (item: TrashItem) => void;
}) {
  const Icon =
    item.type === "folder"
      ? Folder
      : item.type === "classeur"
        ? Archive
        : FileText;

  const iconBoxClass =
    item.type === "folder"
      ? "bg-orange-500/10 border-orange-500/20 text-orange-500/90"
      : item.type === "classeur"
        ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
        : "bg-white/[0.05] border-white/[0.1] text-zinc-400";

  const daysLeft = (() => {
    const now = new Date();
    const exp = new Date(item.expires_at);
    const d = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, d);
  })();

  const timeLabel =
    daysLeft === 0
      ? "Expire aujourd'hui"
      : daysLeft === 1
        ? "Expire demain"
        : `${daysLeft} jours restants`;

  return (
    <div
      className="trash-card group relative flex min-h-[180px] flex-col rounded-xl p-5 transition-all duration-200"
      style={{ backgroundColor: "var(--color-bg-block)", border: "var(--border-block)" }}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${iconBoxClass}`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col min-h-0">
        <h3 className="truncate text-[15px] font-semibold text-neutral-200 group-hover:text-white">
          {item.name}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-neutral-500">
          <Clock className="h-3.5 w-3.5" />
          {timeLabel}
        </p>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--color-border-block)' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRestore(item);
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-neutral-200 transition-colors hover:bg-white/5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurer
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
          className="flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-medium text-red-400/90 transition-colors hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Supprimer
        </button>
      </div>
    </div>
  );
}
