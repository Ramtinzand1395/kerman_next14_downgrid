import GameInstallationPage, { gameInstallationMetadata } from "../_components/GameInstallationPage";

export const dynamic = "force-dynamic";
export const metadata = gameInstallationMetadata("ps4");

export default function Ps4GameInstallationPage() {
  return <GameInstallationPage device="ps4" />;
}
