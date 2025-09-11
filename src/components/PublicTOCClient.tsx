"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Heading } from "@/types/editor";
import { simpleLogger as logger } from '@/utils/logger';

const TableOfContents = dynamic(() => import("@/components/TableOfContents"), { ssr: false });

interface PublicTOCClientProps {
  slug: string;
  username: string;
}

const PublicTOCClient: React.FC<PublicTOCClientProps> = ({ slug, username }) => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTOC = async () => {
      try {
        const res = await fetch(`/api/ui/public/note/${encodeURIComponent(username)}/${slug}/table-of-contents`, {
          credentials: 'include', // Inclure les cookies d'authentification
          headers: {
            'Content-Type': 'application/json',
          }
        });
        if (!res.ok) {
          throw new Error(`TOC non disponible (${res.status})`);
        }
        
        const data = await res.json();
        if (data.toc) {
          setHeadings(
            data.toc.map((item: { slug: string; title: string; level: number }) => ({
              id: item.slug,
              text: item.title,
              level: item.level
            }))
          );
        }
      } catch (err) {
        logger.warn('TOC non chargée:', err);
        setError(err instanceof Error ? err.message : 'Erreur TOC');
        // Ne pas afficher d'erreur à l'utilisateur, juste ne pas montrer la TOC
      }
    };

    fetchTOC();
  }, [slug, username]);

  if (error || !headings.length) return null;
  
  return <TableOfContents headings={headings} />;
};

export default PublicTOCClient; 