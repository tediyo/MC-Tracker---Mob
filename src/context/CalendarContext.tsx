import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scheduleNewMonthWelcomingNotification } from "../services/notificationService";
import { supabase } from "../lib/supabase";

export type CalendarMode = "ethiopian" | "gregorian";

interface CalendarContextType {
  calendarMode: CalendarMode;
  setCalendarMode: (mode: CalendarMode) => void;
}

const CALENDAR_STORAGE_KEY = "@mc-tracker/calendar-mode";

const CalendarContext = createContext<CalendarContextType>({
  calendarMode: "ethiopian",
  setCalendarMode: () => {},
});

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [calendarMode, setCalendarModeState] = useState<CalendarMode>("ethiopian");

  useEffect(() => {
    AsyncStorage.getItem(CALENDAR_STORAGE_KEY).then((saved) => {
      if (saved === "gregorian" || saved === "ethiopian") {
        setCalendarModeState(saved);
      }
    });

    // Check remote user metadata from Supabase
    supabase.auth.getUser().then(({ data }) => {
      const remoteMode = data?.user?.user_metadata?.calendar_mode as CalendarMode | undefined;
      if (remoteMode === "gregorian" || remoteMode === "ethiopian") {
        setCalendarModeState(remoteMode);
        AsyncStorage.setItem(CALENDAR_STORAGE_KEY, remoteMode).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const setCalendarMode = async (mode: CalendarMode) => {
    setCalendarModeState(mode);
    await AsyncStorage.setItem(CALENDAR_STORAGE_KEY, mode);
    scheduleNewMonthWelcomingNotification(mode).catch((err) =>
      console.warn("[CalendarContext] Failed to reschedule new month notification:", err)
    );

    // Persist to user account metadata in Supabase so automated background jobs respect it
    supabase.auth.updateUser({ data: { calendar_mode: mode } }).catch((err) => {
      console.warn("[CalendarContext] Failed to sync calendar_mode with Supabase metadata:", err);
    });
  };

  return (
    <CalendarContext.Provider value={{ calendarMode, setCalendarMode }}>
      {children}
    </CalendarContext.Provider>
  );
}

export const useCalendar = () => useContext(CalendarContext);
