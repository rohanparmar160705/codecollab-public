// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { success } from "../../utils/response";

export class AuthController {
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password } = req.body;
      const result = await AuthService.register(username, email, password);
      return success(res, "User registered successfully", result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Auth]
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      return success(res, "Login successful", result);
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refresh(refreshToken);
      return success(res, "Token refreshed", result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/forgot-password:
   *   post:
   *     summary: Send password reset email
   *     tags: [Auth]
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      return success(res, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/reset-password:
   *   post:
   *     summary: Reset password using token
   *     tags: [Auth]
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      const result = await AuthService.resetPassword(token, password);
      return success(res, result.message, result);
    } catch (err) {
      next(err);
    }
  }
}
