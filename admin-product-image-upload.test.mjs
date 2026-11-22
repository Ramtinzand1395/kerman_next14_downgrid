import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PRODUCT_IMAGE_BYTES,
  validateProductImage,
  uploadCloudinaryImage,
} from "./helpers/uploadCloudinaryImage.ts";

test("product image upload accepts supported types and rejects invalid files", () => {
  assert.doesNotThrow(() => validateProductImage(new File(["ok"], "image.webp", { type: "image/webp" })));
  assert.throws(
    () => validateProductImage(new File(["svg"], "image.svg", { type: "image/svg+xml" })),
    /فرمت.*پشتیبانی/,
  );
  assert.throws(
    () => validateProductImage(new File([], "empty.png", { type: "image/png" })),
    /خالی/,
  );
  assert.throws(
    () => validateProductImage(new File([new Uint8Array(MAX_PRODUCT_IMAGE_BYTES + 1)], "huge.jpg", { type: "image/jpeg" })),
    /۱۰ مگابایت/,
  );
});

test("product image upload explains permission and size failures", async () => {
  const originalFetch = globalThis.fetch;
  const file = new File(["ok"], "sample.webp", { type: "image/webp" });
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "سرور" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
    await assert.rejects(uploadCloudinaryImage(file), /۱۰ مگابایت/);
    globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });
    await assert.rejects(uploadCloudinaryImage(file), /نشست مدیریت/);
    globalThis.fetch = async () => { throw new Error("ECONNRESET"); };
    await assert.rejects(uploadCloudinaryImage(file), /ارتباط با سرور/);
    globalThis.fetch = async () => new Response(JSON.stringify({ invalid: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    await assert.rejects(uploadCloudinaryImage(file), /پاسخ معتبر/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("product image upload accepts a secure returned image URL", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ url: "https://res.cloudinary.com/example/image/upload/photo.webp" }), {
      status: 201, headers: { "Content-Type": "application/json" },
    });
    const url = await uploadCloudinaryImage(new File(["ok"], "sample.webp", { type: "image/webp" }));
    assert.equal(url, "https://res.cloudinary.com/example/image/upload/photo.webp");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
