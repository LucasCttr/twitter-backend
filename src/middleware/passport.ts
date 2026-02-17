import express from "express";
import passport from "passport";
import "../modules/auth/local.strategy.js";
import "../modules/auth/jwt.strategy.js";

export function initPassport(app: express.Express) {
  app.use(passport.initialize());
}

export default passport;
