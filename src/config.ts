import { type Config, ConfigSchema } from "./types.js";

function loadConfig(): Config {
	return ConfigSchema.parse({
		port: Number(process.env["PORT"]) || 3000,
		foursquarePushSecret: process.env["FOURSQUARE_PUSH_SECRET"],
		discordWebhookUrl: process.env["DISCORD_WEBHOOK_URL"],
	});
}

export { loadConfig };
