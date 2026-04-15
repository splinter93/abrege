"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageWithSidebarLayout from "@/components/PageWithSidebarLayout";
import { useAuth, type User } from "@/hooks/useAuth";
import { supabase } from "@/supabaseClient";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import { logApi } from "@/utils/logger";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import { SimpleLoadingState } from "@/components/DossierLoadingStates";
import "@/components/DossierLoadingStates.css";
import ScriviaFilePicker from "@/components/chat/ScriviaFilePicker";
import { FolderSearch, Image as ImageIcon, Pencil, Trash2, X } from "lucide-react";
import "@/styles/main.css";
import "@/styles/account.css";
import "./settings.css";
interface ApiKey {
  id: string;
  api_key_name: string;
  scopes: string[];
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
}

interface CreateApiKeyResponse {
  success: boolean;
  api_key: string;
  info: {
    api_key_name: string;
    scopes: string[];
    expires_at?: string;
  };
}

interface MeProfileResponse {
  email?: string | null;
  username?: string | null;
  name?: string | null;
  surname?: string | null;
  display_name?: string | null;
  profile_picture?: string | null;
  language?: string | null;
  synesia_api_key_configured?: boolean;
}

/** Même logique que le footer Sidebar : `user_metadata` + email session. */
interface SessionProfileDefaults {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  profilePictureUrl: string;
}

function trimProfileField(v: string | null | undefined): string {
  return (v ?? "").trim();
}

/** URL affichable dans <img> (OAuth, CDN, data URI). */
function isDisplayableAvatarUrl(url: string): boolean {
  const t = url.trim().toLowerCase();
  return (
    t.startsWith("https://") ||
    t.startsWith("http://") ||
    t.startsWith("//") ||
    t.startsWith("data:image/")
  );
}

function buildSessionProfileDefaults(user: User): SessionProfileDefaults {
  const m = (user.user_metadata || {}) as Record<string, unknown>;
  const full =
    (typeof m.full_name === "string" && m.full_name.trim()) ||
    (typeof m.name === "string" && m.name.trim()) ||
    "";
  let firstName = "";
  let lastName = "";
  const t = full.trim();
  if (t) {
    const parts = t.split(/\s+/);
    if (parts.length >= 2) {
      firstName = parts[0];
      lastName = parts.slice(1).join(" ");
    } else {
      firstName = parts[0] || "";
    }
  }
  return {
    email: user.email ?? "",
    username: typeof m.username === "string" ? m.username : "",
    firstName,
    lastName,
    displayName: full,
    profilePictureUrl: typeof m.avatar_url === "string" ? m.avatar_url : "",
  };
}

const SETTINGS_AVATAR_MODAL_INPUT =
  "input-block w-full px-3 py-2 rounded-lg text-sm placeholder:text-zinc-500 focus:outline-none transition-colors";
const SETTINGS_AVATAR_MODAL_LABEL = "text-xs font-medium text-zinc-400 block mb-1.5";

export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <SettingsPageContent />
      </AuthGuard>
    </ErrorBoundary>
  );
}

function SettingsPageContent() {
  const { user, loading: authLoading } = useAuth();

  const sessionDefaults = useMemo(() => {
    if (!user?.id) return null;
    return buildSessionProfileDefaults(user);
  }, [user]);

  if (authLoading || !user?.id || !sessionDefaults) {
    return (
      <PageWithSidebarLayout>
        <SimpleLoadingState message="Chargement" />
      </PageWithSidebarLayout>
    );
  }

  return <AuthenticatedSettingsContent user={user} sessionDefaults={sessionDefaults} />;
}

// 🔧 FIX: Composant séparé pour éviter les problèmes d'ordre des hooks
function AuthenticatedSettingsContent({
  user,
  sessionDefaults,
}: {
  user: User;
  sessionDefaults: SessionProfileDefaults;
}) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'notes:read', 'classeurs:read', 'dossiers:read'
  ]);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string>("");
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);

  const [editingApiKeyId, setEditingApiKeyId] = useState<string | null>(null);
  const [editApiKeyName, setEditApiKeyName] = useState("");
  const [editApiKeyScopes, setEditApiKeyScopes] = useState<string[]>([]);
  const [savingApiKeyEdit, setSavingApiKeyEdit] = useState(false);

  const [language, setLanguage] = useState("fr");
  const [theme, setTheme] = useState("dark");

  const [profileRefreshing, setProfileRefreshing] = useState(false);
  const [profileEmail, setProfileEmail] = useState(sessionDefaults.email);
  const [profileUsername, setProfileUsername] = useState(sessionDefaults.username);
  const [firstName, setFirstName] = useState(sessionDefaults.firstName);
  const [lastName, setLastName] = useState(sessionDefaults.lastName);
  const [displayName, setDisplayName] = useState(sessionDefaults.displayName);
  const [profilePictureUrl, setProfilePictureUrl] = useState(sessionDefaults.profilePictureUrl);
  const [profileBaseline, setProfileBaseline] = useState(() => ({
    firstName: trimProfileField(sessionDefaults.firstName),
    lastName: trimProfileField(sessionDefaults.lastName),
    displayName: trimProfileField(sessionDefaults.displayName),
    profilePictureUrl: trimProfileField(sessionDefaults.profilePictureUrl),
  }));
  const [synesiaKeyConfigured, setSynesiaKeyConfigured] = useState(false);
  const [synesiaKeyDraft, setSynesiaKeyDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSynesia, setSavingSynesia] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [synesiaMessage, setSynesiaMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showProfileAvatarModal, setShowProfileAvatarModal] = useState(false);
  const [showProfileAvatarFilePicker, setShowProfileAvatarFilePicker] = useState(false);

  // Gestionnaire d'erreur sécurisé
  const { handleError } = useSecureErrorHandler({
    context: 'SettingsPage',
    operation: 'gestion_api_keys',
    userId: user.id
  });

  // 🔧 FIX: Définir les fonctions avant de les utiliser dans useEffect
  const getAuthToken = useCallback(async (): Promise<string> => {
    // Récupérer le token depuis Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }, []);

  const loadMeProfile = useCallback(async () => {
    try {
      setProfileRefreshing(true);
      setProfileMessage(null);
      const token = await getAuthToken();
      if (!token) {
        setProfileMessage({ type: "err", text: "Session expirée. Reconnectez-vous." });
        return;
      }
      const response = await fetch("/api/v2/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "Impossible de charger le profil");
      }
      const json: { success?: boolean; data?: MeProfileResponse } = await response.json();
      if (!json.success || !json.data) {
        throw new Error("Réponse profil invalide");
      }
      const d = json.data;
      setProfileEmail(d.email ?? "");
      setProfileUsername(d.username ?? "");
      setFirstName(d.name ?? "");
      setLastName(d.surname ?? "");
      setDisplayName(d.display_name ?? "");
      const apiPic = trimProfileField(d.profile_picture);
      const sessionPic = trimProfileField(sessionDefaults.profilePictureUrl);
      const mergedPic = apiPic || sessionPic;
      setProfilePictureUrl(mergedPic);
      setSynesiaKeyConfigured(Boolean(d.synesia_api_key_configured));
      setProfileBaseline({
        firstName: trimProfileField(d.name),
        lastName: trimProfileField(d.surname),
        displayName: trimProfileField(d.display_name),
        profilePictureUrl: mergedPic,
      });
      if (d.language) {
        setLanguage(d.language);
      }
    } catch (error) {
      handleError(error, "chargement profil");
      setProfileMessage({ type: "err", text: "Profil indisponible pour le moment." });
    } finally {
      setProfileRefreshing(false);
    }
  }, [getAuthToken, handleError, sessionDefaults.profilePictureUrl]);

  const loadApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ui/api-keys', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.api_keys || []);
      } else {
        logApi.error('Erreur chargement API Keys:', response.status);
      }
    } catch (error) {
      handleError(error, 'chargement API Keys');
    } finally {
      setLoading(false);
    }
  }, [handleError, getAuthToken]);

  // Charger le profil (v2/me) et les API Keys
  useEffect(() => {
    if (user?.id) {
      void loadMeProfile();
      loadApiKeys();
    }
  }, [user?.id, loadApiKeys, loadMeProfile]);

  const handleCreateApiKey = useCallback(async () => {
    if (!newApiKeyName.trim() || !user?.id) return;

    try {
      const response = await fetch('/api/ui/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          api_key_name: newApiKeyName.trim(),
          scopes: selectedScopes,
          expires_at: null // Pas d'expiration pour l'instant
        })
      });

      if (response.ok) {
        const data: CreateApiKeyResponse = await response.json();
        setNewlyCreatedKey(data.api_key);
        setShowNewKeyModal(true);
        setShowCreateForm(false);
        setNewApiKeyName("");
        setSelectedScopes(['notes:read', 'classeurs:read', 'dossiers:read']);
        loadApiKeys(); // Recharger la liste
      } else {
        throw new Error('Erreur création API Key');
      }
    } catch (error) {
      handleError(error, 'création API Key');
    }
  }, [newApiKeyName, user?.id, selectedScopes, getAuthToken, loadApiKeys, handleError]);

  const handleDeleteApiKey = useCallback(
    async (apiKey: ApiKey) => {
      if (!confirm(`Êtes-vous sûr de vouloir supprimer l'API Key « ${apiKey.api_key_name} » ?`)) {
        return;
      }
      try {
        const token = await getAuthToken();
        if (!token) return;
        const response = await fetch(
          `/api/ui/api-keys?id=${encodeURIComponent(apiKey.id)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(
            typeof errBody.error === "string" ? errBody.error : "Suppression impossible",
          );
        }
        await loadApiKeys();
      } catch (error) {
        handleError(error, "suppression API Key");
      }
    },
    [getAuthToken, loadApiKeys, handleError],
  );

  const saveProfile = useCallback(async () => {
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        setProfileMessage({ type: "err", text: "Session expirée." });
        return;
      }
      const response = await fetch("/api/v2/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: firstName.trim() || null,
          surname: lastName.trim() || null,
          display_name: displayName.trim() || null,
          profile_picture: profilePictureUrl.trim() === "" ? "" : profilePictureUrl.trim(),
        }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "Enregistrement impossible");
      }
      setProfileMessage({ type: "ok", text: "Profil enregistré." });
      try {
        await supabase.auth.refreshSession();
      } catch {
        /* session inchangée si refresh indisponible */
      }
      await loadMeProfile();
    } catch (error) {
      handleError(error, "mise à jour profil");
      setProfileMessage({ type: "err", text: "Échec de l’enregistrement du profil." });
    } finally {
      setSavingProfile(false);
    }
  }, [
    getAuthToken,
    firstName,
    lastName,
    displayName,
    profilePictureUrl,
    handleError,
    loadMeProfile,
  ]);

  const saveSynesiaKey = useCallback(async () => {
    const key = synesiaKeyDraft.trim();
    if (!key) {
      setSynesiaMessage({ type: "err", text: "Saisissez votre clé API." });
      return;
    }
    setSavingSynesia(true);
    setSynesiaMessage(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        setSynesiaMessage({ type: "err", text: "Session expirée." });
        return;
      }
      const response = await fetch("/api/v2/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ synesia_api_key: key }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "Enregistrement impossible");
      }
      setSynesiaKeyDraft("");
      setSynesiaKeyConfigured(true);
      setSynesiaMessage({ type: "ok", text: "Clé Synesia / Liminality enregistrée." });
      await loadMeProfile();
    } catch (error) {
      handleError(error, "mise à jour clé Synesia");
      setSynesiaMessage({ type: "err", text: "Échec de l’enregistrement de la clé." });
    } finally {
      setSavingSynesia(false);
    }
  }, [synesiaKeyDraft, getAuthToken, handleError, loadMeProfile]);

  const toggleScope = useCallback((scope: string) => {
    setSelectedScopes(prev => 
      prev.includes(scope) 
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  }, []);

  const toggleEditScope = useCallback((scope: string) => {
    setEditApiKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }, []);

  const closeEditApiKey = useCallback(() => {
    setEditingApiKeyId(null);
  }, []);

  const openEditApiKey = useCallback((key: ApiKey) => {
    setShowCreateForm(false);
    setEditingApiKeyId(key.id);
    setEditApiKeyName(key.api_key_name);
    setEditApiKeyScopes([...key.scopes]);
  }, []);

  const handleSaveApiKeyEdit = useCallback(async () => {
    if (!editingApiKeyId) return;
    const name = editApiKeyName.trim();
    if (!name) {
      handleError(new Error("Nom requis"), "maj api key");
      return;
    }
    if (editApiKeyScopes.length === 0) {
      handleError(new Error("Au moins une permission requise"), "maj api key");
      return;
    }
    setSavingApiKeyEdit(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const response = await fetch("/api/ui/api-keys", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingApiKeyId,
          api_key_name: name,
          scopes: editApiKeyScopes,
        }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(typeof errBody.error === "string" ? errBody.error : "Mise à jour impossible");
      }
      closeEditApiKey();
      await loadApiKeys();
    } catch (error) {
      handleError(error, "maj api key");
    } finally {
      setSavingApiKeyEdit(false);
    }
  }, [
    editingApiKeyId,
    editApiKeyName,
    editApiKeyScopes,
    getAuthToken,
    loadApiKeys,
    handleError,
    closeEditApiKey,
  ]);

  const profileDirty = useMemo(
    () =>
      trimProfileField(firstName) !== profileBaseline.firstName ||
      trimProfileField(lastName) !== profileBaseline.lastName ||
      trimProfileField(displayName) !== profileBaseline.displayName ||
      trimProfileField(profilePictureUrl) !== profileBaseline.profilePictureUrl,
    [firstName, lastName, displayName, profilePictureUrl, profileBaseline],
  );

  const synesiaKeyDirty = synesiaKeyDraft.trim().length > 0;

  const profileAvatarFallback = useMemo(() => {
    const d = trimProfileField(displayName);
    if (d) {
      return d
        .split(/\s+/)
        .map((chunk) => chunk.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    const local = profileEmail.includes("@") ? profileEmail.split("@")[0] : profileEmail;
    return (local || "?").slice(0, 2).toUpperCase();
  }, [displayName, profileEmail]);

  const displayProfileAvatarPreview =
    isDisplayableAvatarUrl(profilePictureUrl) && profilePictureUrl.trim().length > 0;

  // 🔧 OPTIMISATION: Mémoiser les scopes disponibles pour éviter les re-renders
  const availableScopes = useMemo(() => [
    { key: 'notes:read', label: 'Lecture des notes', description: 'Consulter vos notes et articles' },
    { key: 'notes:write', label: 'Écriture des notes', description: 'Créer et modifier vos notes' },
    { key: 'classeurs:read', label: 'Lecture des classeurs', description: 'Consulter vos classeurs' },
    { key: 'classeurs:write', label: 'Écriture des classeurs', description: 'Créer et modifier vos classeurs' },
    { key: 'dossiers:read', label: 'Lecture des dossiers', description: 'Consulter vos dossiers' },
    { key: 'dossiers:write', label: 'Écriture des dossiers', description: 'Créer et modifier vos dossiers' }
  ], []);

  useEffect(() => {
    if (editingApiKeyId === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeEditApiKey();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingApiKeyId, closeEditApiKey]);

  useEffect(() => {
    if (!showProfileAvatarModal) {
      setShowProfileAvatarFilePicker(false);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowProfileAvatarModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showProfileAvatarModal]);

  // 🔧 FIX: Plus besoin de vérifier authLoading car c'est déjà fait dans le composant parent

  return (
    <PageWithSidebarLayout>
      <div className="page-content-inner page-content-inner-settings min-h-full flex flex-col bg-[var(--color-bg-primary)] w-full">
        <div className="settings-page-shell flex min-h-0 flex-1 flex-col">
          <header className="settings-page-header shrink-0 pt-5 sm:pt-8 pb-6 sm:pb-8">
            <div className="min-w-0 flex flex-col font-sans">
              <h1 className="bg-gradient-to-b from-white to-white/55 bg-clip-text text-3xl font-bold leading-tight tracking-tight text-transparent sm:text-4xl">
                Paramètres
              </h1>
              <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-zinc-500">
                Profil, préférences, Synesia / Liminality, clés API développeur et sécurité.
              </p>
            </div>
          </header>

          <main className="settings-page-main no-scrollbar min-h-0 flex-1 overflow-y-auto pb-8 sm:pb-10">
            <div className="flex w-full flex-col gap-8">

            {/* Profil */}
            <motion.section
              className="settings-v-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0 }}
            >
              <div className="mb-4 flex flex-col gap-2">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <h2 className="settings-v-title mb-0 min-w-0 shrink">Profile</h2>
                  {profileDirty ? (
                    <button
                      type="button"
                      disabled={savingProfile || profileRefreshing}
                      onClick={() => void saveProfile()}
                      className="settings-v-btn shrink-0"
                    >
                      {savingProfile ? "Saving..." : "Save"}
                    </button>
                  ) : null}
                </div>
                {profileRefreshing || profileMessage ? (
                  <p
                    className={`text-sm font-medium ${
                      profileRefreshing
                        ? "text-zinc-400"
                        : profileMessage?.type === "ok"
                          ? "text-emerald-400"
                          : "text-red-400"
                    }`}
                  >
                    {profileRefreshing
                      ? "Synchronisation avec le serveur…"
                      : profileMessage?.text}
                  </p>
                ) : null}
              </div>
              <div className="settings-v-card">
                <div className="settings-v-row">
                  <div className="settings-v-row-content">
                    <div className="settings-v-row-label">Profile picture</div>
                  </div>
                  <div className="settings-v-row-action">
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowProfileAvatarModal(true)}
                        aria-label="Voir et modifier la photo de profil"
                        className="group/avatar relative section-block flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-medium text-zinc-400 transition-colors hover:border-[var(--color-border-secondary)]"
                      >
                        {displayProfileAvatarPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profilePictureUrl.trim()}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="transition-opacity group-hover/avatar:opacity-0">
                            {profileAvatarFallback}
                          </span>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-700/60 opacity-0 transition-opacity group-hover/avatar:opacity-100">
                          <Pencil className="h-3.5 w-3.5 text-zinc-100" aria-hidden />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {profileUsername ? (
                  <div className="settings-v-row">
                    <div className="settings-v-row-content">
                      <div className="settings-v-row-label">Username</div>
                      <div className="settings-v-row-desc">One word, like a nickname or first name</div>
                    </div>
                    <div className="settings-v-row-action">
                      <input type="text" readOnly value={profileUsername} className="settings-v-input" />
                    </div>
                  </div>
                ) : null}

                <div className="settings-v-row">
                  <div className="settings-v-row-content">
                    <div className="settings-v-row-label">Email</div>
                  </div>
                  <div className="settings-v-row-action">
                    <input type="text" readOnly value={profileEmail} className="settings-v-input" />
                  </div>
                </div>

                <div className="settings-v-row">
                  <div className="settings-v-row-content">
                    <div className="settings-v-row-label">Full name</div>
                  </div>
                  <div className="settings-v-row-action">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="settings-v-input"
                      placeholder="Prénom Nom"
                    />
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Section Préférences */}
            <motion.section
              className="settings-v-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <h2 className="settings-v-title">Preferences</h2>
              <div className="settings-v-card">
                <div className="settings-v-row">
                  <div className="settings-v-row-content">
                    <div className="settings-v-row-label">Language</div>
                  </div>
                  <div className="settings-v-row-action">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="settings-v-input cursor-pointer"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                <div className="settings-v-row">
                  <div className="settings-v-row-content">
                    <div className="settings-v-row-label">Theme</div>
                  </div>
                  <div className="settings-v-row-action">
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="settings-v-input cursor-pointer"
                    >
                      <option value="light">Clair</option>
                      <option value="dark">Sombre</option>
                      <option value="auto">Automatique</option>
                    </select>
                  </div>
                </div>

                <div className="settings-v-row">
                  <div className="settings-v-row-content">
                    <div className="settings-v-row-label">Notifications</div>
                    <div className="settings-v-row-desc">Canaux de communication privilégiés</div>
                  </div>
                  <div className="settings-v-row-action">
                    <div className="flex flex-row flex-wrap items-center gap-6 sm:gap-8">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input type="checkbox" defaultChecked className="settings-v-checkbox shrink-0" />
                        <span className="text-[14px] text-zinc-400 group-hover:text-white transition-colors">Email</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input type="checkbox" className="settings-v-checkbox shrink-0" />
                        <span className="text-[14px] text-zinc-400 group-hover:text-white transition-colors">Push</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Synesia / Liminality */}
            <motion.section
              className="settings-v-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
            >
              <div className="mb-4 flex flex-col gap-2">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <h2 className="settings-v-title mb-0 min-w-0 shrink">Models & AI</h2>
                  {synesiaKeyDirty ? (
                    <button
                      type="button"
                      disabled={savingSynesia}
                      onClick={() => void saveSynesiaKey()}
                      className="settings-v-btn shrink-0"
                    >
                      {savingSynesia ? "Saving..." : "Save"}
                    </button>
                  ) : null}
                </div>
                {synesiaMessage ? (
                  <p
                    className={`text-sm font-medium ${
                      synesiaMessage.type === "ok" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {synesiaMessage.text}
                  </p>
                ) : null}
              </div>
              <div className="settings-v-card">
                <div className="settings-v-row">
                  <div className="settings-v-row-content">
                    <div className="settings-v-row-label flex flex-wrap items-center gap-2">
                      Synesia / Liminality API Key
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${synesiaKeyConfigured ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400/90 border border-red-500/20"}`}>
                        {synesiaKeyConfigured ? "Enregistrée" : "À renseigner"}
                      </span>
                    </div>
                  </div>
                  <div className="settings-v-row-action">
                    <input
                      type="password"
                      value={synesiaKeyDraft}
                      onChange={(e) => setSynesiaKeyDraft(e.target.value)}
                      className="settings-v-input font-mono"
                      placeholder="sk-..."
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Section Clés API */}
            <motion.section
              className="settings-v-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="settings-v-title mb-0">Developer API Keys</h2>
                <button
                  type="button"
                  onClick={() => {
                    closeEditApiKey();
                    setShowCreateForm((v) => !v);
                  }}
                  className="settings-v-btn"
                >
                  Nouvelle clé
                </button>
              </div>

              <div className="settings-v-card">
                <AnimatePresence>
                  {showCreateForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-b border-white/[0.04]"
                    >
                      <div className="p-5">
                        <div className="mb-4">
                          <label className="block text-[14px] font-medium text-white mb-2">Nom de la clé API</label>
                          <input
                            type="text"
                            value={newApiKeyName}
                            onChange={(e) => setNewApiKeyName(e.target.value)}
                            placeholder="Ex: Scrivia Integration..."
                            className="settings-v-input !max-w-none"
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-[14px] font-medium text-white mb-2">Permissions (scopes)</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {availableScopes.map((scope) => (
                              <label key={scope.key} className="flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors">
                                <input
                                  type="checkbox"
                                  checked={selectedScopes.includes(scope.key)}
                                  onChange={() => toggleScope(scope.key)}
                                  className="settings-v-checkbox mt-0.5 shrink-0"
                                />
                                <div>
                                  <div className="text-[13px] font-medium text-white">{scope.label}</div>
                                  <div className="text-[12px] text-zinc-500 leading-tight mt-0.5">{scope.description}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowCreateForm(false)}
                            className="settings-v-btn-secondary"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateApiKey}
                            disabled={!newApiKeyName.trim()}
                            className="settings-v-btn"
                          >
                            Créer
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {loading ? (
                  <div className="py-12 flex justify-center">
                    <SimpleLoadingState message="Chargement des clés..." />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-[14px]">
                    Aucune clé API créée.
                  </div>
                ) : (
                  <div className="settings-api-key-list">
                    {apiKeys.map((apiKey, index) => (
                      <div
                        key={apiKey.id}
                        className={`settings-api-key-list__item border-b [border-bottom:var(--border-block)] last:border-b-0 ${!apiKey.is_active ? "opacity-55" : ""}`}
                      >
                        <motion.div
                          className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-white/[0.01] transition-colors group cursor-default"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: index * 0.04 }}
                        >
                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[0.875rem] font-medium text-[var(--color-text-primary,#ededed)]">{apiKey.api_key_name}</span>
                              <span
                                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                  apiKey.is_active
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                    : "border-red-500/20 bg-red-500/10 text-red-400"
                                }`}
                              >
                                {apiKey.is_active ? "Actif" : "Inactif"}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-3 text-[0.8125rem]">
                              <div className="flex items-center gap-1.5 text-[var(--color-text-secondary,#a1a1aa)]">
                                <span className="opacity-70">Créée le</span>
                                <span>{new Date(apiKey.created_at).toLocaleDateString("fr-FR")}</span>
                              </div>
                              {apiKey.last_used_at ? (
                                <div className="flex items-center gap-1.5 text-[var(--color-text-secondary,#a1a1aa)]">
                                  <span className="w-1 h-1 rounded-full bg-zinc-600/50"></span>
                                  <span className="opacity-70">Dernier accès le</span>
                                  <span>{new Date(apiKey.last_used_at).toLocaleDateString("fr-FR")}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-[var(--color-text-secondary,#a1a1aa)]">
                                  <span className="w-1 h-1 rounded-full bg-zinc-600/50"></span>
                                  <span className="opacity-70">Jamais utilisée</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openEditApiKey(apiKey)}
                              className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
                              title="Modifier la clé"
                              aria-label="Modifier la clé"
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteApiKey(apiKey)}
                              className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                              title="Supprimer la clé"
                              aria-label="Supprimer la clé"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>

            {/* Section Sécurité */}
            <motion.section
              className="settings-v-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <h2 className="settings-v-title">Workspace access</h2>
              <div className="settings-v-card">
                <div className="settings-v-row">
                  <div className="settings-v-row-content">
                    <div className="settings-v-row-label">Remove yourself from workspace</div>
                    <div className="settings-v-row-desc">Action irréversible. Toutes vos données seront effacées.</div>
                  </div>
                  <div className="settings-v-row-action">
                    <button type="button" className="settings-v-btn-danger">Leave workspace</button>
                  </div>
                </div>
              </div>
            </motion.section>

            </div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {showNewKeyModal && (
          <motion.div
            key="settings-modal-new-key"
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNewKeyModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>🔑 Nouvelle clé API créée !</h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowNewKeyModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="warning-box">
                  <p><strong>⚠️ Important :</strong> Cette clé ne sera affichée qu&apos;une seule fois.</p>
                  <p>Copiez-la et stockez-la en lieu sûr. Vous ne pourrez plus la voir après avoir fermé cette fenêtre.</p>
                </div>
                <div className="api-key-display">
                  <code className="api-key-code">{newlyCreatedKey}</code>
                  <button
                    type="button"
                    className="settings-copy-button"
                    onClick={() => navigator.clipboard.writeText(newlyCreatedKey)}
                  >
                    📋 Copier
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-button"
                  onClick={() => setShowNewKeyModal(false)}
                >
                  J&apos;ai copié ma clé
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {editingApiKeyId !== null && (
          <motion.div
            key="settings-modal-edit-api-key"
            className="modal-overlay"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeEditApiKey()}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-edit-api-key-title"
              className="settings-api-key-edit-modal"
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="settings-api-key-edit-modal__header">
                <h3 id="settings-edit-api-key-title" className="settings-api-key-edit-modal__title">
                  Modifier la clé API
                </h3>
                <button
                  type="button"
                  className="settings-api-key-edit-modal__close"
                  onClick={() => closeEditApiKey()}
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="settings-api-key-edit-modal__body">
                <label className="settings-api-key-edit-modal__label" htmlFor="settings-edit-api-key-name">
                  Nom de la clé
                </label>
                <input
                  id="settings-edit-api-key-name"
                  type="text"
                  value={editApiKeyName}
                  onChange={(e) => setEditApiKeyName(e.target.value)}
                  className="settings-v-input mb-5 w-full max-w-none"
                  autoComplete="off"
                />
                <p className="settings-api-key-edit-modal__section-title">Permissions</p>
                <div className="settings-api-key-edit-modal__scopes">
                  {availableScopes.map((scope) => (
                    <label key={scope.key} className="settings-api-key-edit-modal__scope">
                      <input
                        type="checkbox"
                        className="settings-v-checkbox"
                        checked={editApiKeyScopes.includes(scope.key)}
                        onChange={() => toggleEditScope(scope.key)}
                      />
                      <span className="settings-api-key-edit-modal__scope-text">{scope.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="settings-api-key-edit-modal__footer">
                <button
                  type="button"
                  onClick={() => closeEditApiKey()}
                  className="settings-v-btn-secondary"
                  disabled={savingApiKeyEdit}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveApiKeyEdit()}
                  disabled={savingApiKeyEdit || !editApiKeyName.trim() || editApiKeyScopes.length === 0}
                  className="settings-v-btn"
                >
                  {savingApiKeyEdit ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showProfileAvatarModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-profile-avatar-modal-title"
        >
          <div className="section-block w-full max-w-md overflow-hidden rounded-2xl shadow-xl">
            <header className="flex min-h-12 shrink-0 items-center gap-3 border-b border-[var(--color-border-block)] px-5 py-3 sm:min-h-[3.25rem] sm:px-6 sm:py-3.5">
              <h3
                id="settings-profile-avatar-modal-title"
                className="min-w-0 flex-1 text-base font-semibold leading-snug text-zinc-100"
              >
                Photo de profil
              </h3>
              <button
                type="button"
                onClick={() => setShowProfileAvatarModal(false)}
                aria-label="Fermer"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-[var(--color-bg-content)] hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-6 px-5 pb-6 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
              <div className="flex justify-center">
                <div className="section-block flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-2xl font-medium text-zinc-400">
                  {displayProfileAvatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profilePictureUrl.trim()}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{profileAvatarFallback}</span>
                  )}
                </div>
              </div>
              <div>
                <label className={SETTINGS_AVATAR_MODAL_LABEL} htmlFor="settings-profile-avatar-url">
                  URL de l&apos;image
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      id="settings-profile-avatar-url"
                      type="text"
                      className={`${SETTINGS_AVATAR_MODAL_INPUT} pl-9`}
                      value={profilePictureUrl}
                      onChange={(e) => setProfilePictureUrl(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProfileAvatarFilePicker(true)}
                    title="Parcourir mes fichiers"
                    className="section-block shrink-0 rounded-lg p-2.5 text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
                  >
                    <FolderSearch className="h-4 w-4" />
                  </button>
                </div>
                <ScriviaFilePicker
                  isOpen={showProfileAvatarFilePicker}
                  onClose={() => setShowProfileAvatarFilePicker(false)}
                  onSelectImages={(images) => {
                    if (images.length > 0) {
                      setProfilePictureUrl(images[0].url);
                    }
                    setShowProfileAvatarFilePicker(false);
                  }}
                  multiple={false}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageWithSidebarLayout>
  );
} 