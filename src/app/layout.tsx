import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getCurrentUser, isAdminUser } from "@/lib/auth/server";
import "./globals.css";
import "./theme.css";

export const metadata: Metadata = {
  title: "QueryCite",
  description: "Find why AI search is ignoring your brand with an AI Visibility Audit and AEO/GEO fix generator.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const isAdmin = await isAdminUser(user);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Header user={user ? { email: user.email, name: user.name, isAdmin } : null} />
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
