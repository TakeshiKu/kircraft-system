import { ErrorCodes } from "./error-codes.js";

type Code = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  readonly code: Code;
  readonly httpStatus: number;
  readonly details: Record<string, unknown>;

  constructor(
    code: Code,
    httpStatus: number,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}
