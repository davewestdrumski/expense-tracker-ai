import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared expense report",
  robots: { index: false, follow: false },
};

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
