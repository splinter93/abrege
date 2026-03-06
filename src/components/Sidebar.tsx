"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  FolderKanban,
  Files,
  Bot,
  TerminalSquare,
  Users,
  BookOpen,
  Settings,
  Trash2,
} from "lucide-react";

import { useMainSidebarOptional } from "@/contexts/MainSidebarContext";
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
  const isMobile = mainSidebar?.isMobile ?? false;
  const isClasseurs = pathname?.startsWith("/private/dossiers");
  const onNavigate = isMobile ? mainSidebar?.closeSidebar : undefined;

  return (
    <aside
      className={`sidebar-root flex h-full min-h-screen w-full flex-shrink-0 flex-col ${isMobile ? '' : 'max-w-[16rem] border-r border-zinc-800/60'}`}
      aria-label="Navigation principale"
    >
      {/* En-tête : Logo + Nom */}
      <header className="p-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-zinc-700 via-zinc-800 to-black shadow-lg"
            aria-hidden
          >
            <Zap className="h-4 w-4 text-white fill-white/10" strokeWidth={2} />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-white/90">Scrivia</span>
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
        </div>

        {/* Séparateur Workspace */}
        <SidebarSectionTitle>Workspace</SidebarSectionTitle>

        {/* Groupe 2 - Workspace */}
        <div className="space-y-0.5">
          <SidebarItem
            icon={Bot}
            label="Agents v2"
            href="/private/agents2"
            active={pathname?.startsWith("/private/agents2") ?? false}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={TerminalSquare}
            label="Prompts"
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
            icon={BookOpen}
            label="Documentation"
            href="/docs"
            active={pathname?.startsWith("/docs") ?? false}
            onNavigate={onNavigate}
          />
        </div>
      </nav>

      {/* Footer */}
      <footer className="space-y-1 border-t border-white/[0.04] p-4">
        <SidebarItem
          icon={Settings}
          label="Paramètres"
          href="/private/settings"
          active={pathname?.startsWith("/private/settings") ?? false}
          onNavigate={onNavigate}
        />
        <SidebarItem
          icon={Trash2}
          label="Corbeille"
          href="/private/trash"
          active={pathname?.startsWith("/private/trash") ?? false}
          onNavigate={onNavigate}
        />
      </footer>
    </aside>
  );
}
