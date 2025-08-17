import { Timestamp } from "@google-cloud/firestore";
import { getFirestore } from "../lib/firestore.js";
import type {
	CreateUserData,
	UpdateUserData,
	UserRecord,
} from "../types/user.js";

export interface UserRepository {
	getUserByDiscordId(discordUserId: string): Promise<UserRecord | null>;
	getUserByFoursquareId(foursquareUserId: string): Promise<UserRecord | null>;
	createUser(userData: CreateUserData): Promise<UserRecord>;
	updateUser(
		discordUserId: string,
		updates: UpdateUserData,
	): Promise<UserRecord>;
	disconnectSwarm(discordUserId: string): Promise<UserRecord>;
}

class FirestoreUserRepository implements UserRepository {
	private readonly firestore = getFirestore();
	private readonly collection = this.firestore.collection("users");

	async getUserByDiscordId(discordUserId: string): Promise<UserRecord | null> {
		const snapshot = await this.collection
			.where("discordUserId", "==", discordUserId)
			.get();

		if (snapshot.empty) {
			return null;
		}

		const doc = snapshot.docs[0];
		if (!doc) {
			return null;
		}

		return doc.data() as UserRecord;
	}

	async getUserByFoursquareId(
		foursquareUserId: string,
	): Promise<UserRecord | null> {
		const snapshot = await this.collection
			.where("foursquareUserId", "==", foursquareUserId)
			.get();

		if (snapshot.empty) {
			return null;
		}

		const doc = snapshot.docs[0];
		if (!doc) {
			return null;
		}

		return doc.data() as UserRecord;
	}

	async createUser(userData: CreateUserData): Promise<UserRecord> {
		const now = Timestamp.now();
		const userRecord: UserRecord = {
			...userData,
			createdAt: now,
			lastUpdatedAt: now,
		};

		const docRef = this.collection.doc();
		await docRef.set(userRecord);

		return userRecord;
	}

	async updateUser(
		discordUserId: string,
		updates: UpdateUserData,
	): Promise<UserRecord> {
		const snapshot = await this.collection
			.where("discordUserId", "==", discordUserId)
			.get();

		if (snapshot.empty) {
			throw new Error(`User with discordUserId ${discordUserId} not found`);
		}

		const doc = snapshot.docs[0];
		if (!doc) {
			throw new Error(`User with discordUserId ${discordUserId} not found`);
		}

		const docRef = doc.ref;
		const currentData = doc.data() as UserRecord;

		const updatedData: UserRecord = {
			...currentData,
			...updates,
			lastUpdatedAt: Timestamp.now(),
		};

		await docRef.update(updatedData);
		return updatedData;
	}

	async disconnectSwarm(discordUserId: string): Promise<UserRecord> {
		const snapshot = await this.collection
			.where("discordUserId", "==", discordUserId)
			.get();

		if (snapshot.empty) {
			throw new Error(`User with discordUserId ${discordUserId} not found`);
		}

		const doc = snapshot.docs[0];
		if (!doc) {
			throw new Error(`User with discordUserId ${discordUserId} not found`);
		}

		const docRef = doc.ref;
		const currentData = doc.data() as UserRecord;

		const updatedData: UserRecord = {
			discordUserId: currentData.discordUserId,
			discordUsername: currentData.discordUsername,
			...(currentData.discordDisplayName && {
				discordDisplayName: currentData.discordDisplayName,
			}),
			createdAt: currentData.createdAt,
			lastUpdatedAt: Timestamp.now(),
		};

		await docRef.update(updatedData);
		return updatedData;
	}
}

export const userRepository: UserRepository = new FirestoreUserRepository();
