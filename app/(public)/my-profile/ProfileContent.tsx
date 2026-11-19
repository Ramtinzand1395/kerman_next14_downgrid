"use client";

import dynamic from "next/dynamic";
import { PageLoading } from "@/app/components/loading/LoadingSystem";

const loading = () => <PageLoading />;
const Profile = dynamic(() => import("./Profile"), { loading });
const Favorites = dynamic(() => import("./Favorites"), { loading });
const MyAddresses = dynamic(() => import("./MyAddresses"), { loading });
const MyComments = dynamic(() => import("./MyComments"), { loading });
const MyOrdersTabs = dynamic(() => import("./MyOrdersTabs"), { loading });
const GameOrderSelector = dynamic(() => import("./GameOrderSelector"), { loading });
const MyWallet = dynamic(() => import("./MyWallet"), { loading });
const MyLoyalty = dynamic(() => import("./MyLoyalty"), { loading });
const SpinWheel = dynamic(() => import("./SpinWheel"), { loading });
const ConversationCenter = dynamic(
  () => import("@/app/components/notifications/ConversationCenter"),
  { loading },
);

export default function ProfileContent({
  activeStep,
  initialFulfillment,
}: {
  activeStep: number;
  initialFulfillment: "courier" | "in_store" | null;
}) {
  switch (activeStep) {
    case 1: return <Profile />;
    case 2: return <Favorites />;
    case 3: return <MyAddresses />;
    case 4: return <MyComments />;
    case 5: return <MyOrdersTabs />;
    case 6: return <GameOrderSelector initialFulfillment={initialFulfillment} />;
    case 8: return <MyWallet />;
    case 9: return <MyLoyalty />;
    case 10: return <SpinWheel />;
    case 11: return <ConversationCenter />;
    default: return null;
  }
}
