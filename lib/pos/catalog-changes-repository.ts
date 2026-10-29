import dbConnect from "@/lib/mongodb";
import PosCatalogChange from "@/model/PosCatalogChange";
import PosCatalogCounter from "@/model/PosCatalogCounter";
import {
  createCatalogChangesPage,
  POS_CATALOG_COUNTER_KEY,
  type CatalogChangeItem,
  type CatalogChangesPageResult,
  type CatalogChangesPagination,
} from "./catalog-changes";

function mapEvent(event: Record<string, any>): CatalogChangeItem {
  return {
    sequence: Number(event.sequence),
    eventId: String(event._id),
    productId: String(event.productId),
    eventType: event.eventType,
    changes: event.changes,
    action: event.action,
    product: event.snapshot ?? null,
    catalogRevision: Number(event.catalogRevision ?? 0),
    inventoryVersion: Number(event.inventoryVersion ?? 0),
    occurredAtUtc: new Date(event.occurredAt).toISOString(),
  };
}
export async function getCatalogChangesPage(
  pagination: CatalogChangesPagination,
): Promise<CatalogChangesPageResult> {
  await dbConnect();

  const [counter, earliest] = await Promise.all([
    PosCatalogCounter.findOne({ key: POS_CATALOG_COUNTER_KEY })
      .select("value")
      .lean(),
    PosCatalogChange.findOne({})
      .select("sequence")
      .sort({ sequence: 1 })
      .lean(),
  ]);
  const highWater = Number(counter?.value ?? 0);
  const earliestSequence = earliest ? Number(earliest.sequence) : null;
  const availability = createCatalogChangesPage(
    [],
    pagination,
    highWater,
    earliestSequence,
  );
  if (!availability.ok) return availability;

  const documents = await PosCatalogChange.find({
    sequence: { $gt: pagination.afterSequence },
  })
    .select(
      "_id sequence productId eventType changes action snapshot catalogRevision inventoryVersion occurredAt",
    )
    .sort({ sequence: 1 })
    .limit(pagination.limit + 1)
    .lean();

  return createCatalogChangesPage(
    documents.map((event) => mapEvent(event as any)),
    pagination,
    highWater,
    earliestSequence,
  );
}
