import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./sync.pull.service.js";

describe("pull cursor", () => {
  it("round-trips txid, seq and issue time", () => {
    const issued = new Date("2026-11-15T10:00:00.000Z");
    const cursor = encodeCursor(123456789012n, 42n, issued);
    expect(cursor).toBe(`v1.123456789012.42.${issued.getTime()}`);
    expect(decodeCursor(cursor)).toEqual({ txid: 123456789012n, seq: 42n, issuedAt: issued.getTime() });
  });

  it.each(["", "abc", "v2.1.1.1", "v1.1.1", "v1.-1.1.1", "v1.1.1.x", "v1.1.1.1.1"])("rejects %j with 400", (bad) => {
    expect(() => decodeCursor(bad)).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
