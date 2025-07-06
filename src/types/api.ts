// Types utilitaires pour les payloads API (création/mise à jour)
import type { Classeur, Folder, Article } from './supabase';

export type CreateClasseurPayload = Omit<Classeur, 'id' | 'created_at' | 'position' | 'user_id'> & {
  user_id?: string;
};
export type UpdateClasseurPayload = Partial<Omit<Classeur, 'id' | 'created_at' | 'user_id'>>;

export type CreateFolderPayload = Omit<Folder, 'id' | 'created_at' | 'position' | 'user_id'> & {
  user_id?: string;
};
export type UpdateFolderPayload = Partial<Omit<Folder, 'id' | 'created_at' | 'user_id'>>;

export type CreateArticlePayload = Omit<Article, 'id' | 'created_at' | 'updated_at' | 'user_id'> & {
  user_id?: string;
};
export type UpdateArticlePayload = Partial<Omit<Article, 'id' | 'created_at' | 'updated_at' | 'user_id'>>; 