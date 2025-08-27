export interface OAuthClient {
  id: string;
  name: string;
  secret: string;
  redirectUris: string[];
  scopes: string[];
  description?: string;
}

export const oauthClients: OAuthClient[] = [
  {
    id: 'scrivia-custom-gpt',
    name: 'Scrivia ChatGPT Action',
    secret: 'scrivia-gpt-secret-2024',
    redirectUris: [
      'https://chat.openai.com/auth/callback',
      'https://scrivia.app/auth/callback',
    ],
    scopes: [
      'notes:read',
      'notes:write', 
      'dossiers:read',
      'dossiers:write',
      'classeurs:read',
      'classeurs:write'
    ],
    description: 'Action personnalisée ChatGPT pour interagir avec l\'API Scrivia'
  },
  // Ajoutez d'autres clients OAuth ici
];

/**
 * Vérifie si un client_id est valide
 */
export function isValidClientId(clientId: string): boolean {
  return oauthClients.some(client => client.id === clientId);
}

/**
 * Récupère un client OAuth par son ID
 */
export function getOAuthClient(clientId: string): OAuthClient | undefined {
  return oauthClients.find(client => client.id === clientId);
}

/**
 * Vérifie si un redirect_uri est autorisé pour un client
 */
export function isValidRedirectUri(clientId: string, redirectUri: string): boolean {
  const client = getOAuthClient(clientId);
  if (!client) return false;
  
  return client.redirectUris.some(uri => redirectUri.startsWith(uri));
}

/**
 * Vérifie si un scope est autorisé pour un client
 */
export function isValidScope(clientId: string, scope: string): boolean {
  const client = getOAuthClient(clientId);
  if (!client) return false;
  
  const requestedScopes = scope.split(' ').filter(s => s.trim());
  return requestedScopes.every(s => client.scopes.includes(s));
}
