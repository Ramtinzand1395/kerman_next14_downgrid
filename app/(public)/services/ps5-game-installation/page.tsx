import GameInstallationPage, { gameInstallationMetadata } from "../_components/GameInstallationPage";

export const dynamic = "force-dynamic";
export const metadata = gameInstallationMetadata("ps5");

export default function Ps5GameInstallationPage() {
  return <GameInstallationPage device="ps5" />;
}
