import { z } from "zod";

// Application configuration schemas
const ConfigSchema = z.object({
	port: z.number(),
	foursquarePushSecret: z.string(),
	discordWebhookUrl: z.string().url(),
});

// Type exports
export type Config = z.infer<typeof ConfigSchema>;

// Schema exports for validation
export { ConfigSchema };
