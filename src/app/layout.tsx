import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import QueryProvider from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "GradeAI — Teacher-Reviewed Homework Grading",
  description:
    "An early MVP for importing homework, generating rubric-based draft grades, reviewing feedback, and tracking student performance.",
  keywords: [
    "AI grading",
    "homework grader",
    "student analytics",
    "education technology",
    "coaching institute",
    "teacher tools",
    "automated grading",
  ],
  applicationName: "GradeAI",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "GradeAI",
    title: "GradeAI — Teacher-Reviewed Homework Grading",
    description:
      "Import homework, generate rubric-based draft grades, review feedback, and track student performance.",
  },
  twitter: {
    card: "summary",
    title: "GradeAI — Teacher-Reviewed Homework Grading",
    description:
      "Import homework, generate rubric-based draft grades, review feedback, and track student performance.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider telemetry={false}>
      <html lang="en" data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
        <body>
          <ThemeProvider>
            <QueryProvider>
              <ToastProvider>{children}</ToastProvider>
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
