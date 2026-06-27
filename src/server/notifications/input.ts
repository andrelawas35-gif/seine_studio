import { z } from "zod";

export const pushSubscribeInput = z.object({
  endpoint: z.string().url(),
  p256dhKey: z.string().min(1),
  authKey: z.string().min(1),
});

export const updatePreferencesInput = z.object({
  dailyReminder: z.boolean().optional(),
  reminderHour: z.number().int().min(0).max(23).optional(),
});
