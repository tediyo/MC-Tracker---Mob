import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  }, []);

  const setCalendarMode = async (mode: CalendarMode) => {
    setCalendarModeState(mode);
    await AsyncStorage.setItem(CALENDAR_STORAGE_KEY, mode);
  };

  return (
    <CalendarContext.Provider value={{ calendarMode, setCalendarMode }}>
      {children}
    </CalendarContext.Provider>
  );
}

export const useCalendar = () => useContext(CalendarContext);
