"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageWithSidebarLayout from "@/components/PageWithSidebarLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import { simpleLogger as logger } from "@/utils/logger";
import type { Classeur } from "@/services/llm/types/apiV2Types";
import SearchBar, { SearchResult } from "@/components/SearchBar";
import {
  Feather,
  Plus,
  Upload,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Lock,
  MoreHorizontal,
  FileText,
  Image as ImageIcon,
  FolderOpen,
  Command,
  ArrowRight,
} from "lucide-react";
import "./home.css";
import "./dashboard.css";

const NOTES_LIMIT = 10;
const FILES_LIMIT = 12;
const DEFAULT_NOTE_IMAGE = "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop";

interface ApiNote {
  id: string;
  source_title: string;
  header_image?: string;
  updated_at: string;
  share_settings: { visibility: "public" | "private" | "unlisted" };
}

interface ApiFile {
  id?: string;
  slug?: string;
  filename: string;
  type: string;
  created_at: string;
  size?: number;
  url?: string;
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/50 hover:border-zinc-700 transition-all shrink-0"
    >
      <Icon className="w-4 h-4 text-zinc-500 shrink-0" />
      {label}
    </button>
  );
}

function NoteCard({
  id,
  title,
  image,
  isPrivate,
}: {
  id: string;
  title: string;
  image: string;
  isPrivate: boolean;
}) {
  return (
    <Link
      href={`/private/note/${id}`}
      className="group relative w-72 h-48 rounded-xl overflow-hidden border border-zinc-800/60 shrink-0 bg-zinc-900/20"
    >
      <img
        src={image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      {isPrivate && (
        <div className="absolute top-3 left-3 flex items-center justify-center w-8 h-8 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
          <Lock className="w-3.5 h-3.5 text-white/80" />
        </div>
      )}
      <p className="absolute bottom-3 left-3 text-white text-sm font-medium">{title}</p>
      <button
        type="button"
        className="absolute bottom-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
        aria-label="Options"
        onClick={(e) => e.preventDefault()}
      >
        <MoreHorizontal className="w-4 h-4 text-white/80" />
      </button>
    </Link>
  );
}

function FileCard({
  name,
  type,
  date,
  thumbnail,
  onClick,
}: {
  name: string;
  type: string;
  date: string;
  thumbnail: string | null;
  onClick?: () => void;
}) {
  const isFolder = type === "folder";
  const isImage = type.startsWith("image/");

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center aspect-square rounded-xl border border-zinc-800/40 bg-zinc-900/10 hover:bg-zinc-800/40 hover:border-zinc-700/60 transition-all overflow-hidden"
    >
      <div className="flex-1 w-full flex items-center justify-center p-4 min-h-0">
        {thumbnail && isImage ? (
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover rounded-md transition-transform duration-200 group-hover:scale-105"
          />
        ) : isFolder ? (
          <FolderOpen className="w-12 h-12 text-orange-500/80 shrink-0" strokeWidth={1.5} />
        ) : type.startsWith("image/") ? (
          <ImageIcon className="w-12 h-12 text-emerald-500/80 shrink-0" strokeWidth={1.5} />
        ) : (
          <FileText className="w-12 h-12 text-zinc-500 shrink-0" strokeWidth={1.5} />
        )}
      </div>
      <div className="w-full text-center px-2 pb-3 pt-1">
        <p className="text-[13px] text-zinc-200 truncate w-full">{name}</p>
        <p className="text-[11px] text-zinc-500">{date}</p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <HomePageContent />
      </AuthGuard>
    </ErrorBoundary>
  );
}

function HomePageContent() {
  const { user, loading: authLoading } = useAuth();
  if (authLoading || !user?.id) {
    return (
      <PageWithSidebarLayout>
        <div className="flex items-center justify-center min-h-[60vh] text-zinc-500 text-sm">
          Chargement...
        </div>
      </PageWithSidebarLayout>
    );
  }
  return <AuthenticatedHomeContent user={user} />;
}

function formatFileDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "À l'instant";
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffHours < 48) return "Hier";
    const day = date.getDate();
    const months = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    const month = months[date.getMonth()];
    if (date.getFullYear() === now.getFullYear()) return `${day} ${month}`;
    return `${day} ${month} ${date.getFullYear()}`;
  } catch {
    return "—";
  }
}

function AuthenticatedHomeContent({
  user,
}: {
  user: { id: string; email?: string; username?: string };
}) {
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const notesScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commandValue, setCommandValue] = useState("");
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [files, setFiles] = useState<ApiFile[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [errorNotes, setErrorNotes] = useState<string | null>(null);
  const [errorFiles, setErrorFiles] = useState<string | null>(null);

  const displayName = user.username || user.email?.split("@")[0] || "User";

  const { handleError } = useSecureErrorHandler({
    context: "HomePage",
    operation: "dashboard_actions",
    userId: user.id,
  });

  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoadingNotes(true);
        setErrorNotes(null);
        const token = await getAccessToken();
        if (!token) {
          setErrorNotes("Non authentifié");
          return;
        }
        const res = await fetch(`/api/v2/note/recent?limit=${NOTES_LIMIT}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (data.success && Array.isArray(data.notes)) setNotes(data.notes);
        else setNotes([]);
      } catch (err) {
        logger.error("[HomePage] Erreur chargement notes:", err);
        setErrorNotes("Erreur chargement");
        setNotes([]);
      } finally {
        setLoadingNotes(false);
      }
    };
    loadNotes();
  }, [getAccessToken]);

  useEffect(() => {
    const loadFiles = async () => {
      try {
        setLoadingFiles(true);
        setErrorFiles(null);
        const token = await getAccessToken();
        if (!token) {
          setErrorFiles("Non authentifié");
          return;
        }
        const params = new URLSearchParams({
          limit: String(FILES_LIMIT),
          sort_by: "created_at",
          sort_order: "desc",
        });
        const res = await fetch(`/api/v2/files/search?${params}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (data.success && Array.isArray(data.files)) {
          setFiles(
            data.files.map((f: { id?: string; slug?: string; filename: string; type: string; created_at: string; size?: number; url?: string }) => ({
              id: f.id,
              slug: f.slug,
              filename: f.filename,
              type: f.type,
              created_at: f.created_at,
              size: f.size,
              url: f.url,
            }))
          );
        } else setFiles([]);
      } catch (err) {
        logger.error("[HomePage] Erreur chargement fichiers:", err);
        setErrorFiles("Erreur chargement");
        setFiles([]);
      } finally {
        setLoadingFiles(false);
      }
    };
    loadFiles();
  }, [getAccessToken]);

  const handleSearchResult = useCallback(
    (result: SearchResult) => {
      if (result.type === "note") {
        router.push(`/private/note/${result.slug || result.id}`);
      } else {
        router.push("/private/dossiers");
      }
    },
    [router]
  );

  const handleCreateNote = useCallback(async () => {
    try {
      logger.info("[HomePage] Création rapide de note");
      const { V2UnifiedApi } = await import("@/services/V2UnifiedApi");
      const v2Api = V2UnifiedApi.getInstance();
      const classeursResult = await v2Api.getClasseurs();
      if (!classeursResult.success || !classeursResult.classeurs) {
        throw new Error("Erreur lors de la récupération des classeurs");
      }
      const quicknotesClasseur = (classeursResult.classeurs as Classeur[]).find(
        (c) => c.name === "Quicknotes"
      );
      if (!quicknotesClasseur) {
        throw new Error("Classeur Quicknotes non trouvé.");
      }
      const defaultName = `Nouvelle note ${Date.now().toString().slice(-4)}`;
      const createResult = await v2Api.createNote({
        source_title: defaultName,
        notebook_id: quicknotesClasseur.id,
        markdown_content: "",
        folder_id: null,
      });
      if (!createResult.success || !createResult.note) {
        throw new Error(createResult.error || "Erreur lors de la création");
      }
      router.push(`/private/note/${createResult.note.id}`);
    } catch (error) {
      logger.error("[HomePage] Erreur création note:", error);
      handleError(error, "création note");
    }
  }, [router, handleError]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleNotesPrev = useCallback(() => {
    notesScrollRef.current?.scrollBy({ left: -320, behavior: "smooth" });
  }, []);

  const handleNotesNext = useCallback(() => {
    notesScrollRef.current?.scrollBy({ left: 320, behavior: "smooth" });
  }, []);

  const handleCommandSubmit = useCallback(() => {
    const q = commandValue.trim();
    if (!q) return;
    router.push(`/private/dossiers?q=${encodeURIComponent(q)}`);
    setCommandValue("");
  }, [commandValue, router]);

  return (
    <PageWithSidebarLayout>
      <input
        ref={fileInputRef}
        id="file-input"
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) logger.dev("[HomePage] Fichier:", e.target.files[0]);
        }}
      />

      <main className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-8 sm:py-12 flex flex-col gap-8 sm:gap-12">
        {/* 1. Welcome */}
        <header className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 mb-4">
            <Feather className="w-6 h-6 text-zinc-400" strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Welcome Home, {displayName}.
          </h1>
          <p className="text-zinc-400 text-sm">Let&apos;s craft amazing work today.</p>
        </header>

        {/* 2. Quick Actions */}
        <section className="flex items-center justify-center gap-3 overflow-x-auto no-scrollbar -mx-2 px-2">
          <ActionButton icon={Plus} label="New Note" onClick={handleCreateNote} />
          <ActionButton icon={MessageSquare} label="Open Chat" onClick={() => router.push("/chat")} />
          <ActionButton icon={Upload} label="Import" onClick={handleImport} />
        </section>

        {/* 3. Notes récentes */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider shrink-0">
              Notes récentes
            </h2>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex-1 min-w-[140px] max-w-[220px]">
                <SearchBar
                  placeholder="Rechercher..."
                  onSearchResult={handleSearchResult}
                  maxResults={10}
                  searchTypes={["all"]}
                  className="dashboard-search-inline"
                />
              </div>
              <button
                type="button"
                onClick={handleNotesPrev}
                aria-label="Précédent"
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNotesNext}
                aria-label="Suivant"
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div
            ref={notesScrollRef}
            className="flex gap-4 overflow-x-auto pb-4 dashboard-notes-scroll dashboard-notes-mask"
          >
            {loadingNotes && (
              <div className="flex items-center justify-center w-72 h-48 rounded-xl border border-zinc-800/60 bg-zinc-900/20 shrink-0 text-zinc-500 text-sm">
                Chargement...
              </div>
            )}
            {!loadingNotes && errorNotes && (
              <div className="flex items-center justify-center w-72 h-48 rounded-xl border border-zinc-800/60 bg-zinc-900/20 shrink-0 text-zinc-500 text-sm">
                {errorNotes}
              </div>
            )}
            {!loadingNotes && !errorNotes && notes.length === 0 && (
              <div className="flex items-center justify-center w-72 h-48 rounded-xl border border-zinc-800/60 bg-zinc-900/20 shrink-0 text-zinc-500 text-sm">
                Aucune note récente
              </div>
            )}
            {!loadingNotes &&
              notes.map((note) => (
                <NoteCard
                  key={note.id}
                  id={note.id}
                  title={note.source_title}
                  image={note.header_image || DEFAULT_NOTE_IMAGE}
                  isPrivate={note.share_settings?.visibility === "private"}
                />
              ))}
          </div>
        </section>

        {/* 4. Fichiers récents */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Fichiers récents
            </h2>
            <Link
              href="/private/files"
              className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Voir tout
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {loadingFiles && (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl border border-zinc-800/40 bg-zinc-900/10 animate-pulse"
                  />
                ))}
              </>
            )}
            {!loadingFiles && errorFiles && (
              <div className="col-span-full py-8 text-center text-zinc-500 text-sm">
                {errorFiles}
              </div>
            )}
            {!loadingFiles &&
              !errorFiles &&
              files.length === 0 && (
                <div className="col-span-full py-8 text-center text-zinc-500 text-sm">
                  Aucun fichier récent
                </div>
              )}
            {!loadingFiles &&
              files.map((file, index) => (
                <FileCard
                  key={file.id || file.filename + index}
                  name={file.filename}
                  type={file.type}
                  date={formatFileDate(file.created_at)}
                  thumbnail={
                    file.type.startsWith("image/") && file.url ? file.url : null
                  }
                  onClick={() => router.push("/private/files")}
                />
              ))}
          </div>
        </section>

        {/* 5. Command bar */}
        <section className="relative w-full">
          <div className="relative flex items-center">
            <Command className="absolute left-4 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={commandValue}
              onChange={(e) => setCommandValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCommandSubmit()}
              placeholder="Rechercher ou déposer un fichier..."
              className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-xl py-4 pl-12 pr-14 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 shadow-sm"
            />
            <button
              type="button"
              onClick={handleCommandSubmit}
              className="absolute right-2 flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 transition-all"
              aria-label="Envoyer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>
    </PageWithSidebarLayout>
  );
}
