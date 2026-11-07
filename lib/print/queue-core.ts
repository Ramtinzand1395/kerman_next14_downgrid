export type PrintJobState = { status?: string | null };

export type PrintAckRepository = {
  completePending: (
    jobId: string,
    consumerId: string,
  ) => Promise<PrintJobState | null>;
  findOwned: (
    jobId: string,
    consumerId: string,
  ) => Promise<PrintJobState | null>;
};

export type PrintAckResult =
  | { state: "completed"; alreadyProcessed: false }
  | { state: "completed"; alreadyProcessed: true }
  | { state: "not-found"; alreadyProcessed: false };

export async function acknowledgePrintJobCore(
  jobId: string,
  consumerId: string,
  repository: PrintAckRepository,
): Promise<PrintAckResult> {
  const completed = await repository.completePending(jobId, consumerId);
  if (completed) return { state: "completed", alreadyProcessed: false };

  const existing = await repository.findOwned(jobId, consumerId);
  if (existing?.status === "completed") {
    return { state: "completed", alreadyProcessed: true };
  }

  return { state: "not-found", alreadyProcessed: false };
}
