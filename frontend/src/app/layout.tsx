import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crunched",
  description: "Excel AI Agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
