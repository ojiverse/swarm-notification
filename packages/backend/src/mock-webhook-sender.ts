import type { WebhookPayload } from "./types.js";

function generateMockCheckinData(): WebhookPayload {
	const mockCheckin = {
		id: `mock_${Date.now()}`,
		createdAt: Math.floor(Date.now() / 1000),
		type: "checkin" as const,
		shout: "Testing from mock webhook sender! 🧪",
		user: {
			id: "mock_user_123",
			firstName: "Test",
			lastName: "User",
		},
		venue: {
			id: "venue_456",
			name: "Test Venue",
			location: {
				lat: 35.6762,
				lng: 139.6503,
				address: "1-1-1 Test Street",
				city: "Tokyo",
				country: "Japan",
			},
		},
		score: {
			total: 15,
			scores: [
				{
					points: 10,
					message: "First check-in bonus",
					icon: "🎉",
				},
				{
					points: 5,
					message: "Explorer bonus",
					icon: "🗺️",
				},
			],
		},
	};

	return {
		user: mockCheckin.user,
		checkin: JSON.stringify(mockCheckin),
		secret: process.env["FOURSQUARE_PUSH_SECRET"] || "mock_secret",
	};
}

async function sendMockCheckin(
	targetUrl = "http://localhost:3000/webhook/checkin",
	customData?: Partial<WebhookPayload>,
): Promise<Response> {
	const mockData = generateMockCheckinData();
	const payload = { ...mockData, ...customData };

	console.log("Sending mock checkin to:", targetUrl);
	console.log("Payload:", JSON.stringify(payload, null, 2));

	const response = await fetch(targetUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	console.log("Response status:", response.status);
	const responseText = await response.text();
	console.log("Response body:", responseText);

	return response;
}

function startMockServer(port = 3001): void {
	console.log(`Mock webhook sender available at http://localhost:${port}`);
	console.log("Use sendMockCheckin() function to send test webhooks");
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
	const args = process.argv.slice(2);
	const targetUrl = args[0] || "http://localhost:3000/webhook/checkin";

	sendMockCheckin(targetUrl)
		.then(() => {
			console.log("✅ Mock checkin sent successfully");
			process.exit(0);
		})
		.catch((error) => {
			console.error("❌ Failed to send mock checkin:", error);
			process.exit(1);
		});
}

export { sendMockCheckin, generateMockCheckinData, startMockServer };
