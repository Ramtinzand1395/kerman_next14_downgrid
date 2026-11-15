import { NextResponse } from "next/server";
import { z } from "zod";
import Address from "@/model/Address";
import GameList from "@/model/GameList";
import VisitReward from "@/model/VisitReward";
import { requireUser } from "@/lib/loyalty/api";
import { computeAppointmentPricing } from "@/lib/appointments/policy";
import { findCourierRegion, getAppointmentSettings } from "@/lib/appointments/settings";
import {
  catalogPlatformAliases, installationCatalog, installationGameTotal, installationPlatforms,
  INSTALLATION_GAME_FIELDS, isCopyCourierInstallation, resolveInstallationGames,
  type GameCatalogDocument, type InstallationGame,
} from "@/lib/appointments/games";
import { installationGameRefSchema } from "@/validations/appointment.validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const objectIdRegex = /^[a-f\d]{24}$/i;

const courierPreviewSchema = z.object({
  addressId: z.string().regex(objectIdRegex, "شناسه آدرس نامعتبر است"),
  serviceType: z.enum(["game_install", "repair"]).optional(),
  device: z.string().trim().max(60).optional(),
  installationType: z.enum(["account", "copy"]).nullable().optional(),
  selectedGames: z.array(installationGameRefSchema).max(100).default([]),
  selectedRewardId: z.string().regex(objectIdRegex).nullable().optional(),
});

/**
 * POST /api/profile/appointments/courier-preview
 *
 * Returns server-authoritative eligibility and pricing for courier service
 * at a given address. The Frontend MUST NOT make eligibility decisions
 * itself — it should call this endpoint and render what the server says.
 *
 * This endpoint does NOT create any state. It is purely informational (UX).
 * createAppointment() re-validates everything independently.
 */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = courierPreviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "اطلاعات نامعتبر است." },
      { status: 422 },
    );
  }

  const { addressId, serviceType, device, installationType, selectedRewardId, selectedGames } = parsed.data;

  // ── 1. Load settings ──────────────────────────────────────────────────────
  const settings = await getAppointmentSettings();

  if (!settings.courierEnabled) {
    return NextResponse.json({
      eligible: false,
      courierEnabled: false,
      reason: "COURIER_DISABLED",
    });
  }

  // ── 2. Verify address ownership ───────────────────────────────────────────
  const addressDoc = await Address.findOne({
    _id: addressId,
    userId: auth.userId,
  }).lean();

  if (!addressDoc) {
    return NextResponse.json(
      { error: "آدرس انتخاب‌شده یافت نشد یا متعلق به شما نیست." },
      { status: 404 },
    );
  }

  // ── 3. Region matching (server-side, authoritative) ───────────────────────
  const regions = (settings.courierRegions || []) as Array<{
    id: string;
    title: string;
    city: string;
    shippingCost: number;
    isActive: boolean;
  }>;

  const region = findCourierRegion(addressDoc.city, regions);
  if (!region) {
    return NextResponse.json({
      eligible: false,
      courierEnabled: true,
      reason: "OUT_OF_REGION",
    });
  }

  // ── 4. Compute shipping costs from settings (no client-supplied values) ───
  const pickupShippingCost = Number(region.shippingCost);
  const returnShippingCost =
    settings.courierRoundTripMultiplier > 1 ? pickupShippingCost : 0;
  const shippingBaseAmount = pickupShippingCost + returnShippingCost;
  let quotedGames: InstallationGame[] | undefined;
  if (device && selectedGames.length && isCopyCourierInstallation({
    fulfillment: "courier", serviceType, device, installationType,
  })) {
    const platforms = installationPlatforms(device, installationType);
    const catalog = await GameList.find({ platform: { $in: catalogPlatformAliases(platforms) } })
      .select(INSTALLATION_GAME_FIELDS).lean() as GameCatalogDocument[];
    try {
      quotedGames = resolveInstallationGames(selectedGames, installationCatalog(catalog, platforms));
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 422 });
    }
  }

  // ── 5. Resolve optional reward ────────────────────────────────────────────
  let rewardDetails: Parameters<typeof computeAppointmentPricing>[0]["reward"] = null;
  let rewardPreview: { applicable: boolean; type: string } | undefined;

  if (selectedRewardId) {
    const now = new Date();
    const rewardDoc = await VisitReward.findOne({
      _id: selectedRewardId,
      user: auth.userId,
      status: "available",
      expiresAt: { $gt: now },
    }).lean();

    if (rewardDoc) {
      const snap = rewardDoc.snapshot as {
        eligibleServices?: string[];
        reward?: {
          type: "fixed" | "percent" | "free_game" | "free_shipping";
          value: number;
          maxDiscountAmount?: number | null;
          minAmount?: number;
          maxShippingCost?: number | null;
          shippingRegion?: string;
          eligibleDevices?: string[];
          eligibleInstallationTypes?: string[];
        };
      };

      const reward = snap.reward;
      const eligibleService = !serviceType || snap.eligibleServices?.includes(serviceType);
      const eligibleSelection = reward?.type === "free_shipping"
        ? !reward.shippingRegion || reward.shippingRegion.trim().toLowerCase() === addressDoc.city.trim().toLowerCase()
        : (!reward?.eligibleDevices?.length || Boolean(device && reward.eligibleDevices.includes(device))) &&
          (!reward?.eligibleInstallationTypes?.length || Boolean(installationType && reward.eligibleInstallationTypes.includes(installationType)));

      if (eligibleService && eligibleSelection && snap.reward) {
        rewardDetails = snap.reward;
        rewardPreview = {
          applicable: true,
          type: snap.reward.type,
        };
      } else {
        rewardPreview = { applicable: false, type: snap.reward?.type ?? "" };
      }
    }
  }

  // ── 6. Compute pricing using the shared policy function ───────────────────
  const pricing = computeAppointmentPricing({
    fulfillment: "courier",
    serviceType: serviceType ?? "repair",
    serviceBaseAmount: quotedGames ? installationGameTotal(quotedGames) : null,
    shippingBaseAmount,
    reward: rewardDetails,
    deliveryCity: addressDoc.city,
  });

  // ── 7. Build response ─────────────────────────────────────────────────────
  const response: Record<string, unknown> = {
    eligible: true,
    courierEnabled: true,
    addressId: String(addressDoc._id),
    region: {
      id: region.id,
      title: region.title,
      city: region.city,
    },
    pricing: {
      ...pricing,
      pickupShippingCost,
      returnShippingCost,
    },
    ...(quotedGames && { selectedGames: quotedGames }),
  };

  if (rewardPreview) {
    response.reward = rewardPreview;
  }

  return NextResponse.json(response);
}
