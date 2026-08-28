/**
 * Single source of truth for the app's brand/accent color. Every green button, icon,
 * badge, and highlight anywhere in the app is derived from this one hex value - change
 * it here and it cascades everywhere (primary, its tint/shade, and the "success" color).
 * Nothing else in the codebase should hardcode a green hex; import from here instead.
 */
export const BRAND_COLOR = "#03ad03ff"; // Emerald 500

// --- small color-math helpers (no dependency needed for this) ---
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** BRAND_COLOR at a given opacity, e.g. for a tinted background behind the primary color. */
function tint(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** A darker shade of BRAND_COLOR, e.g. for a pressed/active state. */
function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const factor = 1 - amount;
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(r * factor)}${toHex(g * factor)}${toHex(b * factor)}`;
}

export const darkColors = {
  primary: BRAND_COLOR,
  primaryLight: tint(BRAND_COLOR, 0.15),
  primaryDark: shade(BRAND_COLOR, 0.22),
  background: "#000000", // Pure Black
  surface: "#121212",
  card: "#18181b",
  cardBorder: "#27272a",
  textPrimary: "#ffffff", // Pure White text
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
  success: BRAND_COLOR,
  danger: "#f43f5e",
  warning: "#f59e0b",
  info: "#3b82f6",
  border: "#27272a",
  inputBg: "#121212",
  pillBg: "rgba(24, 24, 27, 0.82)", // Translucent floating glassmorphism for dark mode
  pillActiveText: "#ffffff",
  pillInactiveText: "#71717a",
};

export const lightColors = {
  primary: BRAND_COLOR,
  primaryLight: tint(BRAND_COLOR, 0.1),
  primaryDark: shade(BRAND_COLOR, 0.3),
  background: "#f8fafc",
  surface: "#ffffff", // Pure White
  card: "#ffffff",
  cardBorder: "#e2e8f0",
  textPrimary: "#09090b", // Pure Black text
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  success: BRAND_COLOR,
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  border: "#e2e8f0",
  inputBg: "#f1f5f9",
  pillBg: "rgba(255, 255, 255, 0.85)", // Translucent floating glassmorphism for light mode
  pillActiveText: "#09090b",
  pillInactiveText: "#94a3b8",
};

export const colors = darkColors;
