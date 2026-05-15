import type { Response } from "express";

export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(message, 400);
  }
}

export const sendError = (res: Response, error: unknown) => {
  if (error instanceof AppError) {
    return res
      .status(error.status)
      .json({ success: false, error: error.message });
  }

  console.error("Unhandled error:", error);
  return res
    .status(500)
    .json({ success: false, error: "Internal server error" });
};
