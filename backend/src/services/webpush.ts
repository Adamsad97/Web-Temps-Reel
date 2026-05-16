import https from 'https';
import http from 'http';
import crypto from 'crypto';

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT     || 'mailto:admin@avenir.fr';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  process.stdout.write('[webpush] ⚠  VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquants dans .env\n');
}

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const subscriptionsByUserId = new Map<string, PushSubscription[]>();

export function saveSubscription(userId: string, subscription: PushSubscription): void {
  const existing = subscriptionsByUserId.get(userId) || [];
  const alreadyExists = existing.some(s => s.endpoint === subscription.endpoint);
  if (!alreadyExists) {
    subscriptionsByUserId.set(userId, [...existing, subscription]);
  }
}

export function removeSubscription(userId: string, endpoint: string): void {
  const existing = subscriptionsByUserId.get(userId) || [];
  subscriptionsByUserId.set(userId, existing.filter(s => s.endpoint !== endpoint));
}

export function getSubscriptionsForUser(userId: string): PushSubscription[] {
  return subscriptionsByUserId.get(userId) || [];
}

function urlBase64ToBuffer(base64String: string): Buffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

function buildVapidAuthorizationHeader(audience: string): string {
  const vapidPublicKeyBuffer = urlBase64ToBuffer(VAPID_PUBLIC_KEY);
  const vapidPrivateKeyBuffer = urlBase64ToBuffer(VAPID_PRIVATE_KEY);

  const expirationTimestamp = Math.floor(Date.now() / 1000) + 12 * 3600;

  const headerJson = JSON.stringify({ typ: 'JWT', alg: 'ES256' });
  const payloadJson = JSON.stringify({ aud: audience, exp: expirationTimestamp, sub: VAPID_SUBJECT });

  const headerEncoded  = Buffer.from(headerJson).toString('base64url');
  const payloadEncoded = Buffer.from(payloadJson).toString('base64url');
  const signingInput   = `${headerEncoded}.${payloadEncoded}`;

  const privateKey = crypto.createPrivateKey({
    key: Buffer.concat([
      Buffer.from('308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b0201010420', 'hex'),
      vapidPrivateKeyBuffer,
      Buffer.from('a144034200', 'hex'),
      vapidPublicKeyBuffer,
    ]),
    format: 'der',
    type: 'pkcs8',
  });

  const signature = crypto.sign('SHA256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' });

  const token = `${signingInput}.${signature.toString('base64url')}`;
  return `vapid t=${token},k=${VAPID_PUBLIC_KEY}`;
}

export async function sendWebPushNotification(subscription: PushSubscription, title: string, body: string, tag?: string): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  const payload = JSON.stringify({ title, body, tag: tag || 'avenir-notif', icon: '/favicon.ico', badge: '/favicon.ico' });

  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

  const authorizationHeader = buildVapidAuthorizationHeader(audience);

  const encryptedPayload = await encryptPayload(payload, subscription.keys.p256dh, subscription.keys.auth);

  await new Promise<void>((resolve, reject) => {
    const requestOptions: https.RequestOptions = {
      method: 'POST',
      hostname: endpointUrl.hostname,
      port: endpointUrl.port || (endpointUrl.protocol === 'https:' ? 443 : 80),
      path: endpointUrl.pathname + endpointUrl.search,
      headers: {
        'Authorization': authorizationHeader,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': encryptedPayload.length,
        'TTL': '86400',
      },
    };

    const requester = endpointUrl.protocol === 'https:' ? https : http;
    const req = requester.request(requestOptions, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`Push failed: ${res.statusCode}`));
      } else {
        resolve();
      }
      res.resume();
    });

    req.on('error', reject);
    req.write(encryptedPayload);
    req.end();
  });
}

async function encryptPayload(payload: string, p256dhBase64: string, authBase64: string): Promise<Buffer> {
  const serverKeyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const serverPublicKeyDer  = serverKeyPair.publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  const serverPublicKeyBytes = serverPublicKeyDer.slice(serverPublicKeyDer.length - 65);

  const clientPublicKeyBytes = urlBase64ToBuffer(p256dhBase64);
  const authBytes            = urlBase64ToBuffer(authBase64);

  const clientPublicKey = crypto.createPublicKey({
    key: Buffer.concat([Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex'), clientPublicKeyBytes]),
    format: 'der',
    type: 'spki',
  });

  const sharedSecret = crypto.diffieHellman({ privateKey: serverKeyPair.privateKey, publicKey: clientPublicKey });

  const salt = crypto.randomBytes(16);

  const prk = await hkdf(authBytes, sharedSecret, Buffer.concat([Buffer.from('WebPush: info\0'), clientPublicKeyBytes, serverPublicKeyBytes]), 32);
  const contentEncryptionKey = await hkdf(salt, prk, buildInfo('aesgcm128'), 16);
  const nonce = await hkdf(salt, prk, buildInfo('nonce'), 12);

  const cipher = crypto.createCipheriv('aes-128-gcm', contentEncryptionKey, nonce);
  const paddedPlaintext = Buffer.concat([Buffer.alloc(2), Buffer.from(payload)]);
  const encrypted = Buffer.concat([cipher.update(paddedPlaintext), cipher.final(), cipher.getAuthTag()]);

  const recordSize = encrypted.length + 16;
  const header = Buffer.concat([
    salt,
    Buffer.from([0, 0, (recordSize >> 8) & 0xff, recordSize & 0xff]),
    Buffer.from([serverPublicKeyBytes.length]),
    serverPublicKeyBytes,
  ]);

  return Buffer.concat([header, encrypted]);
}

function buildInfo(type: string): Buffer {
  return Buffer.from(`Content-Encoding: ${type}\0`);
}

async function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Promise<Buffer> {
  const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
  const hmac = crypto.createHmac('sha256', prk);
  hmac.update(info);
  hmac.update(Buffer.from([1]));
  return hmac.digest().slice(0, length);
}

export async function sendWebPushToUser(userId: string, title: string, body: string, tag?: string): Promise<void> {
  const subscriptions = getSubscriptionsForUser(userId);
  const sendResults = subscriptions.map(sub =>
    sendWebPushNotification(sub, title, body, tag).catch(() => {
      removeSubscription(userId, sub.endpoint);
    })
  );
  await Promise.allSettled(sendResults);
}
