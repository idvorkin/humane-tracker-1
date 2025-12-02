import { defineConfig } from "cypress";
import { existsSync } from "fs";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

const PORT = process.env.E2E_PORT || "3001";
// Detect if running in container (HTTPS) or locally (HTTP)
const isContainer =
	existsSync("/.dockerenv") || process.env.container !== undefined;
const PROTOCOL = isContainer ? "https" : "http";
const BASE_URL = `${PROTOCOL}://localhost:${PORT}`;

export default defineConfig({
	e2e: {
		baseUrl: BASE_URL,
		viewportWidth: 1920,
		viewportHeight: 1080,
		screenshotsFolder: "test-results/screenshots",
		video: false, // Disable video for faster runs
		chromeWebSecurity: false, // For HTTPS self-signed certs in containers
		retries: process.env.CI ? 2 : 0,
		// Automatically start dev server
		webServer: {
			command: `npm run dev -- --port ${PORT}`,
			url: BASE_URL,
			reuseExistingServer: true,
			timeout: 120000,
		},
		setupNodeEvents(on, config) {
			// Task for writing screenshot metadata
			on("task", {
				writeScreenshotMetadata({
					screenshotName,
					device,
				}: {
					screenshotName: string;
					device: string;
				}) {
					const metadataPath = join(
						config.screenshotsFolder,
						"screenshots.json",
					);
					const screenshotsDir = config.screenshotsFolder;

					// Ensure directory exists
					mkdirSync(screenshotsDir, { recursive: true });

					// Load existing metadata or create new
					let metadata: Array<{
						name: string;
						device: string;
						timestamp: string;
					}> = [];
					if (existsSync(metadataPath)) {
						try {
							const content = readFileSync(metadataPath, "utf-8");
							metadata = JSON.parse(content);
						} catch (err) {
							// If file is invalid, start fresh
							metadata = [];
						}
					}

					// Add new entry
					metadata.push({
						name: screenshotName,
						device,
						timestamp: new Date().toISOString(),
					});

					// Write metadata
					writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

					return null;
				},
			});

			return config;
		},
	},
});
