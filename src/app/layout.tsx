import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import DevBanner from "@/components/dev-banner";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";

import { Toaster } from "react-hot-toast";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Streamlyned — Calm AI-Native Project Management",
  description: "A calm, AI-native project management platform designed to reduce work, communication, and cognitive load.",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  
  const cookieStore = await cookies();
  const theme = cookieStore.get("streamlyned_theme")?.value === "dark" ? "dark" : "light";
  const colorBg = cookieStore.get("streamlyned_color")?.value || "";

  return (
    <html
      lang="en"
      className={`${theme === "dark" ? "dark" : ""} ${dmSans.variable} h-full antialiased`}
      {...(colorBg ? { "data-bg": colorBg } : {})}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {children}
        <Toaster position="bottom-right" />
        {process.env.NODE_ENV === "development" && (
          <DevBanner
            currentEmail={session?.user.email}
            currentRole={session?.role}
            currentWorkspaceSlug={session?.workspace.slug}
          />
        )}
      </body>
    </html>
  );
}
