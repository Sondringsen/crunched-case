import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Crunched",
  description: "Excel AI Agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
