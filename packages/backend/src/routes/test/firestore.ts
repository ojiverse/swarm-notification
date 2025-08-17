import { Timestamp } from "@google-cloud/firestore";
import { Hono } from "hono";
import { getFirestore } from "../../lib/firestore.js";

const app = new Hono();

app.post("/firestore", async (c) => {
	try {
		const body = await c.req.json();
		const testData = {
			...body,
			timestamp: Timestamp.now(),
			testId: Math.random().toString(36).substring(7),
		};

		const firestore = getFirestore();
		const docRef = firestore.collection("test").doc();

		// Write to Firestore
		await docRef.set(testData);

		// Read back from Firestore
		const snapshot = await docRef.get();
		const savedData = snapshot.data();

		return c.json({
			success: true,
			message: "Data written to and read from Firestore successfully",
			originalData: body,
			savedData,
			documentId: docRef.id,
		});
	} catch (error) {
		console.error("Firestore test error:", error);
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			500,
		);
	}
});

export default app;
