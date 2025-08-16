import { Logger } from "tslog";

const isProduction = process.env.NODE_ENV === "production";

export const logger = new Logger({
	name: "swarm-api",
	type: isProduction ? "json" : "pretty",
	prettyLogTemplate:
		"{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t",
});
