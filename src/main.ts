import { Logger } from "tslog";

async function main(): Promise<void> {
	const logger = new Logger({
		name: "main",
		type: "json",
	});
	logger.info("hello world");

	const NODE_ENV = process.env["NODE_ENV"];
	logger.info(`environment: ${NODE_ENV ?? "development"}`);
}

main();
