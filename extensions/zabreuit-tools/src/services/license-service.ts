import { verifyLicenseToken, DEFAULT_ED25519_PUBLIC_KEY_PEM } from '../vendor/core.js';

export interface LicenseCheckResult {
  isValid: boolean;
  isPro: boolean;
  expiryDate?: number;
  error?: string;
}

export class RaycastLicenseService {
  private publicKeyPem: string;

  constructor(customPublicKey?: string) {
    this.publicKeyPem =
      customPublicKey ||
      process.env.ZABREUIT_LICENSE_PUBLIC_KEY ||
      DEFAULT_ED25519_PUBLIC_KEY_PEM;
  }

  async validateLicense(keyOrToken?: string): Promise<LicenseCheckResult> {
    const trimmed = (keyOrToken || '').trim();
    if (!trimmed) {
      return { isValid: false, isPro: false, error: 'No license key configured' };
    }

    if (trimmed.includes('.')) {
      try {
        const res = await verifyLicenseToken(trimmed, this.publicKeyPem);
        if (res.valid && res.payload) {
          const isPro = res.payload.tier === 'PRO' || res.payload.tier === 'ENTERPRISE';
          return {
            isValid: true,
            isPro,
            expiryDate: res.payload.exp,
          };
        }
        return {
          isValid: false,
          isPro: false,
          error: res.error || 'Invalid signature or expired token',
        };
      } catch (err: unknown) {
        return {
          isValid: false,
          isPro: false,
          error: err instanceof Error ? err.message : 'Validation error',
        };
      }
    }

    // Direct key without signature (mock or online activation)
    return {
      isValid: false,
      isPro: false,
      error: 'Signed license token required for offline activation',
    };
  }
}
