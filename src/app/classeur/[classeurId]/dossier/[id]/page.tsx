'use client';
import FolderManagerDossier from '@/components/FolderManagerDossier';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getFolderById } from '@/services/supabase';

export default function DossierPage() {
  const params = useParams();
  const classeurId = params.classeurId as string;
  const id = params.id as string;
  const [dossierName, setDossierName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFolderById(id).then(folder => {
      setDossierName(folder?.name || 'Dossier');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: 80 }}>Chargement…</div>;
  }

  return (
    <FolderManagerDossier
      classeurId={classeurId}
      dossierId={id}
      dossierName={dossierName}
    />
  );
} 