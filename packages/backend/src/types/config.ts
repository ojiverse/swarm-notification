import { z } from "zod";

// Application configuration schemas
const ConfigSchema = z.object({
	port: z.number(),
	foursquarePushSecret: z.string(),
	discordWebhookUrl: z.string().url(),
});

const DebugConfigSchema = z.object({
	port: z.number(),
	foursquarePushSecret: z.string(),
	discordWebhookUrl: z.string().url(),
	debugFoursquareUserId: z.string().min(1),
	debugAccessToken: z.string().min(1),
});

// Type exports
export type Config = z.infer<typeof ConfigSchema>;
export type DebugConfig = z.infer<typeof DebugConfigSchema>;

// Schema exports for validation
export { ConfigSchema, DebugConfigSchema };
