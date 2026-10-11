import type { Metadata } from "next";
import LandingHome from "./components/landing/LandingHome";
import { getLandingData } from "@/lib/landing-data";
import { getAppointmentSettings } from "@/lib/appointments/settings";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const [data, appointmentSettings] = await Promise.all([
    getLandingData(),
    getAppointmentSettings(),
  ]);

  return (
    <LandingHome
      data={data}
      courierEnabled={Boolean(appointmentSettings.courierEnabled)}
    />
  );
}
