import dbConnect from "@/lib/mongodb";
import PrintQueue from "@/model/PrintQueue";
import { MAX_PRINT_PAYLOAD_BYTES, printPayloadSchema, type PrintPayload } from "./payload";
import {
  acknowledgeOwnedPrintJob,
  claimPrintJobs,
  listPrintRecoveryCandidates,
  resolvePrintJobRecovery,
  type PrintRecoveryAction,
  type PrintQueueCollection,
} from "./queue-store";

const CLAIM_BATCH_SIZE = 100;

export async function createPrintJob(
  payload: PrintPayload,
  createdBy: string,
) {
  await dbConnect();
  return PrintQueue.create({ payload, createdBy });
}

export async function ensureStoreOrderPrintJob(
  orderId: string,
  payload: PrintPayload,
  createdBy: string,
) {
  const validated = printPayloadSchema.parse(payload);
  if (Buffer.byteLength(JSON.stringify(validated), "utf8") > MAX_PRINT_PAYLOAD_BYTES) {
    throw new Error("Store order print payload exceeds the queue limit");
  }

  await dbConnect();
  try {
    // StoreOrder and PrintQueue use separate collections. The automatic receipt
    // can reuse the order ID, while manual reprints get their own job IDs.
    await PrintQueue.create({ _id: orderId, payload: validated, createdBy });
  } catch (error) {
    const failure = error as { code?: number; keyPattern?: { _id?: number } };
    if (failure?.code !== 11000 || failure.keyPattern?._id !== 1) throw error;
  }
}

export async function listPrintJobsForConsumer(consumerId: string) {
  await dbConnect();
  return claimPrintJobs(
    PrintQueue.collection as PrintQueueCollection,
    consumerId,
    CLAIM_BATCH_SIZE,
  );
}

export async function acknowledgePrintJob(jobId: string, consumerId: string) {
  await dbConnect();
  return acknowledgeOwnedPrintJob(
    PrintQueue.collection as PrintQueueCollection,
    jobId,
    consumerId,
  );
}

export async function getPrintRecoveryCandidates() {
  await dbConnect();
  return listPrintRecoveryCandidates(
    PrintQueue.collection as PrintQueueCollection,
  );
}

export async function recoverPrintJob(input: {
  jobId: string;
  expectedConsumerId: string;
  action: PrintRecoveryAction;
  reason: string;
  actorUserId: string;
}) {
  await dbConnect();
  return resolvePrintJobRecovery(
    PrintQueue.collection as PrintQueueCollection,
    input,
  );
}
