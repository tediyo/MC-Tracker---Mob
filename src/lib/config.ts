import { Platform } from "react-native";

/**
 * Returns the backend API base URL for mobile requests on physical devices & emulators.
 * 192.168.10.39 is your development computer's exact LAN IP address on Wi-Fi.
 */
export function getApiBaseUrl(): string {
  return "http://192.168.10.39:3000";
}
