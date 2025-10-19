/**
 * Layout pour la section AI (Agents & Prompts)
 * @module app/ai/layout
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './ai-layout.css';

export default function AILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { id: 'agents', label: 'Agents', href: '/ai/agents' },
    { id: 'prompts', label: 'Prompts', href: '/ai/prompts' }
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <div className="ai-page">
      <div className="ai-container">
        <header className="ai-page-header">
          <h1 className="ai-page-title">Intelligence Artificielle</h1>
          <p className="ai-page-subtitle">
            Gérez vos agents spécialisés et vos prompts d'éditeur
          </p>
        </header>

        <nav className="ai-tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`ai-tab ${isActive(tab.href) ? 'active' : ''}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="ai-content">
          {children}
        </div>
      </div>
    </div>
  );
}


