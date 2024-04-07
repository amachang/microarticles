import { UnreachableCaseError } from 'ts-essentials';

class Api {
  public auth: AuthApi;

  constructor() {
    this.auth = new AuthApi();
  }
}

interface CredentialCreationOptionsLike {
  publicKey: PublicKeyCredentialCreationOptionsLike;
}

interface PublicKeyCredentialCreationOptionsLike {
  rp: PublicKeyCredentialRpEntity;
  user: PublicKeyCredentialUserEntityLike;
  challenge: string;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  excludeCredentials?: PublicKeyCredentialDescriptor[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  extensions?: any;
}

interface PublicKeyCredentialUserEntityLike {
  id: string;
  name: string;
  displayName: string;
}

interface CredentialRequestOptionsLike {
  publicKey: PublicKeyCredentialRequestOptionsLike;
}

interface PublicKeyCredentialRequestOptionsLike {
  rpId?: string;
  challenge: string;
  allowCredentials: PublicKeyCredentialDescriptor[];
  userVerification?: UserVerificationRequirement;
  extensions?: any;
}

class AuthApi {
  public async username(): Promise<string | null> {
    const res = await fetch('/api/auth/username', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      throw new Error('Failed to get username');
    }
    return await res.json() as string | null;
  }

  public async start(username: string): Promise<{ kind: 'registration', credentialOptions: CredentialCreationOptions } | { kind: 'authentication', credentialOptions: CredentialRequestOptions }> {
    const res = await fetch('/api/auth/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
    if (!res.ok) {
      throw new Error('Failed to start authentication');
    }
    const opts = await res.json() as { kind: 'registration', credentialOptions: CredentialCreationOptionsLike } | { kind: 'authentication', credentialOptions: CredentialRequestOptionsLike };
    switch (opts.kind) {
      case 'registration':
        return { kind: opts.kind, credentialOptions: this.parseCredentialCreationOptions(opts.credentialOptions) };
      case 'authentication':
        return { kind: opts.kind, credentialOptions: this.parseCredentialRequestOptions(opts.credentialOptions) };
      default:
        throw new UnreachableCaseError(opts);
    }
  }

  public async register(credential: Credential): Promise<void> {
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: this.stringifyRegistrationCredential(credential) });
    if (!res.ok) {
      throw new Error('Failed to finish registration');
    }
  }

  public async login(credential: Credential): Promise<void> {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: this.stringifyAuthenticationCredential(credential) });
    if (!res.ok) {
      throw new Error('Failed to finish authentication');
    }
  }

  stringifyRegistrationCredential(credential: Credential): string {
    if (!(credential instanceof PublicKeyCredential)) {
      throw new Error('Unsupported credential type');
    }
    if (!(credential.response instanceof AuthenticatorAttestationResponse)) {
      throw new Error('Unsupported authenticator response type');
    }
    return JSON.stringify({
      type: credential.type,
      id: credential.id,
      rawId: this.stringifyUrlSafeBase64(credential.rawId),
      response: {
        clientDataJSON: this.stringifyUrlSafeBase64(credential.response.clientDataJSON),
        attestationObject: this.stringifyUrlSafeBase64(credential.response.attestationObject),
      },
    });
  }

  stringifyAuthenticationCredential(credential: Credential): string {
    if (!(credential instanceof PublicKeyCredential)) {
      throw new Error('Unsupported credential type');
    }
    if (!(credential.response instanceof AuthenticatorAssertionResponse)) {
      throw new Error('Unsupported authenticator response type');
    }
    return JSON.stringify({
      type: credential.type,
      id: credential.id,
      rawId: this.stringifyUrlSafeBase64(credential.rawId),
      response: {
        clientDataJSON: this.stringifyUrlSafeBase64(credential.response.clientDataJSON),
        authenticatorData: this.stringifyUrlSafeBase64(credential.response.authenticatorData),
        signature: this.stringifyUrlSafeBase64(credential.response.signature),
        userHandle: credential.response.userHandle ? this.stringifyUrlSafeBase64(credential.response.userHandle) : null,
      },
    });
  }

  parseCredentialCreationOptions(opts: CredentialCreationOptionsLike): CredentialCreationOptions {
    return {
      publicKey: {
        rp: opts.publicKey.rp,
        user: {
          id: this.parseUrlSafeBase64(opts.publicKey.user.id),
          name: opts.publicKey.user.name,
          displayName: opts.publicKey.user.displayName,
        },
        challenge: this.parseUrlSafeBase64(opts.publicKey.challenge),
        pubKeyCredParams: opts.publicKey.pubKeyCredParams,
        timeout: opts.publicKey.timeout,
        excludeCredentials: opts.publicKey.excludeCredentials,
        authenticatorSelection: opts.publicKey.authenticatorSelection,
        attestation: opts.publicKey.attestation,
        extensions: opts.publicKey.extensions,
      },
    };
  }

  parseCredentialRequestOptions(opts: CredentialRequestOptionsLike): CredentialRequestOptions {
    return {
      publicKey: {
        rpId: opts.publicKey.rpId,
        challenge: this.parseUrlSafeBase64(opts.publicKey.challenge),
        allowCredentials: opts.publicKey.allowCredentials,
        userVerification: opts.publicKey.userVerification,
        extensions: opts.publicKey.extensions,
      },
    };
  }

  parseUrlSafeBase64(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  }

  stringifyUrlSafeBase64(ab: ArrayBuffer): string {
    const bytes = new Uint8Array(ab);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_');
  }
}

export default new Api();
