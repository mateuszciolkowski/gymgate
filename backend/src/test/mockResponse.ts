import type { Response } from "express";

export interface MockResponse extends Response {
  statusCode: number;
  body: unknown;
}

/**
 * Minimal, chainable mock of the Express Response for controller tests.
 * Records the last statusCode and body (from json/send).
 */
export const createMockRes = (): MockResponse => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    send(payload?: unknown) {
      this.body = payload;
      return this;
    },
    header() {
      return this;
    },
  };

  return res as unknown as MockResponse;
};
