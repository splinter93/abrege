'use client';

import React from 'react';

export default function DossierPage({ params }: { params: { classeurId: string; id: string } }) {
  return (
    <div>
      <h1>Dossier {params.id} dans Classeur {params.classeurId}</h1>
      <p>Page de dossier en cours de développement...</p>
    </div>
  );
} 