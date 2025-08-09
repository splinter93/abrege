'use client';

import React from 'react';

export default function SummaryPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Résumé {params.id}</h1>
      <p>Page de résumé en cours de développement...</p>
    </div>
  );
} 