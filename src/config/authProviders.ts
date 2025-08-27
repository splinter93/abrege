export type AuthProvider = 'google' | 'apple' | 'github';

export interface AuthProviderConfig {
  provider: AuthProvider;
  label: string;
}

export const authProviders: AuthProviderConfig[] = [
  { provider: 'google', label: 'Google' },
  { provider: 'apple', label: 'Apple' },
  { provider: 'github', label: 'GitHub' },
];
