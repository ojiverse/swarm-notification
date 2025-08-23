import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { verifyJWT } from "../lib/jwt.js";
import { userRepository } from "../repository/user.js";
import { logger } from "../utils/logger.js";

const router = new Hono();
const dashboardLogger = logger.getSubLogger({ name: "dashboard" });

router.get("/", async (c) => {
	// Check for JWT token (cookie only for web interface)
	const token = getCookie(c, "auth_token");

	if (!token) {
		// Not authenticated - show login page
		dashboardLogger.info("Unauthenticated user accessing dashboard");
		return c.html(`
			<html>
				<head>
					<title>Swarm Discord Integration</title>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
				</head>
				<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
					<h1>🎯 Swarm Discord Integration</h1>
					<p>Connect your Foursquare Swarm check-ins to Discord notifications!</p>
					
					<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<h3>Getting Started</h3>
						<p>To receive Discord notifications for your Swarm check-ins, you need to:</p>
						<ol>
							<li><strong>Connect Discord</strong> - Authenticate with your Discord account</li>
							<li><strong>Connect Swarm</strong> - Link your Foursquare Swarm account</li>
							<li><strong>Check-in!</strong> - Your check-ins will automatically appear in Discord</li>
						</ol>
					</div>
					
					<div style="text-align: center; margin: 30px 0;">
						<a href="/auth/discord/login" style="background: #5865f2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
							🔗 Connect with Discord
						</a>
					</div>
					
					<div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin-top: 20px; font-size: 14px;">
						<strong>Note:</strong> You must be a member of the target Discord server to use this service.
					</div>
				</body>
			</html>
		`);
	}

	// Verify JWT token
	const payload = await verifyJWT(token);
	if (!payload) {
		dashboardLogger.warn("Invalid JWT token in dashboard access");
		return c.redirect("/auth/discord/login");
	}

	try {
		// Get user data from Firestore
		const user = await userRepository.getUserByDiscordId(payload.discordUserId);
		if (!user) {
			dashboardLogger.error("User not found in database", {
				discordUserId: payload.discordUserId,
			});
			return c.redirect("/auth/discord/login");
		}

		const hasSwarmConnection = !!user.foursquareUserId;

		dashboardLogger.info("Authenticated user accessing dashboard", {
			discordUserId: payload.discordUserId,
			hasSwarmConnection,
		});

		// Show dashboard with connection status
		return c.html(`
			<html>
				<head>
					<title>Swarm Discord Integration - Dashboard</title>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
				</head>
				<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
					<h1>🎯 Swarm Discord Integration</h1>
					<p>Welcome back, <strong>${payload.discordUsername}</strong>!</p>
					
					<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<h3>Connection Status</h3>
						
						<div style="margin: 15px 0;">
							<div style="display: flex; align-items: center; margin-bottom: 10px;">
								<span style="color: #28a745; font-size: 18px; margin-right: 8px;">✅</span>
								<strong>Discord:</strong> Connected as ${payload.discordUsername}
							</div>
						</div>
						
						<div style="margin: 15px 0;">
							<div style="display: flex; align-items: center; margin-bottom: 10px;">
								${
									hasSwarmConnection
										? '<span style="color: #28a745; font-size: 18px; margin-right: 8px;">✅</span><strong>Swarm:</strong> Connected'
										: '<span style="color: #ffc107; font-size: 18px; margin-right: 8px;">⚠️</span><strong>Swarm:</strong> Not connected'
								}
							</div>
						</div>
					</div>
					
					${
						hasSwarmConnection
							? `
						<div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 6px; margin: 20px 0;">
							<strong>🎉 All Set!</strong> Your check-ins will automatically appear in Discord.
						</div>
						
						<div style="text-align: center; margin: 30px 0;">
							<a href="/users/@me" style="background: #17a2b8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-right: 10px;">
								📋 View Profile
							</a>
						</div>
					`
							: `
						<div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 6px; margin: 20px 0;">
							<strong>⚠️ Setup Incomplete</strong> Connect your Swarm account to receive notifications.
						</div>
						
						<div style="text-align: center; margin: 30px 0;">
							<a href="/auth/swarm/login" style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
								🔗 Connect Swarm Account
							</a>
						</div>
					`
					}
					
					<div style="text-align: center; margin-top: 40px; font-size: 14px; color: #666;">
						<p>Need help? Check the setup instructions or contact support.</p>
					</div>
				</body>
			</html>
		`);
	} catch (error) {
		dashboardLogger.error("Dashboard error", {
			error: error instanceof Error ? error.message : "Unknown error",
			discordUserId: payload.discordUserId,
		});
		return c.json({ error: "Dashboard error" }, 500);
	}
});

export default router;
