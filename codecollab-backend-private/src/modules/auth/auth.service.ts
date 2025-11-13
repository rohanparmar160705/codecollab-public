// src/modules/auth/auth.service.ts
import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { hashPassword, comparePassword } from "../../utils/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { sendMail } from "../../utils/mailer";
import { generateToken } from "../../utils/token";
import { ENV } from "../../config/env";

export class AuthService {
  // ✅ Register
  static async register(username: string, email: string, password: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError("Email already registered", 400);

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, email, passwordHash: hashed },
    });

    const accessToken = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id });

    // Subscription snapshot (avoid separate /billing/active poll)
    const activeSub = await prisma.subscription.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { endDate: "desc" },
    });
    const subscription = activeSub
      ? { active: true, plan: activeSub.plan, endDate: activeSub.endDate }
      : { active: user.plan !== "FREE", plan: user.plan, endDate: null };

    return { user: { ...user, plan: user.plan }, subscription, accessToken, refreshToken };
  }

  // ✅ Login user
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new AppError("Invalid credentials", 401);

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new AppError("Invalid credentials", 401);

    const accessToken = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id });

    return { user, accessToken, refreshToken };
  }

  // ✅ Refresh token
  static async refresh(token: string) {
    try {
      const payload = verifyRefreshToken(token) as any;
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) throw new AppError("Invalid user", 401);

      const accessToken = signAccessToken({ userId: user.id });
      const refreshToken = signRefreshToken({ userId: user.id });

      // Optional: include subscription snapshot to keep client in sync without extra calls
      const activeSub = await prisma.subscription.findFirst({
        where: { userId: user.id, isActive: true },
        orderBy: { endDate: "desc" },
      });
      const subscription = activeSub
        ? { active: true, plan: activeSub.plan, endDate: activeSub.endDate }
        : { active: user.plan !== "FREE", plan: user.plan, endDate: null };

      return { accessToken, refreshToken, subscription };
    } catch {
      throw new AppError("Invalid or expired refresh token", 401);
    }
  }

  // ✅ Forgot password (send mail)
  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError("No account found with this email", 404);

    const resetToken = generateToken(32);
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const resetLink = `${ENV.CLIENT_RESET_URL}?token=${resetToken}`;

    await sendMail(
      email,
      "Password Reset - CodeCollab",
      `
      <h2>Hello ${user.username || "User"},</h2>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <a href="${resetLink}" style="color:#007bff">${resetLink}</a>
      <p><strong>Note:</strong> This link expires in 15 minutes.</p>
      <p>If you didn’t request this, please ignore this email.</p>
    `
    );

    return { message: "Password reset link sent to your email." };
  }

  // ✅ Reset password
  static async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    });
    if (!user) throw new AppError("Invalid or expired reset token", 400);

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashed, resetToken: null, resetTokenExpiry: null },
    });

    return { message: "Password updated successfully." };
  }
}
