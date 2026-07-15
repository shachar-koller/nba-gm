/** Shared UI preference constants (safe for server + client). */

export const THEME_STORAGE_KEY = "nba-fo-theme";
export const FONT_SIZE_STORAGE_KEY = "nba-fo-font-size";

export type FontSize = "small" | "medium" | "large" | "xl";

/** Unitless zoom / rem multipliers — must stay in ascending order. */
export const FONT_SIZE_SCALES: Record<FontSize, number> = {
  small: 0.9,
  medium: 1,
  large: 1.125,
  xl: 1.35,
};

/**
 * Inline script for root layout — applies theme + font size before paint
 * to avoid a flash of the wrong appearance.
 */
export const UI_PREFS_INIT_SCRIPT = `(function(){try{var r=document.documentElement;var tk=${JSON.stringify(THEME_STORAGE_KEY)};var tp=localStorage.getItem(tk)||"system";var dark=tp==="dark"||(tp!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark)r.classList.add("dark");else r.classList.remove("dark");r.style.colorScheme=dark?"dark":"light";var fk=${JSON.stringify(FONT_SIZE_STORAGE_KEY)};var scales=${JSON.stringify(FONT_SIZE_SCALES)};var fs=localStorage.getItem(fk)||"medium";if(!scales[fs])fs="medium";r.dataset.fontSize=fs;var s=scales[fs];var zoomOk=typeof CSS!=="undefined"&&CSS.supports&&CSS.supports("zoom","1.1");if(zoomOk){r.style.zoom=String(s);r.style.removeProperty("font-size");}else{r.style.removeProperty("zoom");r.style.fontSize=(s*100)+"%";}}catch(e){}})();`;

/** @deprecated Use UI_PREFS_INIT_SCRIPT */
export const THEME_INIT_SCRIPT = UI_PREFS_INIT_SCRIPT;
