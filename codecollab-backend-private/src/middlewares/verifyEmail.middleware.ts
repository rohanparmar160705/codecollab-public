// src/middlewares/verifyEmail.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
import prisma from "../config/prisma";

export const verifyEmailMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new AppError("Unauthorized: User not found in request.", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user?.emailVerified) {
      throw new AppError(
        "Please verify your email address before continuing.",
        403
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};
