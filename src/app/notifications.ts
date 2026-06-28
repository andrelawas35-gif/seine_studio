// ─── Push notification helpers ──────────────────────────────────────────

// VAPID keypair regenerated 2026-06-27 (raw P-256 uncompressed point, 65 bytes).
// Private key stored as Cloudflare secret VAPID_PRIVATE_KEY.
const VAPID_PUBLIC_KEY = "BP6khjP7gw9MpD8NJ3z3JKj2iekWZSZnLg5woUTugnJ-D9oNshJLWD6TQwkLvf7IpT3aLKPV7mt_ebG8rIhRdfI";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.requestPermission();
}

export async function subscribeToPush(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported on this device. iOS requires the PWA to be installed to your Home Screen.");
  }

  const registration = await navigator.serviceWorker.ready;
  if (!registration) {
    throw new Error("Service worker is not ready yet. Please refresh the page and try again.");
  }

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    return subscription;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown push error";
    if (msg.includes("permission")) {
      throw new Error("Notification permission was denied. Go to Settings → Safari → Notifications to allow.");
    }
    // Surface the browser's actual error (e.g. invalid server key format) instead of
    // a generic "Push subscription failed" prefix that hides the real cause.
    throw new Error(msg.endsWith(".") ? msg : `${msg}.`);
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    return true;
  }
  return false;
}

export function sendReminderHourToSW(hour: number): void {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then((reg) => {
    if (reg.active) {
      reg.active.postMessage({ type: "update-reminder-hour", hour });
    }
  });
}

// ─── Daily reminder logic (client-side) ─────────────────────────────────

const REMINDER_STORAGE_KEY = "seine_last_reminded";

export function getLastRemindedDate(): string | null {
  return localStorage.getItem(REMINDER_STORAGE_KEY);
}

export function setLastRemindedDate(date: string): void {
  localStorage.setItem(REMINDER_STORAGE_KEY, date);
}

/** Returns true if we should show a daily reminder right now */
export function shouldShowDailyReminder(
  dailyReminder: boolean,
  lastRemindedAt: string | null,
): boolean {
  if (!dailyReminder) return false;
  if (Notification.permission !== "granted") return false;

  const localLast = getLastRemindedDate();
  const serverLast = lastRemindedAt ? new Date(lastRemindedAt).toDateString() : null;
  const lastDate = localLast || serverLast;
  const today = new Date().toDateString();

  return lastDate !== today;
}

/** Show a daily reminder notification right now */
export function showDailyReminder(): void {
  if (Notification.permission !== "granted") return;

  const now = new Date().toISOString();
  setLastRemindedDate(new Date().toDateString());

  if ("serviceWorker" in navigator && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then((reg) => {
      void reg.showNotification("Seine Studio", {
        body: "📋 Time to check your studio — review pending orders, repairs, and daily tasks.",
        icon: "/icons/seine-mark-192.png",
        badge: "/icons/seine-mark-192.png",
        tag: "seine-daily",
        requireInteraction: true,
      } as NotificationOptions);
    });
  } else {
    new Notification("Seine Studio", {
      body: "📋 Time to check your studio — review pending orders, repairs, and daily tasks.",
      icon: "/icons/seine-mark-192.png",
      tag: "seine-daily",
      requireInteraction: true,
    });
  }
}
