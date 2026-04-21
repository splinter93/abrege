"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import PageWithSidebarLayout from "@/components/PageWithSidebarLayout";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import { 
  BookOpen, 
  ChevronRight, 
  ChevronDown, 
  Play, 
  FileText, 
  HelpCircle,
  Settings,
  Search,
  Share2,
  Folder,
  Sparkles,
  Monitor
} from "lucide-react";
import "@/styles/main.css";
import "./documentation.css";

interface DocumentationSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
  subsections: DocumentationSubsection[];
  isExpanded?: boolean;
}

interface DocumentationSubsection {
  id: string;
  title: string;
  content: React.ReactNode;
  isVideo?: boolean;
  isTutorial?: boolean;
  isGuide?: boolean;
}

const DocumentationPage: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const documentationSections: DocumentationSection[] = [
    {
      id: 'getting-started',
      title: 'Démarrage Rapide',
      icon: Play,
      description: 'Commencez avec Scrivia en quelques minutes',
      subsections: [
        {
          id: 'welcome',
          title: 'Bienvenue sur Scrivia',
          content: (
            <div className="doc-content">
              <p>Scrivia est votre assistant IA pour organiser, résumer et gérer vos connaissances de manière intelligente.</p>
              <div className="feature-highlight">
                <h4>🎯 Fonctionnalités principales :</h4>
                <ul>
                  <li>Création et organisation de classeurs</li>
                  <li>Résumés automatiques avec IA</li>
                  <li>Recherche intelligente</li>
                  <li>Partage et collaboration</li>
                  <li>Interface moderne et intuitive</li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'first-steps',
          title: 'Vos premiers pas',
          content: (
            <div className="doc-content">
              <h4>1. Créer votre premier classeur</h4>
              <p>Cliquez sur le bouton "+" dans la section "Mes Classeurs" pour créer votre premier classeur.</p>
              
              <h4>2. Ajouter des notes</h4>
              <p>Utilisez le bouton "Nouvelle note" pour créer votre première note et commencer à organiser vos idées.</p>
              
              <h4>3. Explorer l'IA</h4>
              <p>Testez les agents spécialisés pour résumer, analyser et enrichir vos contenus automatiquement.</p>
            </div>
          )
        }
      ]
    },
    {
      id: 'interface-guide',
      title: 'Guide de l\'Interface',
      icon: Monitor,
      description: 'Découvrez toutes les fonctionnalités de l\'interface',
      subsections: [
        {
          id: 'sidebar',
          title: 'Navigation et Sidebar',
          content: (
            <div className="doc-content">
              <h4>Navigation principale</h4>
              <p>La sidebar contient tous les accès rapides :</p>
              <ul>
                <li><strong>Dashboard</strong> - Tableau de bord principal</li>
                <li><strong>Mes Classeurs</strong> - Gestion de vos classeurs</li>
                <li><strong>Notes Partagées</strong> - Contenus partagés</li>
                <li><strong>Mes Fichiers</strong> - Gestion des fichiers</li>
                <li><strong>Corbeille</strong> - Éléments supprimés</li>
                <li><strong>Paramètres</strong> - Configuration</li>
              </ul>
            </div>
          )
        },
        {
          id: 'classeurs',
          title: 'Gestion des Classeurs',
          content: (
            <div className="doc-content">
              <h4>Créer un classeur</h4>
              <p>Les classeurs sont vos espaces de travail principaux. Vous pouvez :</p>
              <ul>
                <li>Les créer avec un nom et un emoji personnalisé</li>
                <li>Les réorganiser par glisser-déposer</li>
                <li>Les renommer ou les supprimer</li>
                <li>Y créer des dossiers et des notes</li>
              </ul>
              
              <h4>Organisation</h4>
              <p>Structurez vos classeurs avec des dossiers pour une organisation optimale de vos connaissances.</p>
            </div>
          )
        },
        {
          id: 'notes',
          title: 'Création et Édition de Notes',
          content: (
            <div className="doc-content">
              <h4>Éditeur de notes</h4>
              <p>L'éditeur Scrivia offre :</p>
              <ul>
                <li>Formatage Markdown complet</li>
                <li>Prévisualisation en temps réel</li>
                <li>Sauvegarde automatique</li>
                <li>Recherche dans le contenu</li>
                <li>Commandes slash pour insertion rapide</li>
              </ul>
              
              <h4>Commandes utiles</h4>
              <p>Tapez "/" dans l'éditeur pour accéder aux commandes rapides :</p>
              <ul>
                <li><code>/titre</code> - Insérer un titre</li>
                <li><code>/liste</code> - Créer une liste</li>
                <li><code>/tableau</code> - Insérer un tableau</li>
                <li><code>/code</code> - Bloc de code</li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      id: 'ai-features',
      title: 'Fonctionnalités IA',
      icon: Sparkles,
      description: 'Exploitez la puissance de l\'intelligence artificielle',
      subsections: [
        {
          id: 'agents',
          title: 'Agents Spécialisés',
          content: (
            <div className="doc-content">
              <h4>Types d'agents disponibles</h4>
              <div className="agent-grid">
                <div className="agent-card">
                  <h5>🤖 Agent Résumé</h5>
                  <p>Génère des résumés automatiques de vos contenus</p>
                </div>
                <div className="agent-card">
                  <h5>📝 Agent Correction</h5>
                  <p>Corrige et améliore la qualité de vos textes</p>
                </div>
                <div className="agent-card">
                  <h5>🔍 Agent Analyse</h5>
                  <p>Analyse et extrait les informations clés</p>
                </div>
                <div className="agent-card">
                  <h5>💡 Agent Création</h5>
                  <p>Crée du contenu basé sur vos instructions</p>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'chat',
          title: 'Chat Intelligent',
          content: (
            <div className="doc-content">
              <h4>Conversation avec l'IA</h4>
              <p>Le chat Scrivia vous permet de :</p>
              <ul>
                <li>Poser des questions sur vos contenus</li>
                <li>Demander des explications</li>
                <li>Générer du contenu</li>
                <li>Obtenir de l'aide contextuelle</li>
              </ul>
              
              <h4>Conseils d'utilisation</h4>
              <p>Pour de meilleurs résultats :</p>
              <ul>
                <li>Soyez précis dans vos demandes</li>
                <li>Fournissez du contexte</li>
                <li>Utilisez des exemples</li>
                <li>N'hésitez pas à reformuler</li>
              </ul>
            </div>
          )
        },
        {
          id: 'summaries',
          title: 'Résumés Automatiques',
          content: (
            <div className="doc-content">
              <h4>Génération de résumés</h4>
              <p>Scrivia peut automatiquement :</p>
              <ul>
                <li>Résumer vos notes longues</li>
                <li>Extraire les points clés</li>
                <li>Adapter le niveau de détail</li>
                <li>Générer des versions courtes et longues</li>
              </ul>
              
              <h4>Personnalisation</h4>
              <p>Vous pouvez ajuster :</p>
              <ul>
                <li>La longueur du résumé</li>
                <li>Le style de présentation</li>
                <li>Les points d'attention</li>
                <li>Le format de sortie</li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      id: 'organization',
      title: 'Organisation et Gestion',
      icon: Folder,
      description: 'Organisez efficacement vos connaissances',
      subsections: [
        {
          id: 'folders',
          title: 'Gestion des Dossiers',
          content: (
            <div className="doc-content">
              <h4>Structure hiérarchique</h4>
              <p>Organisez vos notes avec des dossiers :</p>
              <ul>
                <li>Créez des dossiers dans vos classeurs</li>
                <li>Organisez par thème ou projet</li>
                <li>Utilisez des sous-dossiers</li>
                <li>Déplacez les éléments par glisser-déposer</li>
              </ul>
              
              <h4>Navigation</h4>
              <p>Naviguez facilement avec :</p>
              <ul>
                <li>Le fil d'Ariane (breadcrumb)</li>
                <li>La recherche globale</li>
                <li>Les raccourcis clavier</li>
                <li>L'historique de navigation</li>
              </ul>
            </div>
          )
        },
        {
          id: 'search',
          title: 'Recherche et Découverte',
          content: (
            <div className="doc-content">
              <h4>Recherche intelligente</h4>
              <p>La recherche Scrivia inclut :</p>
              <ul>
                <li>Recherche dans le contenu des notes</li>
                <li>Recherche par tags et métadonnées</li>
                <li>Suggestions automatiques</li>
                <li>Filtres avancés</li>
              </ul>
              
              <h4>Astuces de recherche</h4>
              <p>Utilisez :</p>
              <ul>
                <li>Des guillemets pour des phrases exactes</li>
                <li>Des opérateurs booléens (AND, OR, NOT)</li>
                <li>Des wildcards (*, ?)</li>
                <li>Des filtres par date ou type</li>
              </ul>
            </div>
          )
        },
        {
          id: 'tags',
          title: 'Système de Tags',
          content: (
            <div className="doc-content">
              <h4>Organisation par tags</h4>
              <p>Utilisez les tags pour :</p>
              <ul>
                <li>Catégoriser vos notes</li>
                <li>Faciliter la recherche</li>
                <li>Grouper des contenus similaires</li>
                <li>Créer des collections thématiques</li>
              </ul>
              
              <h4>Gestion des tags</h4>
              <p>Vous pouvez :</p>
              <ul>
                <li>Créer des tags personnalisés</li>
                <li>Modifier ou supprimer des tags</li>
                <li>Voir les tags les plus utilisés</li>
                <li>Filtrer par tags</li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      id: 'sharing',
      title: 'Partage et Collaboration',
      icon: Share2,
      description: 'Partagez et collaborez sur vos contenus',
      subsections: [
        {
          id: 'public-sharing',
          title: 'Partage Public',
          content: (
            <div className="doc-content">
              <h4>Partager une note</h4>
              <p>Rendez vos notes accessibles publiquement :</p>
              <ul>
                <li>Générez un lien de partage</li>
                <li>Contrôlez la visibilité</li>
                <li>Définissez des permissions</li>
                <li>Suivez les vues et interactions</li>
              </ul>
              
              <h4>Paramètres de confidentialité</h4>
              <p>Configurez :</p>
              <ul>
                <li>La visibilité (public/privé)</li>
                <li>Les permissions d'édition</li>
                <li>L'expiration du lien</li>
                <li>Le mot de passe de protection</li>
              </ul>
            </div>
          )
        },
        {
          id: 'collaboration',
          title: 'Collaboration en Équipe',
          content: (
            <div className="doc-content">
              <h4>Édition collaborative</h4>
              <p>Travaillez ensemble en temps réel :</p>
              <ul>
                <li>Invitez des collaborateurs</li>
                <li>Éditez simultanément</li>
                <li>Suivez les modifications</li>
                <li>Communiquez via les commentaires</li>
              </ul>
              
              <h4>Gestion des permissions</h4>
              <p>Contrôlez l'accès avec :</p>
              <ul>
                <li>Rôles personnalisés</li>
                <li>Permissions granulaires</li>
                <li>Validation des modifications</li>
                <li>Historique des changements</li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      id: 'advanced',
      title: 'Fonctionnalités Avancées',
      icon: Settings,
      description: 'Explorez les fonctionnalités avancées de Scrivia',
      subsections: [
        {
          id: 'api',
          title: 'API et Intégrations',
          content: (
            <div className="doc-content">
              <h4>API Scrivia</h4>
              <p>Intégrez Scrivia dans vos workflows :</p>
              <ul>
                <li>API REST complète</li>
                <li>Clés d'API personnalisées</li>
                <li>Webhooks pour les événements</li>
                <li>SDK pour différents langages</li>
              </ul>
              
              <h4>Intégrations tierces</h4>
              <p>Connectez Scrivia à :</p>
              <ul>
                <li>Google Drive</li>
                <li>Notion</li>
                <li>Slack</li>
                <li>Zapier</li>
              </ul>
            </div>
          )
        },
        {
          id: 'automation',
          title: 'Automatisation',
          content: (
            <div className="doc-content">
              <h4>Règles automatiques</h4>
              <p>Automatisez vos tâches répétitives :</p>
              <ul>
                <li>Résumés automatiques</li>
                <li>Classification par tags</li>
                <li>Archivage programmé</li>
                <li>Notifications personnalisées</li>
              </ul>
              
              <h4>Workflows</h4>
              <p>Créez des workflows complexes :</p>
              <ul>
                <li>Déclencheurs conditionnels</li>
                <li>Actions en chaîne</li>
                <li>Intégrations externes</li>
                <li>Monitoring et logs</li>
              </ul>
            </div>
          )
        },
        {
          id: 'backup',
          title: 'Sauvegarde et Sécurité',
          content: (
            <div className="doc-content">
              <h4>Sauvegarde automatique</h4>
              <p>Vos données sont protégées :</p>
              <ul>
                <li>Sauvegarde en temps réel</li>
                <li>Versioning des documents</li>
                <li>Récupération de données</li>
                <li>Export en plusieurs formats</li>
              </ul>
              
              <h4>Sécurité</h4>
              <p>Protection maximale :</p>
              <ul>
                <li>Chiffrement end-to-end</li>
                <li>Authentification 2FA</li>
                <li>Audit des accès</li>
                <li>Conformité RGPD</li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      id: 'custom-gpt',
      title: 'Créer votre GPT personnalisé avec Scrivia',
      icon: Sparkles,
      description: 'Intégrez Scrivia dans vos assistants IA personnalisés',
      subsections: [
        {
          id: 'gpt-overview',
          title: 'Vue d\'ensemble des GPT personnalisés',
          content: (
            <div className="doc-content">
              <h4>Qu\'est-ce qu\'un GPT personnalisé ?</h4>
              <p>Un GPT personnalisé est un assistant IA que vous pouvez créer et configurer selon vos besoins spécifiques, en utilisant Scrivia comme source de connaissances.</p>
              
              <div className="feature-highlight">
                <h4>🎯 Avantages de Scrivia pour vos GPT :</h4>
                <ul>
                  <li>Accès à vos notes et classeurs organisés</li>
                  <li>Contexte riche et structuré</li>
                  <li>Mise à jour automatique des connaissances</li>
                  <li>Intégration transparente avec l'API</li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'gpt-setup',
          title: 'Configuration de base',
          content: (
            <div className="doc-content">
              <h4>1. Obtenir votre clé API Scrivia</h4>
              <p>Pour connecter votre GPT à Scrivia :</p>
              <ul>
                <li>Allez dans "Mon Compte" → "Clés API"</li>
                <li>Générez une nouvelle clé API</li>
                <li>Copiez la clé (elle ne sera affichée qu'une seule fois)</li>
                <li>Notez l'URL de base de l'API : <code>https://api.scrivia.com</code></li>
              </ul>
              
              <h4>2. Configuration dans ChatGPT</h4>
              <p>Dans l'éditeur de GPT personnalisé :</p>
              <ul>
                <li>Ajoutez des instructions personnalisées</li>
                <li>Configurez les actions avec l'API Scrivia</li>
                <li>Définissez les paramètres de sécurité</li>
                <li>Testez la connexion</li>
              </ul>
            </div>
          )
        },
        {
          id: 'gpt-actions',
          title: 'Actions et Intégrations',
          content: (
            <div className="doc-content">
              <h4>Actions disponibles</h4>
              <div className="agent-grid">
                <div className="agent-card">
                  <h5>📚 Rechercher des notes</h5>
                  <p>Recherche dans vos classeurs et notes</p>
                </div>
                <div className="agent-card">
                  <h5>📝 Créer du contenu</h5>
                  <p>Génère des notes basées sur vos données</p>
                </div>
                <div className="agent-card">
                  <h5>🔄 Synchroniser</h5>
                  <p>Met à jour les informations en temps réel</p>
                </div>
                <div className="agent-card">
                  <h5>📊 Analyser</h5>
                  <p>Analyse vos contenus et génère des insights</p>
                </div>
              </div>
              
              <h4>Exemple de configuration</h4>
              <div className="code-block">
                <pre><code>{`{
  "name": "search_notes",
  "description": "Recherche dans les notes Scrivia",
  "parameters": {
    "query": "string",
    "classeur_id": "string",
    "limit": "number"
  },
  "url": "https://api.scrivia.com/v2/search/notes"
}`}</code></pre>
              </div>
            </div>
          )
        },
        {
          id: 'gpt-instructions',
          title: 'Instructions personnalisées',
          content: (
            <div className="doc-content">
              <h4>Modèle d'instructions</h4>
              <div className="code-block">
                <pre><code>{`Tu es un assistant IA spécialisé dans l'organisation et l'analyse de connaissances. Tu as accès à Scrivia, un système de gestion de notes et classeurs.

RÔLE :
- Aide à organiser et structurer les informations
- Analyse les contenus existants dans Scrivia
- Génère des résumés et insights
- Crée du contenu basé sur les données disponibles

CAPACITÉS :
- Rechercher dans les notes et classeurs
- Analyser les patterns et tendances
- Générer des résumés automatiques
- Créer de nouveaux contenus structurés

GUIDELINES :
- Toujours vérifier les sources dans Scrivia
- Proposer des améliorations d'organisation
- Maintenir la cohérence avec les contenus existants
- Respecter la structure des classeurs`}</code></pre>
              </div>
              
              <h4>Personnalisation avancée</h4>
              <p>Adaptez les instructions selon vos besoins :</p>
              <ul>
                <li>Spécialisation par domaine (études, travail, etc.)</li>
                <li>Style de communication personnalisé</li>
                <li>Méthodes d'analyse spécifiques</li>
                <li>Formats de sortie préférés</li>
              </ul>
            </div>
          )
        },
        {
          id: 'gpt-examples',
          title: 'Exemples d\'utilisation',
          content: (
            <div className="doc-content">
              <h4>Cas d'usage populaires</h4>
              
              <div className="faq-item">
                <h5>📚 Assistant d'études</h5>
                <p>GPT spécialisé pour organiser les cours, créer des fiches de révision, et générer des quiz basés sur vos notes.</p>
              </div>
              
              <div className="faq-item">
                <h5>💼 Assistant professionnel</h5>
                <p>Gestion de projets, analyse de documents, génération de rapports basés sur vos données Scrivia.</p>
              </div>
              
              <div className="faq-item">
                <h5>🔬 Assistant de recherche</h5>
                <p>Analyse de littérature, synthèse d'articles, organisation de références et génération de bibliographies.</p>
              </div>
              
              <div className="faq-item">
                <h5>✍️ Assistant d'écriture</h5>
                <p>Génération de contenu, correction de textes, suggestions d'amélioration basées sur vos notes existantes.</p>
              </div>
              
              <h4>Conseils d'optimisation</h4>
              <ul>
                <li>Testez régulièrement avec vos données réelles</li>
                <li>Affinez les instructions selon les résultats</li>
                <li>Utilisez des exemples concrets dans les instructions</li>
                <li>Configurez des limites de sécurité appropriées</li>
              </ul>
            </div>
          )
        },
        {
          id: 'gpt-troubleshooting',
          title: 'Dépannage GPT',
          content: (
            <div className="doc-content">
              <h4>Problèmes courants</h4>
              
              <div className="faq-item">
                <h5>Q: Mon GPT ne trouve pas mes notes</h5>
                <p>R: Vérifiez que la clé API est correcte et que les permissions sont bien configurées. Testez la connexion API directement.</p>
              </div>
              
              <div className="faq-item">
                <h5>Q: Les réponses sont trop génériques</h5>
                <p>R: Améliorez les instructions personnalisées avec plus de contexte spécifique à vos besoins et données.</p>
              </div>
              
              <div className="faq-item">
                <h5>Q: L'API retourne des erreurs</h5>
                <p>R: Vérifiez les limites de taux, la validité de la clé API, et consultez les logs d'erreur pour plus de détails.</p>
              </div>
              
              <h4>Support et ressources</h4>
              <ul>
                <li>Documentation API complète</li>
                <li>Exemples de code et configurations</li>
                <li>Communauté d'utilisateurs</li>
                <li>Support technique dédié</li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Dépannage et Support',
      icon: HelpCircle,
      description: 'Résolvez les problèmes courants',
      subsections: [
        {
          id: 'faq',
          title: 'Questions Fréquentes',
          content: (
            <div className="doc-content">
              <h4>Problèmes courants</h4>
              <div className="faq-item">
                <h5>Q: Mes notes ne se sauvegardent pas</h5>
                <p>R: Vérifiez votre connexion internet et essayez de rafraîchir la page. Le problème peut être temporaire.</p>
              </div>
              <div className="faq-item">
                <h5>Q: L'IA ne répond pas correctement</h5>
                <p>R: Essayez de reformuler votre demande ou de fournir plus de contexte. Vérifiez aussi vos crédits IA.</p>
              </div>
              <div className="faq-item">
                <h5>Q: Je ne trouve pas mes notes</h5>
                <p>R: Utilisez la recherche globale ou vérifiez dans la corbeille si elles n'ont pas été supprimées par erreur.</p>
              </div>
            </div>
          )
        },
        {
          id: 'performance',
          title: 'Optimisation des Performances',
          content: (
            <div className="doc-content">
              <h4>Améliorer les performances</h4>
              <p>Conseils pour une expérience optimale :</p>
              <ul>
                <li>Fermez les onglets inutilisés</li>
                <li>Videz le cache du navigateur</li>
                <li>Utilisez un navigateur récent</li>
                <li>Vérifiez votre connexion internet</li>
              </ul>
              
              <h4>Limites et quotas</h4>
              <p>Respectez les limites de votre plan :</p>
              <ul>
                <li>Nombre de notes par classeur</li>
                <li>Espace de stockage</li>
                <li>Requêtes IA par mois</li>
                <li>Collaborateurs par projet</li>
              </ul>
            </div>
          )
        },
        {
          id: 'support',
          title: 'Contact Support',
          content: (
            <div className="doc-content">
              <h4>Obtenir de l'aide</h4>
              <p>Plusieurs moyens de nous contacter :</p>
              <ul>
                <li>Chat en direct (disponible 24/7)</li>
                <li>Email support@scrivia.com</li>
                <li>Documentation complète</li>
                <li>Communauté utilisateurs</li>
              </ul>
              
              <h4>Signaler un bug</h4>
              <p>Pour signaler un problème :</p>
              <ul>
                <li>Décrivez le problème précisément</li>
                <li>Incluez les étapes de reproduction</li>
                <li>Joignez des captures d'écran</li>
                <li>Précisez votre navigateur et OS</li>
              </ul>
            </div>
          )
        }
      ]
    }
  ];

  const filteredSections = documentationSections.filter(section => 
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.subsections.some(sub => 
      sub.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <PageWithSidebarLayout>
      <UnifiedPageTitle
          icon={BookOpen}
          title="Documentation Scrivia"
          subtitle="Guide complet pour maîtriser toutes les fonctionnalités"
          stats={[
            { number: documentationSections.length, label: 'sections' },
            { number: documentationSections.reduce((acc, section) => acc + section.subsections.length, 0), label: 'guides' }
          ]}
        />

        <div className="documentation-container">
          {/* Barre de recherche */}
          <div className="documentation-search">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher dans la documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Sections de documentation */}
          <div className="documentation-sections">
            <AnimatePresence>
              {filteredSections.map((section) => (
                <motion.div
                  key={section.id}
                  className="documentation-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div 
                    className="section-header"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="section-title">
                      <section.icon className="section-icon" />
                      <div>
                        <h3>{section.title}</h3>
                        <p>{section.description}</p>
                      </div>
                    </div>
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="expand-icon" />
                    ) : (
                      <ChevronRight className="expand-icon" />
                    )}
                  </div>

                  <AnimatePresence>
                    {expandedSections.has(section.id) && (
                      <motion.div
                        className="section-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="subsections">
                          {section.subsections.map((subsection) => (
                            <div key={subsection.id} className="subsection">
                              <h4 className="subsection-title">
                                {subsection.isVideo && <Play className="subsection-icon" />}
                                {subsection.isTutorial && <FileText className="subsection-icon" />}
                                {subsection.isGuide && <BookOpen className="subsection-icon" />}
                                {subsection.title}
                              </h4>
                              <div className="subsection-content">
                                {subsection.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
    </PageWithSidebarLayout>
  );
};

export default function DocumentationPageWrapper() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <DocumentationPage />
      </AuthGuard>
    </ErrorBoundary>
  );
}
