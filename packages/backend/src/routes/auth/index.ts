import { Hono } from "hono";
import { discordCallback, discordLogin } from "./discord.js";
import swarmAuthRouter from "./swarm.js";

const authRouter = new Hono();

// Discord OAuth routes
authRouter.get("/discord/login", discordLogin);
authRouter.get("/discord/callback", discordCallback);

// Mount service-specific auth routes
authRouter.route("/swarm", swarmAuthRouter);

// Future: authRouter.route("/google", googleAuthRouter);
// Future: authRouter.route("/twitter", twitterAuthRouter);

export default authRouter;
