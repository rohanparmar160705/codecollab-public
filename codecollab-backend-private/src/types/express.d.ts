import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: (User & { email?: string }) | { id: string; email?: string };
    }
  }
}

export {};
