class Api {
  public auth: AuthApi;

  constructor() {
    this.auth = new AuthApi();
  }
}

class AuthApi {
  public async username(): Promise<string | null> {
    const res = await fetch('/api/auth/username', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      throw new Error('Failed to get username');
    }
    return await res.json() as string | null;
  }

  public async start(username: string): Promise<{ kind: 'registration', credentialCreationOptions: CredentialCreationOptions } | { kind: 'auhentication', credentialRequestOptions: CredentialRequestOptions }> {
    const res = await fetch('/api/auth/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
    if (!res.ok) {
      throw new Error('Failed to start authentication');
    }
    return await res.json() as { kind: 'registration', credentialCreationOptions: CredentialCreationOptions } | { kind: 'auhentication', credentialRequestOptions: CredentialRequestOptions };
  }

  public async register(username: string, credential: Credential): Promise<void> {
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, credential }) });
    if (!res.ok) {
      throw new Error('Failed to finish registration');
    }
  }

  public async login(username: string, credential: Credential): Promise<void> {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, credential }) });
    if (!res.ok) {
      throw new Error('Failed to finish authentication');
    }
  }
}

export default new Api();
