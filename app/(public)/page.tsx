import type { Metadata } from "next";
import LandingHome from "./components/landing/LandingHome";
import { getLandingData } from "@/lib/landing-data";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getLandingData();

  return <LandingHome data={data} />;
}
