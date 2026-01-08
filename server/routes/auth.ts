import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { verifyPassword, generateSessionToken, getSessionExpiry } from "../auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth";

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);

    const user = await storage.getUserByUsername(username);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiry();

    await storage.createSession({
      id: sessionToken,
      userId: user.id,
      expiresAt,
    });
    await storage.updateUserLastLogin(user.id);

    res.cookie("wf_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
    });

    const { password: _password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.wf_session as string | undefined;

    if (sessionId) {
      await storage.deleteSession(sessionId);
    }

    res.clearCookie("wf_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.json({ success: true });
  })
);

router.get(
  "/me",
  // RBAC postponed - make auth optional for now
  asyncHandler(async (req, res) => {
    // Try to get authenticated user, but fall back to default if not authenticated
    try {
      const sessionId = req.cookies?.wf_session as string | undefined;
      if (sessionId) {
        const sessionWithUser = await storage.getSessionWithUser(sessionId);
        if (sessionWithUser) {
          const { password: _password, ...userWithoutPassword } = sessionWithUser.user;
          return res.json({ user: userWithoutPassword });
        }
      }
    } catch (error) {
      // Ignore auth errors, fall through to default user
    }
    
    // Return default user when not authenticated (RBAC postponed)
    res.json({
      user: {
        id: "default",
        username: "user",
        fullName: "Default User",
        team: "admin",
        email: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
      },
    });
  })
);

export default router;
