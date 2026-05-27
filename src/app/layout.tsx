import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import QueryProvider from "@/components/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "GradeAI — AI-Powered Homework Grader & Student Analytics",
  description:
    "Grade smarter, teach more. AI-powered homework grading that saves teachers 10+ hours every week with intelligent feedback, rubric-based scoring, and student performance analytics.",
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
    <ClerkProvider>
      <html lang="en" data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
        <body>
          <QueryProvider>{children}</QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
