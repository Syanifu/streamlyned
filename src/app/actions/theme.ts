"use server";

import { cookies } from "next/headers";

export async function saveThemeAction(theme: "light" | "dark") {
  const cookieStore = await cookies();
  cookieStore.set("streamlyned_theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { success: true };
}

export async function saveColorThemeAction(color: string) {
  const cookieStore = await cookies();
  if (color) {
    cookieStore.set("streamlyned_color", color, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    cookieStore.delete("streamlyned_color");
  }
  return { success: true };
}
