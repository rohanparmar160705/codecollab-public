// src/modules/auth/auth.routes.ts
import { Router } from "express";
import { AuthController } from "./auth.controller";
import { OAuthController } from "./oauth.controller";

const router = Router();

// 📌 Public routes
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh-token", AuthController.refresh);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);

// 🔐 OAuth (Google/GitHub)
router.get("/oauth/:provider/url", OAuthController.url);
router.get("/oauth/:provider/callback", OAuthController.callback);

export default router;
