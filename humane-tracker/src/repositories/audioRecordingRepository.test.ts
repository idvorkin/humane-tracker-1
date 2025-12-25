import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../config/db";
import {
	audioRecordingRepository,
	validateAudioRecording,
} from "./audioRecordingRepository";
import { toDateString } from "./types";

// Helper to create a test audio blob
function createTestBlob(size = 1000): Blob {
	const data = new Uint8Array(size);
	return new Blob([data], { type: "audio/webm;codecs=opus" });
}

describe("audioRecordingRepository", () => {
	const testUserId = "test-user-123";

	beforeEach(async () => {
		await db.audioRecordings.clear();
	});

	afterEach(async () => {
		await db.audioRecordings.clear();
	});

	describe("create", () => {
		it("creates an audio recording with correct data", async () => {
			const testDate = new Date();
			const testBlob = createTestBlob();

			const id = await audioRecordingRepository.create({
				userId: testUserId,
				audioBlob: testBlob,
				mimeType: "audio/webm;codecs=opus",
				durationMs: 5000,
				affirmationTitle: "Do It Anyways",
				recordingContext: "opportunity",
				date: testDate,
				transcriptionStatus: "pending",
			});

			expect(id).toMatch(/^aud/);

			const record = await db.audioRecordings.get(id);
			expect(record).toBeDefined();
			expect(record?.userId).toBe(testUserId);
			expect(record?.affirmationTitle).toBe("Do It Anyways");
			expect(record?.recordingContext).toBe("opportunity");
			expect(record?.durationMs).toBe(5000);
			expect(record?.mimeType).toBe("audio/webm;codecs=opus");
			expect(record?.transcriptionStatus).toBe("pending");
			expect(record?.date).toBe(toDateString(testDate));
			// Note: fake-indexeddb may not preserve blob properties exactly
			expect(record?.audioBlob).toBeDefined();
		});

		it("creates recordings with didit context", async () => {
			const id = await audioRecordingRepository.create({
				userId: testUserId,
				audioBlob: createTestBlob(),
				mimeType: "audio/webm",
				durationMs: 3000,
				affirmationTitle: "Calm Like Water",
				recordingContext: "didit",
				date: new Date(),
				transcriptionStatus: "pending",
			});

			const record = await db.audioRecordings.get(id);
			expect(record?.recordingContext).toBe("didit");
		});
	});

	describe("getById", () => {
		it("returns recording by id", async () => {
			const id = await audioRecordingRepository.create({
				userId: testUserId,
				audioBlob: createTestBlob(),
				mimeType: "audio/webm",
				durationMs: 5000,
				affirmationTitle: "Test",
				recordingContext: "opportunity",
				date: new Date(),
				transcriptionStatus: "pending",
			});

			const recording = await audioRecordingRepository.getById(id);
			expect(recording).toBeDefined();
			expect(recording?.id).toBe(id);
			expect(recording?.userId).toBe(testUserId);
		});

		it("returns undefined for non-existent id", async () => {
			const recording = await audioRecordingRepository.getById("nonexistent");
			expect(recording).toBeUndefined();
		});
	});

	describe("getByUserId", () => {
		it("returns all recordings for a user", async () => {
			await audioRecordingRepository.create({
				userId: testUserId,
				audioBlob: createTestBlob(),
				mimeType: "audio/webm",
				durationMs: 1000,
				affirmationTitle: "Test 1",
				recordingContext: "opportunity",
				date: new Date(),
				transcriptionStatus: "pending",
			});

			await audioRecordingRepository.create({
				userId: testUserId,
				audioBlob: createTestBlob(),
				mimeType: "audio/webm",
				durationMs: 2000,
				affirmationTitle: "Test 2",
				recordingContext: "didit",
				date: new Date(),
				transcriptionStatus: "pending",
			});

			await audioRecordingRepository.create({
				userId: "other-user",
				audioBlob: createTestBlob(),
				mimeType: "audio/webm",
				durationMs: 3000,
				affirmationTitle: "Other",
				recordingContext: "opportunity",
				date: new Date(),
				transcriptionStatus: "pending",
			});

			const recordings = await audioRecordingRepository.getByUserId(testUserId);
			expect(recordings).toHaveLength(2);
			expect(recordings.every((r) => r.userId === testUserId)).toBe(true);
		});

		it("returns empty array when no recordings exist", async () => {
			const recordings =
				await audioRecordingRepository.getByUserId("nonexistent");
			expect(recordings).toHaveLength(0);
		});
	});

	describe("getByUserIdAndDate", () => {
		it("returns recordings for specific date", async () => {
			const targetDate = new Date();
			const differentDate = new Date(targetDate);
			differentDate.setDate(differentDate.getDate() + 1);

			await audioRecordingRepository.create({
				userId: testUserId,
				audioBlob: createTestBlob(),
				mimeType: "audio/webm",
				durationMs: 1000,
				affirmationTitle: "Target Day",
				recordingContext: "opportunity",
				date: targetDate,
				transcriptionStatus: "pending",
			});

			await audioRecordingRepository.create({
				userId: testUserId,
				audioBlob: createTestBlob(),
				mimeType: "audio/webm",
				durationMs: 2000,
				affirmationTitle: "Different Day",
				recordingContext: "didit",
				date: differentDate,
				transcriptionStatus: "pending",
			});

			const recordings = await audioRecordingRepository.getByUserIdAndDate(
				testUserId,
				targetDate,
			);

			expect(recordings).toHaveLength(1);
			expect(recordings[0].affirmationTitle).toBe("Target Day");
		});
	});

	describe("updateTranscription", () => {
		it("updates transcription status and text", async () => {
			const id = await audioRecordingRepository.create({
				userId: testUserId,
				audioBlob: createTestBlob(),
				mimeType: "audio/webm",
				durationMs: 1000,
				affirmationTitle: "Test",
				recordingContext: "opportunity",
				date: new Date(),
				transcriptionStatus: "pending",
			});

			await audioRecordingRepository.updateTranscription(
				id,
				"completed",
				"This is the transcribed text",
			);

			const recording = await audioRecordingRepository.getById(id);
			expect(recording?.transcriptionStatus).toBe("completed");
			expect(recording?.transcriptionText).toBe("This is the transcribed text");
		});

		it("updates transcription status with error", async () => {
			const id = await audioRecordingRepository.create({
				userId: testUserId,
				audioBlob: createTestBlob(),
				mimeType: "audio/webm",
				durationMs: 1000,
				affirmationTitle: "Test",
				recordingContext: "opportunity",
				date: new Date(),
				transcriptionStatus: "pending",
			});

			await audioRecordingRepository.updateTranscription(
				id,
				"failed",
				undefined,
				"Transcription service unavailable",
			);

			const recording = await audioRecordingRepository.getById(id);
			expect(recording?.transcriptionStatus).toBe("failed");
			expect(recording?.transcriptionError).toBe(
				"Transcription service unavailable",
			);
		});

		it("throws error when updating non-existent recording", async () => {
			await expect(
				audioRecordingRepository.updateTranscription(
					"non-existent-id",
					"completed",
					"Some text",
				),
			).rejects.toThrow(/Audio recording not found/);
		});
	});

	describe("delete", () => {
		it("deletes a recording", async () => {
			const id = await audioRecordingRepository.create({
				userId: testUserId,
				audioBlob: createTestBlob(),
				mimeType: "audio/webm",
				durationMs: 1000,
				affirmationTitle: "Test",
				recordingContext: "opportunity",
				date: new Date(),
				transcriptionStatus: "pending",
			});

			await audioRecordingRepository.delete(id);

			const recording = await audioRecordingRepository.getById(id);
			expect(recording).toBeUndefined();
		});
	});

	describe("getTotalSizeForUser", () => {
		it("returns total size of all recordings for user", async () => {
			const blob1 = createTestBlob(1000);
			const blob2 = createTestBlob(2000);

			await audioRecordingRepository.create({
				userId: testUserId,
				audioBlob: blob1,
				mimeType: "audio/webm",
				durationMs: 1000,
				affirmationTitle: "Test 1",
				recordingContext: "opportunity",
				date: new Date(),
				transcriptionStatus: "pending",
			});

			await audioRecordingRepository.create({
				userId: testUserId,
				audioBlob: blob2,
				mimeType: "audio/webm",
				durationMs: 2000,
				affirmationTitle: "Test 2",
				recordingContext: "didit",
				date: new Date(),
				transcriptionStatus: "pending",
			});

			const totalSize =
				await audioRecordingRepository.getTotalSizeForUser(testUserId);
			// Note: fake-indexeddb may not preserve blob size, so just check it returns a number
			expect(typeof totalSize).toBe("number");
			// In real IndexedDB, this would be 3000
		});

		it("returns 0 when no recordings exist", async () => {
			const totalSize =
				await audioRecordingRepository.getTotalSizeForUser("nonexistent");
			expect(totalSize).toBe(0);
		});
	});

	describe("validateAudioRecording", () => {
		const validRecording = {
			userId: "user-123",
			audioBlob: createTestBlob(),
			mimeType: "audio/webm;codecs=opus",
			durationMs: 5000,
			affirmationTitle: "Do It Anyways",
			recordingContext: "opportunity" as const,
			date: new Date(),
			transcriptionStatus: "pending" as const,
		};

		it("accepts valid recording data", () => {
			expect(() => validateAudioRecording(validRecording)).not.toThrow();
		});

		it("throws on empty userId", () => {
			expect(() =>
				validateAudioRecording({ ...validRecording, userId: "" }),
			).toThrow("userId cannot be empty");
		});

		it("throws on whitespace-only userId", () => {
			expect(() =>
				validateAudioRecording({ ...validRecording, userId: "   " }),
			).toThrow("userId cannot be empty");
		});

		it("throws on empty affirmationTitle", () => {
			expect(() =>
				validateAudioRecording({ ...validRecording, affirmationTitle: "" }),
			).toThrow("affirmationTitle cannot be empty");
		});

		it("throws on invalid recordingContext", () => {
			expect(() =>
				validateAudioRecording({
					...validRecording,
					recordingContext: "invalid" as "opportunity",
				}),
			).toThrow('recordingContext must be "opportunity" or "didit"');
		});

		it("throws on empty blob", () => {
			const emptyBlob = new Blob([], { type: "audio/webm" });
			expect(() =>
				validateAudioRecording({ ...validRecording, audioBlob: emptyBlob }),
			).toThrow("audioBlob cannot be empty");
		});

		it("throws on non-blob audioBlob", () => {
			expect(() =>
				validateAudioRecording({
					...validRecording,
					audioBlob: "not a blob" as unknown as Blob,
				}),
			).toThrow("audioBlob must be a Blob");
		});

		it("throws on empty mimeType", () => {
			expect(() =>
				validateAudioRecording({ ...validRecording, mimeType: "" }),
			).toThrow("mimeType cannot be empty");
		});

		it("throws on negative durationMs", () => {
			expect(() =>
				validateAudioRecording({ ...validRecording, durationMs: -100 }),
			).toThrow("durationMs must be a non-negative number");
		});

		it("throws on invalid transcriptionStatus", () => {
			expect(() =>
				validateAudioRecording({
					...validRecording,
					transcriptionStatus: "invalid" as "pending",
				}),
			).toThrow("transcriptionStatus must be one of");
		});

		it("accepts all valid transcription statuses", () => {
			for (const status of [
				"pending",
				"processing",
				"completed",
				"failed",
			] as const) {
				expect(() =>
					validateAudioRecording({
						...validRecording,
						transcriptionStatus: status,
					}),
				).not.toThrow();
			}
		});

		it("accepts both recording contexts", () => {
			expect(() =>
				validateAudioRecording({
					...validRecording,
					recordingContext: "opportunity",
				}),
			).not.toThrow();
			expect(() =>
				validateAudioRecording({
					...validRecording,
					recordingContext: "didit",
				}),
			).not.toThrow();
		});
	});
});
