'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  FileText, 
  Lock, 
  Code, 
  MessageSquare, 
  Zap, 
  ArrowRight,
  Check,
  Brain,
  Edit3,
  Shield
} from 'lucide-react';
import LogoScrivia from '@/components/LogoScrivia';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-container">
          <LogoScrivia width={140} />
          <div className="landing-nav-actions">
            <Link href="/auth" className="landing-nav-link">
              Se connecter
            </Link>
            <Link href="/auth" className="landing-nav-cta">
              Commencer gratuitement
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <motion.div
          className="landing-hero-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            className="landing-hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Votre bibliothèque intelligente
          </motion.h1>
          <motion.p
            className="landing-hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Scrivia n'est pas juste une app de notes. C'est une bibliothèque intelligente qui
            édite, organise et comprend votre contenu avec vous grâce à l'IA.
          </motion.p>

          <motion.div
            className="landing-hero-badges"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <span className="landing-badge">
              <Sparkles size={16} />
              IA-native
            </span>
            <span className="landing-badge">
              <Shield size={16} />
              Privacy-first
            </span>
            <span className="landing-badge">
              <FileText size={16} />
              Markdown
            </span>
          </motion.div>

          <motion.div
            className="landing-hero-cta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link href="/auth" className="landing-cta-primary">
              Commencer gratuitement
              <ArrowRight size={20} />
            </Link>
            <Link href="#features" className="landing-cta-secondary">
              Découvrir les fonctionnalités
            </Link>
          </motion.div>

          <motion.p
            className="landing-hero-note"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            Pas de carte bancaire • Setup en 2 minutes
          </motion.p>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-features">
        <div className="landing-features-container">
          <motion.h2
            className="landing-section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Pourquoi Scrivia est unique
          </motion.h2>
          <motion.p
            className="landing-section-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Des fonctionnalités puissantes conçues pour les utilisateurs exigeants
          </motion.p>

          <div className="landing-features-grid">
            <motion.div
              className="landing-feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="landing-feature-icon">
                <Brain size={32} />
              </div>
              <h3 className="landing-feature-title">Agents IA Spécialisés</h3>
              <p className="landing-feature-description">
                Créez des agents personnalisés avec configuration LLM complète. 
                Orchestrez plusieurs agents pour des tâches complexes. 
                Votre bibliothèque qui pense avec vous.
              </p>
            </motion.div>

            <motion.div
              className="landing-feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="landing-feature-icon">
                <Edit3 size={32} />
              </div>
              <h3 className="landing-feature-title">Édition Chirurgicale</h3>
              <p className="landing-feature-description">
                Opérations granulaires sur votre contenu avec ciblage précis. 
                Insert, replace, delete avec dry-run et idempotence. 
                Édition impossible sur d'autres plateformes.
              </p>
            </motion.div>

            <motion.div
              className="landing-feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="landing-feature-icon">
                <FileText size={32} />
              </div>
              <h3 className="landing-feature-title">Markdown Natif</h3>
              <p className="landing-feature-description">
                Markdown comme source de vérité, pas de format propriétaire. 
                Édition WYSIWYG fluide. Export/import sans perte. 
                Vos données restent les vôtres.
              </p>
            </motion.div>

            <motion.div
              className="landing-feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="landing-feature-icon">
                <Shield size={32} />
              </div>
              <h3 className="landing-feature-title">Privacy-First</h3>
              <p className="landing-feature-description">
                Contrôle granulaire de la visibilité avec 5 niveaux de partage. 
                Expiration de liens. Protection des données par défaut. 
                Vos données, votre contrôle.
              </p>
            </motion.div>

            <motion.div
              className="landing-feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="landing-feature-icon">
                <Code size={32} />
              </div>
              <h3 className="landing-feature-title">API LLM-Friendly</h3>
              <p className="landing-feature-description">
                30+ endpoints REST avec support MCP natif. 
                Intégration avec ChatGPT, Claude, Cursor. 
                Tools OpenAPI configurables. Votre bibliothèque accessible partout.
              </p>
            </motion.div>

            <motion.div
              className="landing-feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="landing-feature-icon">
                <Zap size={32} />
              </div>
              <h3 className="landing-feature-title">Expérience Avancée</h3>
              <p className="landing-feature-description">
                Slash commands, mentions @, Whisper Turbo pour la voix. 
                Modales de visualisation, PWA mobile. 
                Interface moderne et fluide pensée pour vous.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="landing-value">
        <div className="landing-value-container">
          <motion.div
            className="landing-value-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="landing-value-content">
              <h2 className="landing-value-title">
                Notion stocke. <span className="landing-value-highlight">Scrivia comprend.</span>
              </h2>
              <p className="landing-value-text">
                Notion organise. <span className="landing-value-highlight">Scrivia s'organise.</span>
              </p>
              <p className="landing-value-text">
                Notion édite. <span className="landing-value-highlight">Scrivia co-édite.</span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="landing-cta-final">
        <div className="landing-cta-final-container">
          <motion.div
            className="landing-cta-final-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="landing-cta-final-content">
              <h2 className="landing-cta-final-title">
                Prêt à transformer votre façon de travailler ?
              </h2>
              <p className="landing-cta-final-subtitle">
                Rejoignez Scrivia et découvrez une nouvelle façon de gérer vos connaissances
              </p>
              <Link href="/auth" className="landing-cta-primary landing-cta-final-button">
                Commencer gratuitement
                <ArrowRight size={20} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <LogoScrivia width={120} />
          <p className="landing-footer-text">
            © 2025 Scrivia. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
