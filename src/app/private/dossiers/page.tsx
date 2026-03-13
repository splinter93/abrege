"use client";

import PageWithSidebarLayout from "@/components/PageWithSidebarLayout";
import DossierErrorBoundary from "@/components/DossierErrorBoundary";
import { DossierLoadingState } from "@/components/DossierLoadingStates";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import type { AuthenticatedUser } from "@/types/dossiers";

import "@/styles/main.css";
import "./index.css";
import "./glassmorphism.css";
import "@/components/DossierErrorBoundary.css";
import "@/components/DossierLoadingStates.css";

import ClasseursPage from "./ClasseursPage";
import ChatWidgetFab from "@/components/chat/ChatWidgetFab";
import ChatWidgetRoot from "@/components/chat/ChatWidgetRoot";

export default function DossiersPage() {
  return (
    <DossierErrorBoundary>
      <AuthGuard>
        <DossiersPageContent />
      </AuthGuard>
    </DossierErrorBoundary>
  );
}

function DossiersPageContent() {
  const { user, loading: authLoading } = useAuth();
  
  // 🔧 FIX: Gérer le cas où l'utilisateur n'est pas encore chargé AVANT d'appeler les hooks
  if (authLoading || !user?.id) {
    return (
      <PageWithSidebarLayout>
        <DossierLoadingState type="initial" message="Vérification de l'authentification..." />
      </PageWithSidebarLayout>
    );
  }
  
  // Maintenant on sait que user.id existe, on peut appeler tous les hooks en toute sécurité
  return <AuthenticatedDossiersContent user={user} />;
}

function AuthenticatedDossiersContent(_props: { user: AuthenticatedUser }) {
  return (
    <PageWithSidebarLayout>
      <ClasseursPage />
      <ChatWidgetFab />
      <ChatWidgetRoot />
    </PageWithSidebarLayout>
  );
} 