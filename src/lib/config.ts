import { API_BASE_URL as ENV_API_URL } from "@env";

/**
 * Returns the backend API base URL for mobile requests.
 * Production URL: https://mc-tracker-bdm0.onrender.com
 */
export function getApiBaseUrl(): string {
  return ENV_API_URL || "https://mc-tracker-bdm0.onrender.com";
}

export const API_BASE_URL = getApiBaseUrl();

