import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import { BSON, type Db } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

function toExtendedJson(value: unknown) {
  return BSON.EJSON.stringify(value, { relaxed: false });
}

async function* createBackupStream(db: Db) {
  const createdAt = new Date().toISOString();
  const collections = (
    await db.listCollections({}, { nameOnly: false }).toArray()
  )
    .filter((collection) => collection.type === "collection")
    .sort((a, b) => a.name.localeCompare(b.name));

  yield `{"format":"kermanatari-mongodb-backup","version":1,"createdAt":${JSON.stringify(
    createdAt
  )},"database":${JSON.stringify(db.databaseName)},"collections":[`;

  for (let collectionIndex = 0; collectionIndex < collections.length; collectionIndex += 1) {
    const collectionInfo = collections[collectionIndex];
    const collection = db.collection(collectionInfo.name);
    const indexes = await collection.indexes();

    if (collectionIndex > 0) yield ",";

    yield `{"name":${JSON.stringify(collectionInfo.name)},"options":${toExtendedJson(
      collectionInfo.options ?? {}
    )},"indexes":${toExtendedJson(indexes)},"documents":[`;

    const cursor = collection.find({}).batchSize(250);
    let documentIndex = 0;

    try {
      for await (const document of cursor) {
        if (documentIndex > 0) yield ",";
        yield toExtendedJson(document);
        documentIndex += 1;
      }
    } finally {
      await cursor.close();
    }

    yield "]}";
  }

  yield "]}";
}

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");

  if (!origin || origin !== requestOrigin) {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const mongoose = await dbConnect();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("اتصال به دیتابیس در دسترس نیست");
    }

    const datePart = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `kermanatari-backup-${datePart}.json`;
    const nodeStream = Readable.from(createBackupStream(db));
    const body = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return new Response(body, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Database backup failed:", error);
    return NextResponse.json(
      { error: "خطا در تهیه بک‌آپ دیتابیس" },
      { status: 500 }
    );
  }
}
