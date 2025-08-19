"use client";

import { FileItem } from "@/types/files";

interface FileUploaderWrapperProps {
  onUploadComplete: (file: FileItem) => void;
  onUploadError: (error: string) => void;
  maxFileSize?: number;
  allowedTypes?: string[];
  multiple?: boolean;
}

/**
 * Wrapper pour le composant FileUploader
 * Utilisé pour éviter les problèmes de résolution de modules sur Vercel
 */
export default function FileUploaderWrapper(props: FileUploaderWrapperProps) {
  // Import dynamique pour éviter les problèmes de build
  const FileUploader = require("../../../components/FileUploader").default;
  
  return <FileUploader {...props} />;
} 