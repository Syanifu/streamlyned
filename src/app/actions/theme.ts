"use server";

import { cookies } from "next/headers";

/**
 * Saves the selected theme in cookies
 */
export async function saveThemeAction(theme: "light" | "dark") {
  const cookieStore = await cookies();
  cookieStore.set("streamlyned_theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return { success: true };
}
