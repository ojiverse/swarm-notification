import { Hono } from "hono";
import swarmAuthRouter from "./swarm.js";

const authRouter = new Hono();

// Mount service-specific auth routes
authRouter.route("/swarm", swarmAuthRouter);

// Future: authRouter.route("/google", googleAuthRouter);
// Future: authRouter.route("/twitter", twitterAuthRouter);

export default authRouter;
