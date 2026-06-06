import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DevBanner from "@/components/dev-banner";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";

import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Streamlyned — Calm AI-Native Project Management",
  description: "A calm, AI-native project management platform designed to reduce work, communication, and cognitive load.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  
  const cookieStore = await cookies();
  const theme = cookieStore.get("streamlyned_theme")?.value === "dark" ? "dark" : "light";

  return (
    <html lang="en" className={`${theme === "dark" ? "dark" : ""} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {children}
        <Toaster position="bottom-right" />
        <DevBanner
          currentEmail={session?.user.email}
          currentRole={session?.role}
          currentWorkspaceSlug={session?.workspace.slug}
        />
      </body>
    </html>
  );
}
