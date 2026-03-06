"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Feather,
  LayoutDashboard,
  FolderKanban,
  Files,
  MessageSquare,
  Bot,
  TerminalSquare,
  Users,
  BookOpen,
  Settings,
  Trash2,
  User,
} from "lucide-react";

import { useMainSidebarOptional } from "@/contexts/MainSidebarContext";
import { useAuth } from "@/hooks/useAuth";
import "./Sidebar.css";

// ---------------------------------------------------------------------------
// SidebarItem
// ---------------------------------------------------------------------------

interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
  onNavigate?: () => void;
}

function SidebarItem({ icon: Icon, label, href, active = false, badge, onNavigate }: SidebarItemProps) {
  const content = (
    <>
      <span className="flex items-center gap-2.5 min-w-0">
        <Icon
          className={`flex-shrink-0 transition-colors duration-300 ${
            active ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
          }`}
          size={16}
          strokeWidth={active ? 2 : 1.5}
        />
        <span
          className={`truncate text-sm tracking-tight transition-colors duration-300 ${
            active ? "font-semibold text-white" : "text-zinc-400 group-hover:text-zinc-200"
          }`}
        >
          {label}
        </span>
      </span>
      {badge && (
        <span className="flex-shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 shadow-sm">
          {badge}
        </span>
      )}
    </>
  );

  const baseClass =
    "group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 transition-all duration-300 " +
    (active
      ? "sidebar-item-active text-white"
      : "sidebar-item-hover text-zinc-400");

  return (
    <Link
      href={href}
      className={baseClass}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Section separator
// ---------------------------------------------------------------------------

function SidebarSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-6 pb-2 px-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-600">
        {children}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export default function Sidebar() {
  const pathname = usePathname();
  const mainSidebar = useMainSidebarOptional();
  const { user } = useAuth();
  const isMobile = mainSidebar?.isMobile ?? false;
  const isClasseurs = pathname?.startsWith("/private/dossiers");
  const onNavigate = isMobile ? mainSidebar?.closeSidebar : undefined;

  const displayName =
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name ||
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.name ||
    user?.email?.split("@")[0] ||
    "Account";
  const avatarUrl = (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url;

  return (
    <aside
      className={`sidebar-root flex h-full min-h-screen w-full flex-shrink-0 flex-col ${isMobile ? '' : 'sidebar-root--desktop max-w-[16rem]'}`}
      aria-label="Navigation principale"
    >
      {/* En-tête : Logo + Nom */}
      <header className="p-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-800/50"
            aria-hidden
          >
            <Feather className="h-4 w-4 text-zinc-300" strokeWidth={1.75} />
          </div>
          <span className="font-sans text-[17px] font-semibold tracking-tight text-white/95 antialiased">Scrivia</span>
        </div>
      </header>

      {/* Navigation principale (scrollable) */}
      <nav className="sidebar-nav-scroll flex-1 overflow-y-auto px-2 pb-4">
        {/* Groupe 1 - Général */}
        <div className="space-y-0.5">
          <SidebarItem
            icon={LayoutDashboard}
            label="Dashboard"
            href="/dashboard"
            active={pathname === "/dashboard"}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={FolderKanban}
            label="Mes Classeurs"
            href="/private/dossiers"
            active={!!isClasseurs}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={Files}
            label="Mes Fichiers"
            href="/private/files"
            active={pathname?.startsWith("/private/files") ?? false}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={Trash2}
            label="Corbeille"
            href="/private/trash"
            active={pathname?.startsWith("/private/trash") ?? false}
            onNavigate={onNavigate}
          />
        </div>

        {/* Séparateur Workspace */}
        <SidebarSectionTitle>Workspace</SidebarSectionTitle>

        {/* Groupe 2 - Workspace */}
        <div className="space-y-0.5">
          <SidebarItem
            icon={MessageSquare}
            label="Chat"
            href="/chat"
            active={pathname?.startsWith("/chat") ?? false}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={Bot}
            label="My Agents"
            href="/private/agents2"
            active={pathname?.startsWith("/private/agents2") ?? false}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={TerminalSquare}
            label="My Prompts"
            href="/ai/prompts"
            active={pathname?.startsWith("/ai/prompts") ?? false}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={Users}
            label="TeamMates"
            href="/private/teammates"
            active={pathname?.startsWith("/private/teammates") ?? false}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={Settings}
            label="Paramètres"
            href="/private/settings"
            active={pathname?.startsWith("/private/settings") ?? false}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={BookOpen}
            label="Documentation"
            href="/docs"
            active={pathname?.startsWith("/docs") ?? false}
            onNavigate={onNavigate}
          />
        </div>
      </nav>

      {/* User settings — tout en bas */}
      <footer className="mt-auto border-t border-white/[0.06] p-3">
        <Link
          href="/private/settings"
          onClick={onNavigate}
          className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 transition-all duration-200 ${
            pathname?.startsWith("/private/settings")
              ? "bg-white/[0.08] text-white"
              : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
          }`}
          aria-current={pathname?.startsWith("/private/settings") ? "page" : undefined}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700/80 bg-zinc-800/60">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            )}
          </div>
          <span className="min-w-0 truncate text-sm font-medium tracking-tight">
            {displayName}
          </span>
        </Link>
      </footer>
    </aside>
  );
}
