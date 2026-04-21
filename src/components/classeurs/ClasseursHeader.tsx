"use client";

import React from "react";
import { Folder, ChevronDown, Settings, BookMarked } from "lucide-react";
import { Feather } from "react-feather";

export interface ClasseursHeaderProps {
  statsLabel: string;
  onNouveauClick: () => void;
  nouveauOpen: boolean;
  onNouveauClose: () => void;
  onCreateClasseur: () => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
  onSettingsClick: () => void;
  /** Classeur partagé en lecture seule : pas de création. */
  actionsLocked?: boolean;
}

export function ClasseursHeader({
  statsLabel,
  onNouveauClick,
  nouveauOpen,
  onNouveauClose,
  onCreateClasseur,
  onCreateFolder,
  onCreateNote,
  onSettingsClick,
  actionsLocked,
}: ClasseursHeaderProps) {
  void statsLabel;

  return (
    <div className="mb-10 mt-5 sm:mt-8 flex w-full items-center justify-between">
      <div className="flex flex-col items-start font-sans">
        <h1 className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-[36px] font-bold leading-tight tracking-tighter text-transparent">
          Notebooks
        </h1>
        <p className="mt-2 hidden text-sm font-medium tracking-wide text-neutral-500 sm:block">
          Gérez vos méthodologies, notes et documents de réflexion.
        </p>
      </div>
      <div className="relative shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={onSettingsClick}
          className="flex h-9 items-center justify-center w-9 rounded-md border border-white/10 bg-transparent text-zinc-400 transition-all hover:bg-white/5 hover:text-white"
          aria-label="Paramètres"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (!actionsLocked) onNouveauClick();
          }}
          disabled={!!actionsLocked}
          className={`flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-semibold shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all ${
            actionsLocked
              ? "cursor-not-allowed bg-zinc-800 text-zinc-500"
              : "bg-white text-black hover:bg-neutral-200"
          }`}
        >
          <span>Nouveau</span>
          <ChevronDown className="h-4 w-4" />
        </button>
        {nouveauOpen && !actionsLocked && (
          <>
            <div className="fixed inset-0 z-10" aria-hidden onClick={onNouveauClose} />
            <div className="absolute right-0 top-full z-20 mt-2 min-w-[200px] rounded-xl border border-zinc-800/60 bg-zinc-950 p-1.5 shadow-2xl ring-1 ring-white/5">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
                onClick={() => {
                  onCreateClasseur();
                  onNouveauClose();
                }}
              >
                <BookMarked className="h-4 w-4" />
                Nouveau classeur
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
                onClick={() => {
                  onCreateFolder();
                  onNouveauClose();
                }}
              >
                <Folder className="h-4 w-4" />
                Nouveau dossier
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
                onClick={() => {
                  onCreateNote();
                  onNouveauClose();
                }}
              >
                <Feather className="h-4 w-4" />
                Nouvelle note
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
