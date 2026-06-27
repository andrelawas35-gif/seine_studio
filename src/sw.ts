/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
clientsClaim();

// Precache all assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// ─── Push Notification Handler ──────────────────────────────────────────

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let title = "Seine Studio";
  let body = "";
  let icon = "/icons/seine-mark-192.png";
  let badge = "/icons/seine-mark-192.png";
  let tag = "seine-daily";
  let data: Record<string, unknown> = {};

  try {
    const payload = event.data.json();
    title = (payload.title as string) || title;
    body = (payload.body as string) || body;
    icon = (payload.icon as string) || icon;
    badge = (payload.badge as string) || badge;
    tag = (payload.tag as string) || tag;
    data = (payload.data as Record<string, unknown>) || {};
  } catch {
    body = event.data.text();
  }

  const promise = self.registration.showNotification(title, {
    body,
    icon,
    badge,
    tag,
    data,
    requireInteraction: true,
    actions: [{ action: "open", title: "Open Seine Studio" }],
  } as NotificationOptions);

  event.waitUntil(promise);
});

// ─── Notification Click Handler ─────────────────────────────────────────

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  if (event.action === "open" || !event.action) {
    const promise = self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow("/");
      });

    event.waitUntil(promise);
  }
});

// ─── Daily Reminder Scheduler ───────────────────────────────────────────
// When the SW activates, schedule a daily reminder check.
// Note: setInterval in a SW is best-effort on iOS; the main thread
// also handles this when the app is open.

const DAILY_REMINDER_HOUR = 9; // 9 AM default — overridden by server preferences

function scheduleNextReminder(hour: number) {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const msUntilTarget = target.getTime() - now.getTime();
  // Cap at 24 hours to avoid precision issues
  const delay = Math.min(msUntilTarget, 24 * 60 * 60 * 1000);

  setTimeout(() => {
    void self.registration.showNotification("Seine Studio", {
      body: "📋 Time to check your studio — review pending orders, repairs, and daily tasks.",
      icon: "/icons/seine-mark-192.png",
      badge: "/icons/seine-mark-192.png",
      tag: "seine-daily",
      requireInteraction: true,
      actions: [{ action: "open", title: "Open Seine Studio" }],
    } as NotificationOptions);
    // Schedule the next one
    scheduleNextReminder(hour);
  }, delay);
}

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Read reminder hour from a message or default to 9
      scheduleNextReminder(DAILY_REMINDER_HOUR);
    })(),
  );
});

// ─── Message Handler ────────────────────────────────────────────────────
// Receives reminder-hour preference updates from the main thread.

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "update-reminder-hour") {
    const hour = (event.data.hour as number) ?? DAILY_REMINDER_HOUR;
    scheduleNextReminder(hour);
  }
});
