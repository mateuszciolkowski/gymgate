import type { Response } from "express";

export interface MockResponse extends Response {
  statusCode: number;
  body: unknown;
}

/**
 * Minimalny, łańcuchowalny mock Express Response do testów kontrolerów.
 * Zapisuje ostatni statusCode oraz body (z json/send).
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
