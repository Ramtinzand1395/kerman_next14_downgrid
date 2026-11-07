import dbConnect from "@/lib/mongodb";
import PrintQueue from "@/model/PrintQueue";
import type { PrintPayload } from "./payload";
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
