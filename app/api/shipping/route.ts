import mongoose from "mongoose";
import { NextRequest } from "next/server";
import Address from "@/model/Address";
import { requireUser, ok, fail } from "@/lib/loyalty/api";
import { getAvailableShippingMethods, InvalidShippingDestinationError } from "@/lib/shipping";
import { getStoreShippingSettings } from "@/lib/shippingSettings";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const addressId = req.nextUrl.searchParams.get("addressId") || "";
  if (!mongoose.isValidObjectId(addressId)) return fail("شناسه آدرس معتبر نیست.", 400);

  const address = await Address.findOne({ _id: addressId, userId: auth.userId }).lean();
  if (!address) return fail("آدرس انتخابی یافت نشد.", 404);

  try {
    const settings = await getStoreShippingSettings();
    const options = getAvailableShippingMethods(address, settings);
    if (options.length === 0) return fail("برای این آدرس روش ارسال فعالی وجود ندارد.", 422);
    return ok({
      destination: { province: address.province, city: address.city },
      options,
    });
  } catch (error) {
    if (error instanceof InvalidShippingDestinationError) return fail(error.message, 422);
    throw error;
  }
}
