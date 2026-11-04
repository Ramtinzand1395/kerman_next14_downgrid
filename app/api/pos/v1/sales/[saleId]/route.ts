import dbConnect from "@/lib/mongodb";
import { authenticatePosRequest } from "@/lib/pos/auth";
import {
  handlePosSaleLookupRequest,
  type PosSaleLookupReceipt,
} from "@/lib/pos/sales-lookup-core";
import PosSale from "@/model/PosSale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { saleId: string } },
) {
  return handlePosSaleLookupRequest(request, params.saleId, {
    authenticate: (incomingRequest) =>
      authenticatePosRequest(incomingRequest, ["sales"]),
    async findSale(deviceId, saleId): Promise<PosSaleLookupReceipt | null> {
      await dbConnect();
      const sale = await PosSale.findOne({ deviceId, saleId })
        .select(
          "saleId siteSaleId invoiceNumber soldAtUtc syncedAtUtc finalAmountToman syncStatus reviewReasons",
        )
        .lean();
      if (!sale) return null;
      return {
        saleId: String(sale.saleId),
        siteSaleId: String(sale.siteSaleId),
        invoiceNumber: String(sale.invoiceNumber),
        soldAtUtc: new Date(sale.soldAtUtc).toISOString(),
        syncedAtUtc: new Date(sale.syncedAtUtc).toISOString(),
        finalAmountToman: Number(sale.finalAmountToman),
        syncStatus: sale.syncStatus,
        reviewReasons: [...(sale.reviewReasons ?? [])],
      };
    },
  });
}
