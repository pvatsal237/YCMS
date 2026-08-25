import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/lib/authorization";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Community meetups, event registration, check-in, and guidance for international youth.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
