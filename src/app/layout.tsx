import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/ClientWrapper";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Audit Program Manager",
  description: "Dynamic Hierarchical Audit Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-[var(--background)]`}>
        <ThemeProvider>
          <Shell>
            {children}
          </Shell>
        </ThemeProvider>
      </body>
    </html>
  );
}
