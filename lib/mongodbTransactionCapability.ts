import type { Connection } from "mongoose";

export type MongoTransactionTopology =
  | "replica-set"
  | "sharded"
  | "standalone"
  | "unknown";

export type MongoTransactionCapability = {
  status: "VERIFIED" | "NOT VERIFIED" | "UNSUPPORTED";
  topology: MongoTransactionTopology;
  reason: string;
};

export async function inspectMongoTransactionTopology(
  connection: Connection,
): Promise<MongoTransactionCapability> {
  if (!connection.db) {
    return {
      status: "NOT VERIFIED",
      topology: "unknown",
      reason: "MongoDB connection is not ready.",
    };
  }

  let hello: Record<string, any>;
  try {
    hello = await connection.db.admin().command({ hello: 1 });
  } catch (error) {
    return {
      status: "NOT VERIFIED",
      topology: "unknown",
      reason:
        error instanceof Error
          ? error.message
          : "MongoDB topology inspection failed.",
    };
  }
  if (hello.msg === "isdbgrid") {
    return {
      status: "NOT VERIFIED",
      topology: "sharded",
      reason: "Topology supports transactions; an explicit probe is still required.",
    };
  }
  if (typeof hello.setName === "string" && hello.setName) {
    return {
      status: "NOT VERIFIED",
      topology: "replica-set",
      reason: "Topology supports transactions; an explicit probe is still required.",
    };
  }

  return {
    status: "UNSUPPORTED",
    topology: "standalone",
    reason: "Standalone MongoDB does not support the required transactions.",
  };
}

export async function probeMongoTransactions(
  connection: Connection,
): Promise<MongoTransactionCapability> {
  const topology = await inspectMongoTransactionTopology(connection);
  if (topology.status === "UNSUPPORTED") return topology;
  if (topology.topology === "unknown") return topology;

  const session = await connection.startSession();
  try {
    session.startTransaction();
    await connection
      .collection("products")
      .findOne({}, { projection: { _id: 1 }, session });
    await session.abortTransaction();
    return {
      status: "VERIFIED",
      topology: topology.topology,
      reason: "A read-only transaction started and was explicitly aborted.",
    };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction().catch(() => undefined);
    }
    return {
      status: "NOT VERIFIED",
      topology: topology.topology,
      reason: error instanceof Error ? error.message : "Transaction probe failed.",
    };
  } finally {
    await session.endSession();
  }
}
