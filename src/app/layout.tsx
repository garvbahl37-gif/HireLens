import type { Metadata } from "next";
import { Archivo, Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

// The wide display face for marketing headlines: Archivo's width axis lets
// headings sit a little expanded, the way the reference's do.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HireLens — Know exactly why your resume gets rejected",
    template: "%s · HireLens",
  },
  description:
    "Upload your resume, paste the job description, and get a recruiter-grade scored review in seconds — then defend every claim on it in a voice mock interview that quotes your resume back at you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
