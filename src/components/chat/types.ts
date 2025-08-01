export interface Message {
  id?: number;
  role: 'assistant' | 'user';
  content: string;
  timestamp?: number;
}
