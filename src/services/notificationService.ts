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
 * Displays an immediate push notification popup.
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
 * Schedules a recurring notification every 2 minutes for testing purposes.
 */
let recurringTimer: NodeJS.Timeout | null = null;

export function start2MinuteNotificationSchedule() {
  console.log("[Notification] Starting 2-minute recurring push notification scheduler...");
  
  // Clear any existing timer
  if (recurringTimer) {
    clearInterval(recurringTimer);
  }

  // Display initial test notification after 10 seconds
  setTimeout(() => {
    displayNotification(
      " MC Tracker Reminder",
      "Don't forget to log your daily income & expenses!",
      { test: "true" }
    );
  }, 10000);

  // Trigger every 2 minutes (120,000 ms)
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

  // 1. Request Permission
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.log("[Notification] Permission not granted, skipping FCM initialization.");
    return;
  }

  // 2. Setup Android Channel
  await createNotificationChannel();

  // 3. Obtain FCM Token
  try {
    const fcmToken = await messaging().getToken();
    console.log("==========================================");
    console.log("[FCM TOKEN]:", fcmToken);
    console.log("==========================================");
  } catch (err) {
    console.warn("[Notification] FCM Token retrieval note:", err);
  }

  // 4. Handle Foreground Messages from FCM
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

  // 5. Start the 2-minute test scheduler
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
