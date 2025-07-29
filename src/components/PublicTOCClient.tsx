"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Heading } from "@/types/editor";

const TableOfContents = dynamic(() => import("@/components/TableOfContents"), { ssr: false });

interface PublicTOCClientProps {
  slug: string;
}

const PublicTOCClient: React.FC<PublicTOCClientProps> = ({ slug }) => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTOC = async () => {
      try {
        const res = await fetch(`/api/v1/note/${slug}/table-of-contents`);
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
        console.warn('TOC non chargée:', err);
        setError(err instanceof Error ? err.message : 'Erreur TOC');
        // Ne pas afficher d'erreur à l'utilisateur, juste ne pas montrer la TOC
      }
    };

    fetchTOC();
  }, [slug]);

  if (error || !headings.length) return null;
  
  return <TableOfContents headings={headings} />;
};

export default PublicTOCClient; 