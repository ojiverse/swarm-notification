import type { TokenResponse, UserInfo } from "../types/oauth.js";
import { logger } from "../utils/logger.js";

const oauthLogger = logger.getSubLogger({ name: "oauth.foursquare" });

// Global environment variable validation (fail fast on module import)
const FOURSQUARE_CLIENT_ID = process.env["FOURSQUARE_CLIENT_ID"];
const FOURSQUARE_CLIENT_SECRET = process.env["FOURSQUARE_CLIENT_SECRET"];
const BASE_DOMAIN = process.env["BASE_DOMAIN"];

if (!FOURSQUARE_CLIENT_ID || !FOURSQUARE_CLIENT_SECRET || !BASE_DOMAIN) {
	throw new Error(
		"Missing required OAuth environment variables (FOURSQUARE_CLIENT_ID, FOURSQUARE_CLIENT_SECRET, BASE_DOMAIN)",
	);
}

export const exchangeCodeForToken = async (
	code: string,
): Promise<TokenResponse> => {
	const redirectUri = `${BASE_DOMAIN}/auth/swarm/callback`;

	oauthLogger.info("Starting Foursquare token exchange", {
		redirectUri,
		codeLength: code.length,
	});

	const response = await fetch("https://foursquare.com/oauth2/access_token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: FOURSQUARE_CLIENT_ID,
			client_secret: FOURSQUARE_CLIENT_SECRET,
			grant_type: "authorization_code",
			redirect_uri: redirectUri,
			code,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		oauthLogger.error("Foursquare token exchange failed", {
			status: response.status,
			statusText: response.statusText,
			error: errorText.substring(0, 500),
		});
		throw new Error(`Token exchange failed: ${response.statusText}`);
	}

	const tokenData = await response.json();

	oauthLogger.info("Foursquare token exchange successful", {
		tokenType: tokenData.token_type,
		hasAccessToken: !!tokenData.access_token,
	});

	return tokenData;
};

export const getUserInfo = async (accessToken: string): Promise<UserInfo> => {
	oauthLogger.info("Fetching Foursquare user info");

	const response = await fetch(
		"https://api.foursquare.com/v2/users/self?v=20231010",
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);

	if (!response.ok) {
		const errorText = await response.text();
		oauthLogger.error("Foursquare user info fetch failed", {
			status: response.status,
			statusText: response.statusText,
			error: errorText.substring(0, 500),
		});
		throw new Error(`User info fetch failed: ${response.statusText}`);
	}

	const data = await response.json();
	const userInfo = {
		id: data.response.user.id,
		firstName: data.response.user.firstName,
		lastName: data.response.user.lastName,
	};

	oauthLogger.info("Foursquare user info fetch successful", {
		userId: userInfo.id,
		firstName: userInfo.firstName,
		hasLastName: !!userInfo.lastName,
	});

	return userInfo;
};
