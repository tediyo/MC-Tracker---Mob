import notifee, { AndroidImportance, TriggerType, RepeatFrequency } from "@notifee/react-native";
import messaging from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { getEthiopianDate, toGregorianDate, ETHIOPIAN_MONTHS } from "../shared-types/ethiopian-calendar";

export const NOTIFICATION_CHANNEL_ID = "mc_tracker_notifications";

/** Notification Trigger IDs */
const ID_REMINDER_10PM = "reminder_1000pm";
const ID_REMINDER_11PM = "reminder_1100pm";
const ID_REMINDER_1130PM = "reminder_1130pm";
const ID_REMINDER_1159PM = "reminder_1159pm";
const ID_YESTERDAY_8PM = "reminder_yesterday_8pm";
const ID_YESTERDAY_2H = "reminder_yesterday_2h";
const ID_NEW_MONTH = "new_month_welcome";

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
 * Formats a Date object into local YYYY-MM-DD string according to the user's device timezone.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Schedule Daily Reminders:
 * - 2-Hour Interval Checkpoints from 2:00 AM (2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22:00) if yesterday remains unlogged
 * - 10:00 PM: First daily reminder for today
 * - 11:00 PM: Second reminder (if not logged yet)
 * - 11:30 PM: Third reminder (if not logged yet)
 * - 11:59 PM: Final reminder today (if not logged yet)
 */
export async function updateDailyCostReminders(hasLoggedToday: boolean, hasLoggedYesterday: boolean = true) {
  try {
    await createNotificationChannel();

    // Cancel legacy test triggers if any
    await notifee.cancelNotification("reminder_today_2min_test");
    await notifee.cancelNotification("reminder_yesterday_2min_test");

    const now = new Date();
    const getTargetToday = (hours: number, minutes: number) => {
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    // Helper to safely schedule trigger with alarmManager and graceful fallback
    const safeScheduleTrigger = async (
      id: string,
      title: string,
      body: string,
      triggerTime: Date,
      repeatFrequency?: RepeatFrequency
    ) => {
      const notification = {
        id,
        title,
        body,
        android: {
          channelId: NOTIFICATION_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: { id: "default" },
        },
      };

      try {
        await notifee.createTriggerNotification(notification, {
          type: TriggerType.TIMESTAMP,
          timestamp: triggerTime.getTime(),
          ...(repeatFrequency ? { repeatFrequency } : {}),
          alarmManager: { allowWhileIdle: true },
        });
      } catch (alarmErr) {
        console.warn(`[Notification] AlarmManager fallback for ${id}:`, alarmErr);
        await notifee.createTriggerNotification(notification, {
          type: TriggerType.TIMESTAMP,
          timestamp: triggerTime.getTime(),
          ...(repeatFrequency ? { repeatFrequency } : {}),
        });
      }
    };

    // 1. Handle Today's Reminders (10:00 PM, 11:00 PM, 11:30 PM, 11:59 PM)
    if (hasLoggedToday) {
      await notifee.cancelNotification(ID_REMINDER_10PM);
      await notifee.cancelNotification(ID_REMINDER_11PM);
      await notifee.cancelNotification(ID_REMINDER_1130PM);
      await notifee.cancelNotification(ID_REMINDER_1159PM);
      console.log("[Notification] Costs logged today! Suppressing pending daily reminders.");

      // Schedule tomorrow's 10:00 PM reminder
      const tomorrow10PM = new Date();
      tomorrow10PM.setDate(tomorrow10PM.getDate() + 1);
      tomorrow10PM.setHours(22, 0, 0, 0);

      await safeScheduleTrigger(
        ID_REMINDER_10PM,
        "Daily Expense Reminder",
        "Did you log your expenses today? Tap to record now!",
        tomorrow10PM,
        RepeatFrequency.DAILY
      );
    } else {
      // 10:00 PM (22:00) - 1st Daily Reminder
      const time10PM = getTargetToday(22, 0);
      if (now.getTime() < time10PM.getTime()) {
        await safeScheduleTrigger(
          ID_REMINDER_10PM,
          "Daily Expense Reminder",
          "Did you log your expenses today? Tap to record now!",
          time10PM,
          RepeatFrequency.DAILY
        );
      } else {
        // Already past 10 PM today, schedule for tomorrow 10 PM
        const tomorrow10PM = new Date();
        tomorrow10PM.setDate(tomorrow10PM.getDate() + 1);
        tomorrow10PM.setHours(22, 0, 0, 0);
        await safeScheduleTrigger(
          ID_REMINDER_10PM,
          "Daily Expense Reminder",
          "Did you log your expenses today? Tap to record now!",
          tomorrow10PM,
          RepeatFrequency.DAILY
        );
      }

      // 11:00 PM (23:00) - 2nd Escalation
      const time11PM = getTargetToday(23, 0);
      if (now.getTime() < time11PM.getTime()) {
        await safeScheduleTrigger(
          ID_REMINDER_11PM,
          "Expense Reminder (11:00 PM)",
          "Haven't logged expenses today yet? Take 10 seconds to update MC Tracker.",
          time11PM
        );
      }

      // 11:30 PM (23:30) - 3rd Escalation
      const time1130PM = getTargetToday(23, 30);
      if (now.getTime() < time1130PM.getTime()) {
        await safeScheduleTrigger(
          ID_REMINDER_1130PM,
          "Expense Reminder (11:30 PM)",
          "Still haven't logged today's costs? Quick reminder before midnight!",
          time1130PM
        );
      }

      // 11:59 PM (23:59) - Final Midnight Reminder
      const time1159PM = getTargetToday(23, 59);
      if (now.getTime() < time1159PM.getTime()) {
        await safeScheduleTrigger(
          ID_REMINDER_1159PM,
          "Final Daily Reminder (11:59 PM)",
          "Final reminder for today! Don't miss tracking today's expenses.",
          time1159PM
        );
      }
    }

    // 2. Handle Yesterday's Unlogged Alerts: Every 2 Hours starting from 2:00 AM (2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22:00)
    const YESTERDAY_2H_SLOTS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

    if (hasLoggedYesterday) {
      for (const h of YESTERDAY_2H_SLOTS) {
        await notifee.cancelNotification(`reminder_yesterday_${h}h`);
      }
      await notifee.cancelNotification(ID_YESTERDAY_8PM);
      await notifee.cancelNotification(ID_YESTERDAY_2H);
      console.log("[Notification] Yesterday's costs logged! Cancelled all 2-hour yesterday reminders.");
    } else {
      console.log("[Notification] Yesterday's costs NOT logged! Scheduling 2-hour interval repeating reminders (2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22:00).");

      for (const h of YESTERDAY_2H_SLOTS) {
        const slotTime = new Date();
        slotTime.setHours(h, 0, 0, 0);

        // If this slot has already passed for today, schedule it for the same hour tomorrow!
        if (slotTime.getTime() <= now.getTime()) {
          slotTime.setDate(slotTime.getDate() + 1);
        }

        await safeScheduleTrigger(
          `reminder_yesterday_${h}h`,
          "Log Yesterday's Costs",
          "Please log yesterday's costs to keep your budget on track!",
          slotTime,
          RepeatFrequency.DAILY
        );
      }

      // Display the checkpoint notification immediately so user is notified on login / app start
      await displayNotification(
        "Log Yesterday's Costs",
        "Please log yesterday's costs to keep your budget on track!",
        { type: "yesterday_unlogged" }
      );
      console.log("[Notification] Displayed immediate 'Log Yesterday's Costs' checkpoint notification.");
    }
  } catch (error) {
    console.error("[Notification] Failed to schedule daily reminders:", error);
  }
}


/**
 * Welcoming New Month Notification (Fires at 12:00 AM on the 1st of every month).
 * Dynamically computes whether the 1st day of the next month is Ethiopian or Gregorian
 * based on the user's preference configured in the Profile page.
 */
export async function scheduleNewMonthWelcomingNotification(preferredMode?: "ethiopian" | "gregorian") {
  try {
    await createNotificationChannel();

    // Cancel existing scheduled new month notification to avoid duplicates or stale triggers
    await notifee.cancelNotification(ID_NEW_MONTH);

    let mode = preferredMode;
    if (!mode) {
      const saved = await AsyncStorage.getItem("@mc-tracker/calendar-mode");
      mode = (saved === "gregorian" ? "gregorian" : "ethiopian");
    }

    const now = new Date();
    let triggerDate: Date;
    let title = "Happy New Month!";
    let body = "Welcome to a new month! Tap to review your financial goals and set your budget plan.";

    if (mode === "gregorian") {
      // 12:00 AM on the 1st of the next Gregorian month
      triggerDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      title = "Happy New Month!";
      body = "Welcome to a new month! Tap to review your financial goals and set your budget plan.";
    } else {
      // 12:00 AM on the 1st of the next Ethiopian month
      const ethToday = getEthiopianDate(now);
      let nextEthYear = ethToday.year;
      let nextEthMonth = ethToday.month + 1;
      if (nextEthMonth > 13) {
        nextEthMonth = 1;
        nextEthYear += 1;
      }

      triggerDate = toGregorianDate(nextEthYear, nextEthMonth, 1);
      triggerDate.setHours(0, 0, 0, 0);

      const monthInfo = ETHIOPIAN_MONTHS.find((m) => m.number === nextEthMonth);
      const monthName = monthInfo ? `${monthInfo.nameEn} (${monthInfo.nameAm})` : `Month ${nextEthMonth}`;

      if (nextEthMonth === 1) {
        title = "እንኳን ለአዲሱ ዓመት አደረሳችሁ! (Happy New Year!)";
        body = `Welcome to the new Ethiopian year ${nextEthYear}! Tap to review your annual and monthly financial goals.`;
      } else {
        title = "መልካም አዲስ ወር! (Happy New Month!)";
        body = `Welcome to ${monthName}! Tap to review your financial goals and set your budget plan.`;
      }
    }

    if (triggerDate.getTime() > now.getTime()) {
      await notifee.createTriggerNotification(
        {
          id: ID_NEW_MONTH,
          title: title,
          body: body,
          data: {
            type: "new_month_welcome",
            calendarMode: mode,
          },
          android: {
            channelId: NOTIFICATION_CHANNEL_ID,
            importance: AndroidImportance.HIGH,
            pressAction: { id: "default" },
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: triggerDate.getTime(),
          alarmManager: { allowWhileIdle: true },
        }
      );

      console.log(`[Notification] Scheduled New Month Welcoming Notification (${mode}) for: ${triggerDate.toLocaleString()} (Title: "${title}")`);
    }
  } catch (error) {
    console.error("[Notification] Failed to schedule new month notification:", error);
  }
}

/**
 * Checks if Total Monthly Expenses surpasses the Monthly Budget Plan threshold.
 */
const monthlySurpassedNotified = new Set<string>();

export async function checkMonthlyPlanSurpassed(totalCosts: number, monthlyCostLimit: number) {
  if (!monthlyCostLimit || monthlyCostLimit <= 0) return;

  const currentMonthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  const key = `${currentMonthKey}_${monthlyCostLimit}`;

  if (totalCosts > monthlyCostLimit && !monthlySurpassedNotified.has(key)) {
    monthlySurpassedNotified.add(key);

    const title = "Monthly Budget Plan Surpassed!";
    const body = `You have surpassed your monthly budget plan! Total spent: ETB ${totalCosts.toFixed(2)} of ETB ${monthlyCostLimit.toFixed(2)}.`;

    await displayNotification(title, body, { type: "monthly_plan_surpassed" });
  } else if (totalCosts >= monthlyCostLimit * 0.8 && totalCosts <= monthlyCostLimit && !monthlySurpassedNotified.has(`80_${key}`)) {
    monthlySurpassedNotified.add(`80_${key}`);

    const title = "Budget Plan Warning (80%)";
    const body = `You have reached 80% of your active monthly budget plan (Spent ETB ${totalCosts.toFixed(2)} of ETB ${monthlyCostLimit.toFixed(2)}).`;

    await displayNotification(title, body, { type: "budget_80_warning" });
  }
}

/**
 * Backwards-compatible alias for budget threshold checks
 */
export async function checkBudgetThresholds(totalCosts: number, monthlyCostLimit: number) {
  return checkMonthlyPlanSurpassed(totalCosts, monthlyCostLimit);
}

/**
 * Checks database for today's costs and initializes all notification schedules.
 */
export async function syncDailyNotificationState(userId?: string) {
  try {
    let hasLoggedToday = false;
    let hasLoggedYesterday = true;

    if (userId) {
      const now = new Date();
      const todayIso = getLocalDateString(now);

      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yesterdayIso = getLocalDateString(yesterday);

      console.log(`[Notification] Syncing daily state for user ${userId}: todayIso=${todayIso}, yesterdayIso=${yesterdayIso}`);

      const [todayRes, yesterdayRes] = await Promise.all([
        supabase
          .from("costs")
          .select("id")
          .eq("user_id", userId)
          .eq("date", todayIso)
          .limit(1),
        supabase
          .from("costs")
          .select("id")
          .eq("user_id", userId)
          .eq("date", yesterdayIso)
          .limit(1),
      ]);

      hasLoggedToday = !!(todayRes.data && todayRes.data.length > 0);
      hasLoggedYesterday = !!(yesterdayRes.data && yesterdayRes.data.length > 0);
      console.log(`[Notification] Query results: hasLoggedToday=${hasLoggedToday}, hasLoggedYesterday=${hasLoggedYesterday}`);
    }

    await updateDailyCostReminders(hasLoggedToday, hasLoggedYesterday);
    await scheduleNewMonthWelcomingNotification();
  } catch (err) {
    console.error("[Notification] Error syncing daily notification state:", err);
  }
}

/**
 * Initializes Firebase Cloud Messaging (FCM) & Local Notification Listeners.
 */
export async function initNotificationService(userId?: string) {
  console.log("[Notification] Initializing Notification Service...");

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.log("[Notification] Permission not granted, skipping notification scheduling.");
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

  // Sync schedules & triggers
  await syncDailyNotificationState(userId);

  // Clean up any test notification trigger
  await notifee.cancelNotification("test_swipe_notification");
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
