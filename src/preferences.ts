export type Preferences = {
  libraryCollapsed: boolean;
  labels: boolean;
  animatePreviews: boolean;
  grid: boolean;
  snap: boolean;
};
export const PREFERENCES_KEY = "luma-preferences-v1";
export function readPreferences(): Preferences {
  const defaults = {
    libraryCollapsed: innerHeight < 800,
    labels: true,
    animatePreviews: false,
    grid: false,
    snap: false,
  };
  try {
    const stored = JSON.parse(
      localStorage.getItem(PREFERENCES_KEY) || "{}",
    ) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(defaults).map(([key, value]) => [
        key,
        typeof stored[key] === "boolean" ? stored[key] : value,
      ]),
    ) as Preferences;
  } catch {
    return defaults;
  }
}
