import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeGamePlatform,
  parseGameInput,
  parseGameItemId,
} from "./lib/gameListAdmin.ts";

test("normalizes only supported game platforms", () => {
  assert.equal(normalizeGamePlatform(" PS5 "), "ps5");
  assert.equal(normalizeGamePlatform("ps5Copy"), "ps5Copy");
  assert.equal(normalizeGamePlatform("switch"), null);
  assert.equal(normalizeGamePlatform(null), null);
});

test("parses a valid game and preserves explicit zero values", () => {
  assert.deepEqual(
    parseGameInput({
      platform: "ps5",
      name: "  Astro Bot  ",
      size: 0,
      price: "0",
      storage: " SSD ",
    }),
    {
      platform: "ps5",
      name: "Astro Bot",
      size: 0,
      price: 0,
      storage: "SSD",
    },
  );
});

test("rejects missing names, negative numbers and invalid object ids", () => {
  assert.throws(
    () => parseGameInput({ platform: "ps5", name: "" }),
    /نام بازی الزامی/,
  );
  assert.throws(
    () => parseGameInput({ platform: "ps5", name: "Game", price: -1 }),
    /نامنفی/,
  );
  assert.throws(() => parseGameItemId("not-an-id"), /شناسه بازی معتبر نیست/);
});

test("accepts a valid MongoDB item id", () => {
  const id = "6a68cc06c1b8d6060ad3aed6";
  assert.equal(parseGameItemId(id), id);
});
