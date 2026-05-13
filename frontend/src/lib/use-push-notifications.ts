'use client';
import { useEffect, useRef } from 'react';

const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SERVICE_WORKER_PATH  = '/service-worker.js';
const SERVICE_WORKER_SCOPE = '/';

/**
 * Converts a VAPID base64url public key to a Uint8Array<ArrayBuffer>
 * as required by PushManager.subscribe() — uses new Uint8Array() to
 * guarantee a strict ArrayBuffer (not ArrayBufferLike) backing store.
 */
function convertVapidKeyToUint8Array(vapidBase64Key: string): Uint8Array<ArrayBuffer> {
  const padding      = '='.repeat((4 - (vapidBase64Key.length % 4)) % 4);
  const base64       = (vapidBase64Key + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binaryString = window.atob(base64);
  const bytes        = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function fetchVapidPublicKey(): Promise<string> {
  const response = await fetch(`${BACKEND_API_BASE_URL}/api/push/vapid-public-key`);
  const { publicKey } = await response.json() as { publicKey: string };
  return publicKey;
}

async function registerSubscriptionWithBackend(
  subscription: PushSubscription,
  authToken: string
): Promise<void> {
  await fetch(`${BACKEND_API_BASE_URL}/api/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
}

async function createOrRefreshPushSubscription(
  registration: ServiceWorkerRegistration,
  authToken: string
): Promise<void> {
  const vapidPublicKey      = await fetchVapidPublicKey();
  const applicationServerKey = convertVapidKeyToUint8Array(vapidPublicKey);

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await registerSubscriptionWithBackend(existing, authToken);
    return;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
  await registerSubscriptionWithBackend(subscription, authToken);
}

export function usePushNotifications(authToken: string | null): void {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!authToken || subscribedRef.current) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function init() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.register(
          SERVICE_WORKER_PATH,
          { scope: SERVICE_WORKER_SCOPE }
        );
        await navigator.serviceWorker.ready;

        await createOrRefreshPushSubscription(registration, authToken!);
        subscribedRef.current = true;
      } catch {
        // Push notifications are non-critical — silently fail
      }
    }

    init();
  }, [authToken]);
}
