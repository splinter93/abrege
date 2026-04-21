"use client";

import { BookMarked } from "lucide-react";
import { DossierLoadingState, DossierErrorState } from "@/components/DossierLoadingStates";
import SimpleContextMenu from "@/components/SimpleContextMenu";
import ShareModal from "@/components/ShareModal";
import ClasseurEditModal from "@/components/ClasseurEditModal";
import { NotebookSettingsModal, NoteSidePanel, NoteModal } from "@/components/notebooks";
import { ClasseursHeader } from "@/components/classeurs/ClasseursHeader";
import { ClasseursTabs } from "@/components/classeurs/ClasseursTabs";
import { ClasseursContent } from "@/components/classeurs/ClasseursContent";
import { useClasseursPageController } from "@/hooks/useClasseursPageController";

import "./ClasseursPage.css";

export default function ClasseursPage() {
  const p = useClasseursPageController();

  if (p.authLoading || !p.user?.id) {
    return <DossierLoadingState type="initial" message="Vérification de l'authentification..." />;
  }

  if (p.pageLoading && p.classeurs.length === 0) {
    return <DossierLoadingState type="initial" />;
  }

  if (p.pageError) {
    return (
      <DossierErrorState
        message={p.pageError}
        retryCount={p.retryCount}
        canRetry={p.canRetry}
        onRetry={p.retryWithBackoff}
        onRefresh={p.refreshData}
        onForceReload={p.forceReload}
      />
    );
  }

  return (
    <div className="page-content-inner page-content-inner-classeurs classeurs-page-root flex h-full min-h-full w-full max-w-none mx-0 min-w-0 bg-[var(--color-bg-primary)]">
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-4 pb-0">
          <div className="max-w-screen-2xl mx-auto w-full">
            <ClasseursHeader
              statsLabel={p.statsLabel}
              onNouveauClick={() => p.setNouveauOpen((o) => !o)}
              nouveauOpen={p.nouveauOpen}
              onNouveauClose={() => p.setNouveauOpen(false)}
              onCreateClasseur={p.handleCreateClasseurClick}
              onCreateFolder={p.handleCreateFolderClick}
              onCreateNote={p.handleCreateNoteClick}
              onSettingsClick={() => p.setSettingsOpen(true)}
              actionsLocked={p.sharedReadOnly}
            />

            <div className="mb-4 flex w-full items-center gap-4 border-b border-white/[0.08]">
              <div className="min-w-0 flex-1 overflow-hidden">
                <ClasseursTabs
                  tabs={p.tabs}
                  activeId={p.activeClasseurId ?? ""}
                  onSelect={p.handleSelectTab}
                  onContextMenu={p.handleTabContextMenu}
                  onCreateTab={p.handleCreateClasseurClick}
                  onTabDragOver={p.handleTabDragOver}
                  onTabDragLeave={p.handleTabDragLeave}
                  onTabDrop={p.handleTabDrop}
                  dragOverTabId={p.dragOverTabId}
                  onTabsReorder={p.handleTabsReorder}
                  renamingTabId={p.renamingTabId}
                  onTabRenameSubmit={p.handleTabRenameSubmit}
                  onTabRenameCancel={() => p.setRenamingTabId(null)}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto no-scrollbar pt-0 px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8"
          onContextMenu={p.handleAreaContextMenu}
        >
          <div className="max-w-screen-2xl mx-auto w-full">
            {!p.activeClasseur && p.tabs.length === 0 && (
              <div className="mt-12 rounded-2xl border border-white/[0.08] bg-[#141414] px-6 py-20 text-center">
                <BookMarked className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
                <p className="font-medium text-zinc-400">Aucun classeur détecté.</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Utilisez le menu{" "}
                  <strong className="text-zinc-300">Nouveau</strong> pour commencer à organiser vos notes.
                </p>
              </div>
            )}
            {p.activeClasseur && (
              <ClasseursContent
                breadcrumbSegments={p.breadcrumbSegments}
                items={p.items}
                viewMode={p.effectiveViewMode}
                onViewModeChange={p.setViewMode}
                searchQuery={p.searchQuery}
                onSearchChange={p.setSearchQuery}
                onItemOpen={p.handleItemOpen}
                onItemMouseEnter={p.handleItemMouseEnter}
                onItemContextMenu={p.handleItemContextMenu}
                onDragStartItem={() => {}}
                onDropOnFolder={p.handleDropOnFolder}
                dropTargetFolderId={p.dropTargetFolderId}
                onRootDragOver={p.handleRootDragOver}
                onRootDragLeave={() => {
                  p.handleRootDragLeave();
                  p.setDropTargetFolderId(null);
                }}
                onRootDrop={(e) => {
                  p.handleRootDrop(e);
                  p.setDropTargetFolderId(null);
                  p.setRefreshKey((k) => k + 1);
                }}
                isRootDropActive={p.isRootDropActive}
                onFolderDragOver={p.setDropTargetFolderId}
                onFolderDragLeave={() => p.setDropTargetFolderId(null)}
                renamingItemId={p.renamingItemId}
                onItemRename={(id, newName, type) => {
                  void p.submitRename(id, newName, type);
                  p.setRefreshKey((k) => k + 1);
                }}
                onItemCancelRename={p.cancelRename}
              />
            )}
          </div>
        </div>
      </main>

      {p.contextMenuItem && (
        <SimpleContextMenu
          x={p.contextMenuItem.x}
          y={p.contextMenuItem.y}
          visible
          options={[
            {
              label: "Ouvrir",
              onClick: () => {
                p.handleItemOpen(p.contextMenuItem!.item);
                p.closeContextMenus();
              },
            },
            ...(p.isActiveClasseurOwned && p.activeClasseurId
              ? [
                  {
                    label: "Partager…",
                    onClick: () => {
                      p.setShareTarget({
                        resourceType: p.contextMenuItem!.item.type === "folder" ? "folder" : "note",
                        resourceRef: p.activeClasseurId as string,
                        resourceName: p.contextMenuItem!.item.name,
                      });
                      p.closeContextMenus();
                    },
                  } as const,
                ]
              : []),
            {
              label: "Copier l'ID",
              onClick: () => {
                void navigator.clipboard.writeText(p.contextMenuItem!.item.id);
                p.closeContextMenus();
              },
            },
            ...(p.sharedReadOnly
              ? []
              : [
                  {
                    label: "Renommer",
                    onClick: () =>
                      p.handleContextMenuRename(p.contextMenuItem!.item.id, p.contextMenuItem!.item.type),
                  },
                  {
                    label: "Supprimer",
                    onClick: () => p.handleContextMenuDelete(p.contextMenuItem!.item),
                  },
                ]),
          ]}
          onClose={p.closeContextMenus}
        />
      )}

      {p.contextMenuTab && (
        <SimpleContextMenu
          x={p.contextMenuTab.x}
          y={p.contextMenuTab.y}
          visible
          options={
            p.contextMenuTab.tab.kind === "shared"
              ? [
                  {
                    label: "Ouvrir",
                    onClick: () => {
                      p.handleSelectTab(p.contextMenuTab!.tab.id);
                      p.closeContextMenus();
                    },
                  },
                  {
                    label: "Quitter le partage",
                    onClick: () => {
                      void p.handleQuitShare(p.contextMenuTab!.tab, p.classeurs);
                    },
                  },
                ]
              : [
                  {
                    label: "Editer",
                    onClick: () => {
                      const full = p.classeurs.find((c) => c.id === p.contextMenuTab!.tab.id) ?? null;
                      p.setEditModalClasseur(full);
                      p.closeContextMenus();
                    },
                  },
                  { label: "Renommer", onClick: () => p.handleTabRename(p.contextMenuTab!.tab) },
                  {
                    label: "Partager",
                    onClick: () => {
                      p.setShareTarget({
                        resourceType: "classeur",
                        resourceRef: p.contextMenuTab!.tab.id,
                        resourceName: p.contextMenuTab!.tab.name,
                      });
                      p.closeContextMenus();
                    },
                  },
                  { label: "Supprimer", onClick: () => p.handleTabDelete(p.contextMenuTab!.tab) },
                ]
          }
          onClose={p.closeContextMenus}
        />
      )}

      {p.contextMenuArea && (
        <SimpleContextMenu
          x={p.contextMenuArea.x}
          y={p.contextMenuArea.y}
          visible
          options={
            p.activeClasseur
              ? [
                  ...(p.isActiveClasseurOwned
                    ? [
                        {
                          label: "Editer le classeur",
                          onClick: () => {
                            const full =
                              p.classeurs.find((c) => c.id === p.activeClasseur!.id) ?? null;
                            p.setEditModalClasseur(full);
                            p.closeContextMenus();
                          },
                        },
                        {
                          label: "Partager…",
                          onClick: () => {
                            p.setShareTarget({
                              resourceType: "classeur",
                              resourceRef: p.activeClasseur!.id,
                              resourceName: p.activeClasseur!.name,
                            });
                            p.closeContextMenus();
                          },
                        },
                      ]
                    : []),
                  ...(p.sharedReadOnly
                    ? []
                    : [
                        {
                          label: "Nouveau dossier",
                          onClick: () => {
                            void p.handleCreateFolderClick();
                            p.closeContextMenus();
                          },
                        },
                        {
                          label: "Nouvelle note",
                          onClick: () => {
                            void p.handleCreateNoteClick();
                            p.closeContextMenus();
                          },
                        },
                      ]),
                ]
              : [
                  {
                    label: "Nouveau classeur",
                    onClick: () => {
                      void p.handleCreateClasseurClick();
                      p.closeContextMenus();
                    },
                  },
                ]
          }
          onClose={p.closeContextMenus}
        />
      )}

      {p.editModalClasseur && (
        <ClasseurEditModal
          classeur={p.editModalClasseur}
          onSave={async (updates) => {
            await p.handleUpdateClasseur(p.editModalClasseur!.id, updates);
          }}
          onClose={() => p.setEditModalClasseur(null)}
        />
      )}

      <NotebookSettingsModal isOpen={p.settingsOpen} onClose={() => p.setSettingsOpen(false)} />

      {p.noteOpeningMode === "side-panel" && (
        <NoteSidePanel noteRef={p.openNoteRef} onClose={p.handleCloseNotePanel} />
      )}

      {p.noteOpeningMode === "modal" && (
        <NoteModal noteRef={p.openNoteRef} onClose={p.handleCloseNotePanel} />
      )}

      {p.shareTarget && (
        <ShareModal
          resourceType={p.shareTarget.resourceType}
          resourceRef={p.shareTarget.resourceRef}
          resourceName={p.shareTarget.resourceName}
          getAccessToken={p.getAccessToken}
          onClose={() => {
            p.setShareTarget(null);
            void p.loadSharedClasseurs();
            p.setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
