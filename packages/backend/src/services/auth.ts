import { logger } from "../utils/logger.js";

const authLogger = logger.getSubLogger({ name: "auth" });

// Simple token storage for debug mode
let storedToken: string | null = null;
let authenticatedUserId: string | null = null;

const storeToken = (token: string): void => {
	storedToken = token;
};

const getStoredToken = (): string => {
	if (!storedToken) {
		throw new Error("No token stored");
	}
	return storedToken;
};

const clearToken = (): void => {
	storedToken = null;
};

export const validateDebugToken = async (token: string): Promise<boolean> => {
	try {
		const response = await fetch(
			"https://api.foursquare.com/v2/users/self?v=20231010",
			{
				headers: { Authorization: `Bearer ${token}` },
			},
		);
		return response.ok;
	} catch (error) {
		authLogger.error("Token validation failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
};

export const initializeDebugAuth = async (
	userId: string,
	token: string,
): Promise<void> => {
	const isValid = await validateDebugToken(token);

	if (!isValid) {
		throw new Error("Invalid debug token");
	}

	storeToken(token);
	authenticatedUserId = userId;

	authLogger.info("Debug authentication initialized", {
		userId,
	});
};

export const isDebugAuthenticated = (userId: string): boolean => {
	return authenticatedUserId === userId && storedToken !== null;
};

export const getDebugToken = async (): Promise<string> => {
	return getStoredToken();
};

export const destroyDebugAuth = (): void => {
	clearToken();
	authenticatedUserId = null;
};
