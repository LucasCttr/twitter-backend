import express from "express";
import passport from "passport";
import * as authService from "./auth.service.js";
import { signJwt } from "../../utils/jwt.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json(user);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/login", passport.authenticate("local", { session: false }), (req, res) => {
  // passport attaches the user to req.user
  const user = (req as any).user;
  const token = signJwt({ sub: user.id, email: user.email });
  res.json({ token, user });
});

// example protected route using passport jwt
router.get(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  (req, res) => res.json({ user: (req as any).user })
);

export default router;
