import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { AuthService } from "./auth.service.js";

const authService = new AuthService();

passport.use(
  new JwtStrategy(
    { jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: process.env.JWT_SECRET as string },
    async (payload, done) => {
      try {
        const user = await authService.findUserById(payload.sub as string);
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err as Error, false);
      }
    }
  )
);

export default passport;
