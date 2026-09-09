import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/auth/login",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
