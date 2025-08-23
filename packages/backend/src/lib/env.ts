/**
 * Environment variable validation utilities with proper type guards
 */

export function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} environment variable is required`);
	}
	return value;
}

export function isValidEnvString(value: string | undefined): value is string {
	return typeof value === "string" && value.length > 0;
}

export function assertEnvString(
	value: string | undefined,
	name: string,
): asserts value is string {
	if (!isValidEnvString(value)) {
		throw new Error(`${name} environment variable is required`);
	}
}
