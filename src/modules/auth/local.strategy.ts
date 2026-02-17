import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { AuthService } from './auth.service.js';

const authService = new AuthService();

passport.use(
  new LocalStrategy({ usernameField: "email", passwordField: "password" }, async (email, password, done) => {
    try {
      const user = await authService.validateUser(email, password);
      if (!user) return done(null, false, { message: "Invalid credentials" });
      return done(null, user);
    } catch (err) {
      return done(err as Error);
    }
  })
);

export default passport;
