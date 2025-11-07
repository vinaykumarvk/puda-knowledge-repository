import type { NextFunction, Request, Response } from "express";
import type { User } from "@shared/schema";
import { storage } from "../storage";
import { asyncHandler } from "../utils/asyncHandler";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
    sessionId?: string;
  }
}

class UnauthorizedError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export type AuthenticatedRequest = Request & { user: User; sessionId: string };

const baseRequireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.cookies?.wf_session as string | undefined;

  if (!sessionId) {
    throw new UnauthorizedError("Not authenticated");
  }

  const sessionWithUser = await storage.getSessionWithUser(sessionId);

  if (!sessionWithUser) {
    throw new UnauthorizedError("Invalid or expired session");
  }

  req.user = sessionWithUser.user;
  req.sessionId = sessionId;

  next();
};

export const requireAuth = asyncHandler(baseRequireAuth);
