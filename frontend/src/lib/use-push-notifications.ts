'use client';
import { useEffect, useRef } from 'react';

const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SERVICE_WORKER_PATH = '/service-worker.js';
const SERVICE_WORKER_SCOPE = '/';

/**
 * Converts a VAPID base64 public key string to a Uint8Array
 * required by the PushManager.subscribe() API.
 */
function convertVapidKeyToUint8Array(vapidBase64Key: string): Uint8Array {
  const paddingNeeded = '='.repeat((4 - (vapidBase64Key.length % 4)) % 4);
  const base64WithPadding = (vapidBase64Key + paddingNeeded)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawBinaryString = window.atob(base64WithPadding);
  return Uint8Array.from([...rawBinaryString].map(char => char.charCodeAt(0)));
}

/**
 * Fetches the VAPID public key from the backend.
 * Needed to create a push subscription tied to this server.
 */
async function fetchVapidPublicKey(): Promise<string> {
  const response = await fetch(`${BACKEND_API_BASE_URL}/api/push/vapid-public-key`);
  const { publicKey } = await response.json();
  return publicKey;
}

/**
 * Sends a PushSubscription object to the backend so the server
 * can deliver Web Push notifications to this browser session.
 */
async function registerSubscriptionWithBackend(
  pushSubscription: PushSubscription,
  authToken: string
): Promise<void> {
  await fetch(`${BACKEND_API_BASE_URL}/api/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ subscription: pushSubscription.toJSON() }),
  });
}

/**
 * Creates or retrieves an existing push subscription for the current browser,
 * then registers it with the backend so the server can send push notifications.
 */
async function createOrRefreshPushSubscription(
  serviceWorkerRegistration: ServiceWorkerRegistration,
  authToken: string
): Promise<void> {
  const vapidPublicKey = await fetchVapidPublicKey();
  const applicationServerKey = convertVapidKeyToUint8Array(vapidPublicKey);

  const existingSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
  if (existingSubscription) {
    await registerSubscriptionWithBackend(existingSubscription, authToken);
    return;
  }

  const newSubscription = await serviceWorkerRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
  await registerSubscriptionWithBackend(newSubscription, authToken);
}

/**
 * React hook that registers the service worker and subscribes the current user
 * to Web Push notifications. Safe to call on every render — runs only once per session.
 */
export function usePushNotifications(authToken: string | null): void {
  const hasAlreadySubscribedRef = useRef(false);

  useEffect(() => {
    if (!authToken || hasAlreadySubscribedRef.current) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function initializePushNotifications() {
      try {
        const permissionStatus = await Notification.requestPermission();
        if (permissionStatus !== 'granted') return;

        const serviceWorkerRegistration = await navigator.serviceWorker.register(
          SERVICE_WORKER_PATH,
          { scope: SERVICE_WORKER_SCOPE }
        );
        await navigator.serviceWorker.ready;

        await createOrRefreshPushSubscription(serviceWorkerRegistration, authToken!);
        hasAlreadySubscribedRef.current = true;
      } catch {
        // Push notifications are non-critical — silently fail
      }
    }

    initializePushNotifications();
  }, [authToken]);
}
