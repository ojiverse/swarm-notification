import { Hono } from "hono";

const router = new Hono();

router.get("/", (c) => {
	return c.json({
		message: "Swarm API Webhook Server",
		status: "running",
		timestamp: new Date().toISOString(),
	});
});

export default router;
