export class AgentAccessDeniedError extends Error {
  constructor(message = 'Accès refusé à cet agent') {
    super(message);
    this.name = 'AgentAccessDeniedError';
  }
}
