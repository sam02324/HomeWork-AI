import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import QueryProvider from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
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
