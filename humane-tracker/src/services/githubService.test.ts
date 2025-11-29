import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildIssueBody,
	fetchLatestCommit,
	generateIssueUrl,
	getDeviceInfo,
	getGitHubLinks,
	getRepoUrl,
} from "./githubService";

describe("githubService", () => {
	describe("getRepoUrl", () => {
		it("returns default repo URL", () => {
			const url = getRepoUrl();
			expect(url).toBe("https://github.com/idvorkin/humane-tracker-1");
		});
	});

	describe("getGitHubLinks", () => {
		it("generates correct links from repo URL", () => {
			const links = getGitHubLinks("https://github.com/user/repo");
			expect(links).toEqual({
				repo: "https://github.com/user/repo",
				issues: "https://github.com/user/repo/issues",
				newIssue: "https://github.com/user/repo/issues/new",
			});
		});

		it("removes .git suffix from repo URL", () => {
			const links = getGitHubLinks("https://github.com/user/repo.git");
			expect(links).toEqual({
				repo: "https://github.com/user/repo",
				issues: "https://github.com/user/repo/issues",
				newIssue: "https://github.com/user/repo/issues/new",
			});
		});

		it("uses default repo URL when none provided", () => {
			const links = getGitHubLinks();
			expect(links.repo).toBe("https://github.com/idvorkin/humane-tracker-1");
		});
	});

	describe("getDeviceInfo", () => {
		it("returns formatted device info string", () => {
			const info = getDeviceInfo();
			expect(info).toContain("**Platform:**");
			expect(info).toContain("**User Agent:**");
			expect(info).toContain("**Language:**");
			expect(info).toContain("**Screen:**");
			expect(info).toContain("**Viewport:**");
			expect(info).toContain("**Network:**");
			expect(info).toContain("**Touch:**");
		});
	});

	describe("fetchLatestCommit", () => {
		const mockFetch = vi.fn();
		const originalFetch = globalThis.fetch;

		beforeEach(() => {
			globalThis.fetch = mockFetch;
		});

		afterEach(() => {
			globalThis.fetch = originalFetch;
			mockFetch.mockReset();
		});

		it("returns commit info on successful fetch", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve([
						{
							sha: "abc123456789",
							commit: {
								message: "Fix bug in feature\n\nMore details",
							},
							html_url: "https://github.com/user/repo/commit/abc123456789",
						},
					]),
			});

			const result = await fetchLatestCommit("https://github.com/user/repo");

			expect(result).toEqual({
				sha: "abc1234",
				message: "Fix bug in feature",
				url: "https://github.com/user/repo/commit/abc123456789",
			});
		});

		it("returns null on fetch error", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
			});

			const result = await fetchLatestCommit("https://github.com/user/repo");
			expect(result).toBeNull();
		});

		it("returns null for invalid repo URL", async () => {
			const result = await fetchLatestCommit("invalid-url");
			expect(result).toBeNull();
		});

		it("returns null when commits array is empty", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve([]),
			});

			const result = await fetchLatestCommit("https://github.com/user/repo");
			expect(result).toBeNull();
		});

		it("handles network errors gracefully", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			const result = await fetchLatestCommit("https://github.com/user/repo");
			expect(result).toBeNull();
		});
	});

	describe("buildIssueBody", () => {
		it("builds body without metadata", async () => {
			const body = await buildIssueBody("Something broke", false);

			expect(body).toContain("## Description");
			expect(body).toContain("Something broke");
			expect(body).not.toContain("## Environment");
			expect(body).not.toContain("## Device Info");
		});

		it("builds body with metadata", async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce({
				ok: false,
			});
			globalThis.fetch = mockFetch;

			const body = await buildIssueBody("Something broke", true);

			expect(body).toContain("## Description");
			expect(body).toContain("Something broke");
			expect(body).toContain("## Environment");
			expect(body).toContain("**Date:**");
			expect(body).toContain("## Device Info");
		});

		it("handles empty description", async () => {
			const body = await buildIssueBody("", false);
			expect(body).toContain("_No description provided_");
		});
	});

	describe("generateIssueUrl", () => {
		const mockFetch = vi.fn();
		const originalFetch = globalThis.fetch;

		beforeEach(() => {
			mockFetch.mockResolvedValue({ ok: false });
			globalThis.fetch = mockFetch;
		});

		afterEach(() => {
			globalThis.fetch = originalFetch;
		});

		it("generates URL with title and body parameters", async () => {
			const url = await generateIssueUrl({
				title: "Bug: Something broke",
				description: "It's broken",
				includeMetadata: false,
			});

			expect(url).toContain("/issues/new?");
			expect(url).toContain("title=Bug%3A+Something+broke");
			expect(url).toContain("labels=bug%2Cfrom-app");
		});

		it("uses default title when none provided", async () => {
			const url = await generateIssueUrl({
				title: "",
				description: "Something happened",
				includeMetadata: false,
			});

			expect(url).toContain("title=Bug+Report");
		});
	});
});
