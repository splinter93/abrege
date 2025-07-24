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
  useEffect(() => {
    fetch(`/api/v1/note/${slug}/table-of-contents`)
      .then(res => res.json())
      .then(data => {
        if (data.toc) {
          setHeadings(
            data.toc.map((item: any) => ({
              id: item.slug,
              text: item.title,
              level: item.level
            }))
          );
        }
      });
  }, [slug]);
  if (!headings.length) return null;
  return <TableOfContents headings={headings} />;
};

export default PublicTOCClient; 