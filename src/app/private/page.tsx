"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import PrivateSidebar from '@/components/PrivateSidebar';
import LogoScrivia from '@/components/LogoScrivia';
import { Book, FileText, MessageSquare, Star, TrendingUp, Calendar } from 'lucide-react';
import './home.css';

export default function PrivateHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    classeurs: 0,
    notes: 0,
    favorites: 0,
    recentActivity: [] as Array<{ type: string; title: string; time: string }>
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Simuler des stats (à remplacer par de vraies données)
    setStats({
      classeurs: 3,
      notes: 24,
      favorites: 8,
      recentActivity: [
        { type: 'note', title: 'Notes de réunion', time: 'Il y a 2h' },
        { type: 'classeur', title: 'Projet Marketing', time: 'Hier' },
        { type: 'note', title: 'Idées créatives', time: 'Il y a 3 jours' }
      ]
    });
  }, []);

  if (loading) {
    return (
      <div className="home-loading">
        <div className="loading-spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="home-page-wrapper">
      <PrivateSidebar />
      
      <main className="home-content">
        <header className="home-header">
          <div className="home-welcome">
            <h1>Bonjour, {user.email?.split('@')[0] || 'Utilisateur'} !</h1>
            <p>Bienvenue dans votre espace personnel Scrivia.</p>
          </div>
        </header>

        <div className="home-dashboard">
          {/* Stats */}
          <section className="home-stats">
            <div className="stat-card">
              <div className="stat-icon"><Book size={20} /></div>
              <div className="stat-content">
                <h3>{stats.classeurs}</h3>
                <p>Classeurs</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><FileText size={20} /></div>
              <div className="stat-content">
                <h3>{stats.notes}</h3>
                <p>Notes</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><Star size={20} /></div>
              <div className="stat-content">
                <h3>{stats.favorites}</h3>
                <p>Favoris</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><Calendar size={20} /></div>
              <div className="stat-content">
                <h3>12</h3>
                <p>Cette semaine</p>
              </div>
            </div>
          </section>

          <div className="home-main-grid">
            {/* Quick Actions */}
            <section className="home-actions">
              <h2>Actions rapides</h2>
              <div className="action-grid">
                <button className="action-btn primary">
                  <Book size={18} />
                  <span>Nouveau classeur</span>
                </button>
                <button className="action-btn">
                  <FileText size={18} />
                  <span>Nouvelle note</span>
                </button>
                <button className="action-btn">
                  <MessageSquare size={18} />
                  <span>Ouvrir le chat</span>
                </button>
              </div>
            </section>

            {/* Recent Activity */}
            <section className="home-activity">
              <h2>Activité récente</h2>
              <div className="activity-list">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-item-main">
                      <div className="activity-icon">
                        {activity.type === 'note' ? <FileText size={16} /> : <Book size={16} />}
                      </div>
                      <span className="activity-title">{activity.title}</span>
                    </div>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
} 