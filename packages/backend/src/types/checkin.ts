import { z } from "zod";

// Zod Schemas for Foursquare checkin data
const WebhookPayloadSchema = z.object({
	user: z.object({
		id: z.string(),
		firstName: z.string(),
		lastName: z.string().optional(),
	}),
	checkin: z.string(),
	secret: z.string(),
});

const UserSchema = z.object({
	id: z.string(),
	firstName: z.string(),
	lastName: z.string().optional(),
});

const VenueSchema = z.object({
	id: z.string(),
	name: z.string(),
	location: z
		.object({
			lat: z.number(),
			lng: z.number(),
			address: z.string().optional(),
			city: z.string().optional(),
			country: z.string().optional(),
		})
		.optional(),
});

const ParsedCheckinSchema = z.object({
	id: z.string(),
	createdAt: z.number(),
	type: z.literal("checkin"),
	shout: z.string().optional(),
	user: UserSchema,
	venue: VenueSchema.optional(),
	score: z
		.object({
			total: z.number(),
			scores: z.array(
				z.object({
					points: z.number(),
					message: z.string(),
					icon: z.string().optional(),
				}),
			),
		})
		.optional(),
});

// Type exports
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
export type ParsedCheckin = z.infer<typeof ParsedCheckinSchema>;
export type User = z.infer<typeof UserSchema>;
export type Venue = z.infer<typeof VenueSchema>;

// Schema exports for validation
export { WebhookPayloadSchema, ParsedCheckinSchema, UserSchema, VenueSchema };
