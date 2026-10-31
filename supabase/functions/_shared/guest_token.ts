import crypto from 'node:crypto';

export interface GuestTokenPayload {
  challengeId: string;
  caseId: string;
  guestId: string;
  exp: number; // Unix seconds
  iat: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export function signGuestToken(
  params: { challengeId: string; caseId: string; guestId: string },
  secret: string,
  expiresInDays = 7,
): { token: string; expiresAt: string } {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + expiresInDays * 24 * 3600;

  const payload: GuestTokenPayload = {
    challengeId: params.challengeId,
    caseId: params.caseId,
    guestId: params.guestId,
    iat: nowSec,
    exp: expSec,
  };

  const payloadStr = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadStr);

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(encodedPayload);
  const signature = base64UrlEncode(hmac.digest('base64'));

  const token = `${encodedPayload}.${signature}`;
  const expiresAt = new Date(expSec * 1000).toISOString();

  return { token, expiresAt };
}

export function verifyGuestToken(
  token: string,
  secret: string,
): { valid: boolean; payload?: GuestTokenPayload; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid token structure' };
    }

    const [encodedPayload, receivedSig] = parts as [string, string];

    // Recompute signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(encodedPayload);
    const expectedSig = base64UrlEncode(hmac.digest('base64'));

    if (receivedSig !== expectedSig) {
      return { valid: false, error: 'Invalid signature' };
    }

    const payloadStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadStr) as GuestTokenPayload;

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSec) {
      return { valid: false, payload, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}
