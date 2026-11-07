import dbConnect from "@/lib/mongodb";
import PrintQueue from "@/model/PrintQueue";
import type { PrintPayload } from "./payload";
import {
  acknowledgePrintJobCore,
  type PrintAckRepository,
} from "./queue-core";

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

  const available = await PrintQueue.find({
    assignedConsumerId: null,
    status: { $in: [null, "pending"] },
  })
    .select("_id")
    .sort({ createdAt: 1, _id: 1 })
    .limit(CLAIM_BATCH_SIZE)
    .lean();

  if (available.length > 0) {
    await PrintQueue.updateMany(
      {
        _id: { $in: available.map((job) => job._id) },
        assignedConsumerId: null,
        status: { $in: [null, "pending"] },
      },
      {
        $set: {
          assignedConsumerId: consumerId,
          status: "pending",
          assignedAt: new Date(),
        },
      },
    );
  }

  return PrintQueue.find({ assignedConsumerId: consumerId, status: "pending" })
    .select("_id payload createdAt updatedAt")
    .sort({ createdAt: 1, _id: 1 })
    .limit(CLAIM_BATCH_SIZE)
    .lean();
}

const mongoAckRepository: PrintAckRepository = {
  async completePending(jobId, consumerId) {
    return PrintQueue.findOneAndUpdate(
      { _id: jobId, assignedConsumerId: consumerId, status: "pending" },
      { $set: { status: "completed", completedAt: new Date() } },
      { new: true },
    )
      .select("status")
      .lean();
  },
  async findOwned(jobId, consumerId) {
    return PrintQueue.findOne({ _id: jobId, assignedConsumerId: consumerId })
      .select("status")
      .lean();
  },
};

export async function acknowledgePrintJob(jobId: string, consumerId: string) {
  await dbConnect();
  return acknowledgePrintJobCore(jobId, consumerId, mongoAckRepository);
}
