import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";
import { error } from "../utils/response";

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let appErr: AppError;
  // Handle known AppErrors
  if (err instanceof AppError) {
    appErr = err;
  } else {
    const status = (err as any).statusCode || 500;
    appErr = new AppError(err.message || "Internal server error", status);
  }

  logger.error(`[Error] ${appErr.message} | ${req.method} ${req.originalUrl}`);

  // hide details in production
  const msg =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : appErr.message;

  return error(res, msg, appErr.statusCode, appErr.details);
}
