import { z } from "zod";

const MAX_PRINT_PAYLOAD_BYTES = 64 * 1024;

const boundedText = (maximum: number) => z.string().max(maximum);
const boundedNumber = z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER);

const gameSchema = z
  .object({
    name: boundedText(300),
    sizeGB: boundedNumber,
    price: boundedNumber,
    storage: boundedText(100),
  })
  .passthrough();

const printPayloadSchema = z
  .object({
    receiptType: boundedText(100),
    fullName: boundedText(300),
    mobile: boundedText(50),
    date: boundedText(100),
    games: z.array(gameSchema).max(200),
    price: boundedNumber,
    totalSizeGB: boundedNumber,
    customerDescription: boundedText(4_000),
  })
  .passthrough();

export type PrintPayload = z.infer<typeof printPayloadSchema>;

export type PrintPayloadParseResult =
  | { ok: true; payload: PrintPayload }
  | {
      ok: false;
      status: 400 | 413;
      code: "INVALID_PRINT_PAYLOAD" | "PRINT_PAYLOAD_TOO_LARGE";
    };

export async function parsePrintPayloadRequest(
  request: Request,
): Promise<PrintPayloadParseResult> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_PRINT_PAYLOAD_BYTES) {
    return { ok: false, status: 413, code: "PRINT_PAYLOAD_TOO_LARGE" };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, status: 400, code: "INVALID_PRINT_PAYLOAD" };
  }

  if (Buffer.byteLength(raw, "utf8") > MAX_PRINT_PAYLOAD_BYTES) {
    return { ok: false, status: 413, code: "PRINT_PAYLOAD_TOO_LARGE" };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, code: "INVALID_PRINT_PAYLOAD" };
  }

  const parsed = printPayloadSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, status: 400, code: "INVALID_PRINT_PAYLOAD" };
  }
  return { ok: true, payload: parsed.data };
}
