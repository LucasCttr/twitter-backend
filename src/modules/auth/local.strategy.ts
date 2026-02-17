import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { validateUser } from "./auth.service.js";

passport.use(
  new LocalStrategy({ usernameField: "email", passwordField: "password" }, async (email, password, done) => {
    try {
      const user = await validateUser(email, password);
      if (!user) return done(null, false, { message: "Invalid credentials" });
      return done(null, user);
    } catch (err) {
      return done(err as Error);
    }
  })
);

export default passport;
