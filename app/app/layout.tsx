import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LayoutProvider } from "./components/LayoutProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CKB Pokemon NFT Collection",
  description: "Pokemon NFT collection platform on CKB blockchain with PokePoints and smart contracts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-yellow-400 min-h-screen`}
      >
        <LayoutProvider>
          {children}
        </LayoutProvider>
      </body>
    </html>
  );
}
