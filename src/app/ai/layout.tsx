/**
 * Layout simple pour la section AI (sans tabs)
 * @module app/ai/layout
 */

'use client';

import React from 'react';

export default function AILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout vide - chaque page gère sa propre structure
  return <>{children}</>;
}


