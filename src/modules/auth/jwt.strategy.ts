import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { findUserById } from "./auth.service.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

passport.use(
  new JwtStrategy(
    { jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: JWT_SECRET },
    async (payload, done) => {
      try {
        const user = await findUserById(payload.sub as string);
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err as Error, false);
      }
    }
  )
);

export default passport;
