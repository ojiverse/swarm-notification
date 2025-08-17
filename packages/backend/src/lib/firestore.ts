import { Firestore } from "@google-cloud/firestore";

let firestoreInstance: Firestore | null = null;

export function getFirestore(): Firestore {
	if (!firestoreInstance) {
		if (process.env["NODE_ENV"] === "development") {
			firestoreInstance = new Firestore({
				projectId: "swarm-notifier-local",
			});
		} else {
			firestoreInstance = new Firestore();
		}
	}
	return firestoreInstance;
}
