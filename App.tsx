import React from "react";
import { View, StatusBar } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import { CalendarProvider } from "./src/context/CalendarContext";
import { AlertProvider } from "./src/context/AlertContext";
import { MainNavigator } from "./src/navigation/MainNavigator";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30, // 30s caching matching web app
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <View style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <CalendarProvider>
              <AlertProvider>
                <AuthProvider>
                  <StatusBar barStyle="light-content" />
                  <MainNavigator />
                </AuthProvider>
              </AlertProvider>
            </CalendarProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </View>
    </ErrorBoundary>
  );
}
