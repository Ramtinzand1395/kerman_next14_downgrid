import { NextResponse } from "next/server";
import { z } from "zod";
import Address from "@/model/Address";
import VisitReward from "@/model/VisitReward";
import { requireUser } from "@/lib/loyalty/api";
import { computeAppointmentPricing } from "@/lib/appointments/policy";
import { findCourierRegion, getAppointmentSettings } from "@/lib/appointments/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const objectIdRegex = /^[a-f\d]{24}$/i;

const courierPreviewSchema = z.object({
  addressId: z.string().regex(objectIdRegex, "شناسه آدرس نامعتبر است"),
  serviceType: z.enum(["game_install", "repair"]).optional(),
  device: z.string().trim().max(60).optional(),
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

  const { addressId, serviceType, selectedRewardId } = parsed.data;

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
        };
      };

      const eligible =
        !serviceType ||
        (snap.eligibleServices?.includes(serviceType) ?? false);

      if (eligible && snap.reward) {
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
    serviceBaseAmount: null,
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
      pickupShippingCost,
      returnShippingCost,
      shippingBaseAmount: pricing.shippingBaseAmount,
      shippingDiscountAmount: pricing.shippingDiscountAmount,
      shippingFinalAmount: pricing.shippingFinalAmount,
    },
  };

  if (rewardPreview) {
    response.reward = rewardPreview;
  }

  return NextResponse.json(response);
}
