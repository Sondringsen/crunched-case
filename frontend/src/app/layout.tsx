import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MyApp",
  description: "Take-home project",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
