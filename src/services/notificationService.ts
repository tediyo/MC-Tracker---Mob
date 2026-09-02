import notifee, { AndroidImportance, TriggerType, RepeatFrequency } from "@notifee/react-native";
import messaging from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";

export const NOTIFICATION_CHANNEL_ID = "mc_tracker_notifications";

/**
 * Requests Notification permissions for Android 13+ (POST_NOTIFICATIONS) and iOS.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === "android" && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log("[Notification] POST_NOTIFICATIONS permission denied.");
        return false;
      }
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log("[Notification] FCM Permission status:", authStatus, "Enabled:", enabled);
    return enabled;
  } catch (error) {
    console.error("[Notification] Error requesting notification permissions:", error);
    return false;
  }
}

/**
 * Creates the Android Notification Channel required for Android 8.0+
 */
export async function createNotificationChannel() {
  await notifee.createChannel({
    id: NOTIFICATION_CHANNEL_ID,
    name: "MC Tracker Updates & Reminders",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibration: true,
  });
}

/**
 * Displays an immediate push notification popup on device.
 */
export async function displayNotification(title: string, body: string, data?: Record<string, string>) {
  await createNotificationChannel();

  await notifee.displayNotification({
    title: title,
    body: body,
    data: data,
    android: {
      channelId: NOTIFICATION_CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: "default",
      },
      sound: "default",
    },
  });
}

/**
 * Schedules a daily 8:00 PM local push notification reminder on device.
 */
export async function scheduleDaily8PMReminder() {
  try {
    await createNotificationChannel();

    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(20, 0, 0, 0); // 8:00 PM local time

    // If past 8:00 PM today, schedule for 8:00 PM tomorrow
    if (now.getTime() > scheduledTime.getTime()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    await notifee.createTriggerNotification(
      {
        id: "daily_8pm_reminder",
        title: "MC Tracker Evening Reminder",
        body: "Don't forget to record today's income & expenses!",
        android: {
          channelId: NOTIFICATION_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: { id: "default" },
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: scheduledTime.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
      }
    );

    console.log("[Notification] Scheduled Daily 8:00 PM reminder for:", scheduledTime.toLocaleString());
  } catch (error) {
    console.error("[Notification] Failed to schedule 8:00 PM daily reminder:", error);
  }
}

/**
 * Checks budget utilization and triggers Push Notifications if 80% or 100% threshold crossed.
 */
const notifiedThresholds = new Set<string>();

export async function checkBudgetThresholds(totalCosts: number, costLimit: number) {
  if (!costLimit || costLimit <= 0) return;

  const pct = (totalCosts / costLimit) * 100;
  const key80 = `80_${costLimit}`;
  const key100 = `100_${costLimit}`;

  if (pct >= 100 && !notifiedThresholds.has(key100)) {
    notifiedThresholds.add(key100);
    const title = "⚠️ Budget Limit Exceeded!";
    const body = `You have reached 100% of your active budget limit (Spent ETB ${totalCosts.toFixed(2)} of ETB ${costLimit.toFixed(2)}).`;
    
    await displayNotification(title, body, { type: "budget_exceeded" });
  } else if (pct >= 80 && pct < 100 && !notifiedThresholds.has(key80)) {
    notifiedThresholds.add(key80);
    const title = "⚠️ Budget Limit Warning (80%)";
    const body = `You have reached ${pct.toFixed(0)}% of your active budget limit (Spent ETB ${totalCosts.toFixed(2)} of ETB ${costLimit.toFixed(2)}).`;
    
    await displayNotification(title, body, { type: "budget_warning" });
  }
}

/**
 * Schedules a recurring notification every 2 minutes for testing purposes.
 */
let recurringTimer: NodeJS.Timeout | null = null;

export function start2MinuteNotificationSchedule() {
  console.log("[Notification] Starting 2-minute recurring push notification scheduler...");

  if (recurringTimer) {
    clearInterval(recurringTimer);
  }

  setTimeout(() => {
    displayNotification(
      "MC Tracker Reminder",
      "Don't forget to log your daily income & expenses!",
      { test: "true" }
    );
  }, 10000);

  recurringTimer = setInterval(() => {
    displayNotification(
      "MC Tracker 2-Min Update",
      "Keep your financial logs up-to-date in MC Tracker!",
      { timestamp: new Date().toISOString() }
    );
  }, 120000);
}

/**
 * Initializes Firebase Cloud Messaging (FCM) & Local Notification Listeners.
 */
export async function initNotificationService() {
  console.log("[Notification] Initializing Notification Service...");

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.log("[Notification] Permission not granted, skipping FCM initialization.");
    return;
  }

  await createNotificationChannel();

  try {
    const fcmToken = await messaging().getToken();
    console.log("==========================================");
    console.log("[FCM TOKEN]:", fcmToken);
    console.log("==========================================");
  } catch (err) {
    console.warn("[Notification] FCM Token retrieval note:", err);
  }

  messaging().onMessage(async (remoteMessage) => {
    console.log("[FCM] Foreground Message Received:", remoteMessage);
    if (remoteMessage.notification) {
      await displayNotification(
        remoteMessage.notification.title || "MC Tracker",
        remoteMessage.notification.body || "New update received",
        remoteMessage.data as Record<string, string>
      );
    }
  });

  // Schedule daily 8:00 PM reminder
  scheduleDaily8PMReminder();

  // Test schedule
  start2MinuteNotificationSchedule();
}

/**
 * Background FCM message handler (must be registered in index.js)
 */
export function registerBackgroundFcmHandler() {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log("[FCM] Background Message Received:", remoteMessage);
    if (remoteMessage.notification) {
      await displayNotification(
        remoteMessage.notification.title || "MC Tracker",
        remoteMessage.notification.body || "",
        remoteMessage.data as Record<string, string>
      );
    }
  });
}
