import { useEffect, useState } from "react";
import { Bell, BellOff, Clock, Loader2, Check, X } from "lucide-react";
import { apiRequest, ApiError } from "../api";
import {
  isPushSupported,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  sendReminderHourToSW,
} from "../notifications";

const USE_API = import.meta.env.VITE_DATA_MODE === "api";

interface NotificationPrefs {
  subscribed: boolean;
  dailyReminder: boolean;
  reminderHour: number;
  lastRemindedAt: string | null;
}

interface NotificationSettingsProps {
  onClose: () => void;
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pushSupported = isPushSupported();

  useEffect(() => {
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!USE_API) {
      setLoading(false);
      return;
    }
    void apiRequest<{ data: NotificationPrefs }>("/notifications/status")
      .then((res) => setPrefs(res.data))
      .catch(() => setPrefs(null))
      .finally(() => setLoading(false));
  }, []);

  const handleEnable = async () => {
    setError(null);
    setSuccess(null);

    // Step 1: Request notification permission
    const perm = await requestNotificationPermission();
    setPermission(perm);

    if (perm !== "granted") {
      setError("Notification permission is required for push notifications. Please enable in your device Settings.");
      return;
    }

    // Step 2: Subscribe to push
    if (!pushSupported) {
      setError("Push notifications are not supported on this device.");
      return;
    }

    setSaving(true);
    try {
      const subscription = await subscribeToPush();

      // Step 3: Store subscription on the server
      if (USE_API) {
        const keyData = subscription.toJSON();
        if (!keyData.keys?.p256dh || !keyData.keys?.auth) {
          setError("Push subscription is missing encryption keys. Try again.");
          setSaving(false);
          return;
        }
        await apiRequest("/notifications/subscribe", {
          method: "POST",
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            p256dhKey: keyData.keys.p256dh,
            authKey: keyData.keys.auth,
          }),
        });
      }

      // Step 4: Refresh prefs
      const res = await apiRequest<{ data: NotificationPrefs }>("/notifications/status");
      setPrefs(res.data);
      sendReminderHourToSW(res.data.reminderHour);
      setSuccess("Push notifications enabled! You'll receive daily reminders.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to enable notifications.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await unsubscribeFromPush();
      if (USE_API) {
        await apiRequest("/notifications/unsubscribe", { method: "DELETE" });
      }
      setPrefs((prev) =>
        prev ? { ...prev, subscribed: false, dailyReminder: false } : null,
      );
      setSuccess("Push notifications disabled.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to disable notifications.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReminder = async () => {
    if (!prefs) return;
    setSaving(true);
    setError(null);
    try {
      const newVal = !prefs.dailyReminder;
      await apiRequest("/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify({ dailyReminder: newVal }),
      });
      setPrefs({ ...prefs, dailyReminder: newVal });
      if (newVal) sendReminderHourToSW(prefs.reminderHour);
      setSuccess(newVal ? "Daily reminders enabled." : "Daily reminders disabled.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update preferences.");
    } finally {
      setSaving(false);
    }
  };

  const handleHourChange = async (hour: number) => {
    if (!prefs) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest("/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify({ reminderHour: hour }),
      });
      setPrefs({ ...prefs, reminderHour: hour });
      sendReminderHourToSW(hour);
      setSuccess(`Reminder set to ${hour}:00 daily.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update reminder time.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Notification settings"
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full max-w-sm mx-4 shadow-xl border border-border"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-accent" />
            <h3 className="font-serif text-[15px] text-foreground">Notifications</h3>
          </div>
          <button type="button" onClick={onClose} className="min-h-9 min-w-9 grid place-items-center text-muted-foreground hover:text-foreground">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="p-2.5 border border-red-500/30 text-[12px] text-red-600 bg-red-50/50">
            {error}
          </div>
        )}
        {success && (
          <div className="p-2.5 border border-emerald-500/30 text-[12px] text-emerald-700 bg-emerald-50/50">
            <Check size={12} className="inline mr-1" />
            {success}
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {/* Permission status */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-foreground">System permission</span>
              <span
                className="text-[11px] font-medium px-2 py-0.5"
                style={{
                  color: permission === "granted" ? "#2D6A4F" : permission === "denied" ? "#C73E1D" : undefined,
                }}
              >
                {permission === "granted" ? "Allowed" : permission === "denied" ? "Blocked" : "Not set"}
              </span>
            </div>

            {/* Push toggle */}
            {pushSupported && (
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div className="flex items-center gap-2">
                  {prefs?.subscribed ? <Bell size={14} className="text-emerald-700" /> : <BellOff size={14} className="text-muted-foreground" />}
                  <span className="text-[13px] text-foreground">Push notifications</span>
                </div>
                {prefs?.subscribed ? (
                  <button
                    type="button"
                    onClick={handleDisable}
                    disabled={saving}
                    className="text-[12px] font-medium disabled:opacity-50 text-red-600"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : "Disable"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnable}
                    disabled={saving || permission === "denied"}
                    className={`text-[12px] font-medium disabled:opacity-50 ${permission === "denied" ? "text-muted-foreground" : "text-accent"}`}
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : "Enable"}
                  </button>
                )}
              </div>
            )}

            {/* Daily reminder toggle */}
            {prefs?.subscribed && (
              <>
                <div className="flex items-center justify-between py-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className={prefs.dailyReminder ? "text-emerald-700" : "text-muted-foreground"} />
                    <span className="text-[13px]">Daily reminder</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleReminder}
                    disabled={saving}
                    className="min-w-[44px] h-6 rounded-full relative transition-colors"
                    style={{
                      background: prefs.dailyReminder ? "#2D6A4F" : "var(--border)",
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                      style={{
                        left: prefs.dailyReminder ? "calc(100% - 22px)" : "2px",
                      }}
                    />
                  </button>
                </div>

                {/* Reminder hour */}
                {prefs.dailyReminder && (
                  <div className="flex items-center justify-between py-2 border-t border-border">
                    <span className="text-[13px]">Reminder time</span>
                    <select
                      value={prefs.reminderHour}
                      onChange={(e) => handleHourChange(Number(e.target.value))}
                      disabled={saving}
                      className="h-8 px-2 text-[12px] border border-border bg-card text-foreground"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* iOS-specific guidance */}
            {!pushSupported && (
              <div className="p-3 text-[12px] border border-border text-muted-foreground bg-muted/20">
                Push notifications require iOS 16.4+ with the app installed to your Home Screen. Add Seine Studio to your Home Screen first, then return here.
              </div>
            )}

            {permission === "denied" && (
              <div className="p-3 text-[12px] border border-red-500/30 text-red-600 bg-red-50/50">
                Notifications are blocked. Go to Settings → Notifications → Seine Studio to allow them.
              </div>
            )}
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
