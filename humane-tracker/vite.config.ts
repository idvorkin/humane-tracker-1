/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "child_process";
import { existsSync } from "fs";

// Detect if running in a container
function isContainer(): boolean {
	return existsSync("/.dockerenv") || process.env.container !== undefined;
}

// Detect Tailscale IP if available
function getTailscaleIP(): string | null {
	try {
		const ip = execSync("tailscale ip -4 2>/dev/null", { encoding: "utf-8" }).trim();
		return ip || null;
	} catch {
		return null;
	}
}

// Get Tailscale hostnames (short like "c-5002" and full like "c-5002.squeaker-teeth.ts.net")
function getTailscaleHostnames(): { short: string; full: string } | null {
	try {
		const json = execSync("tailscale status --json 2>/dev/null", { encoding: "utf-8" });
		const status = JSON.parse(json);
		const fullName = status.Self?.DNSName?.replace(/\.$/, "");
		if (!fullName) return null;
		const shortName = fullName.split(".")[0];
		return { short: shortName, full: fullName };
	} catch {
		return null;
	}
}

// In containers with Tailscale, bind to all interfaces (required for Tailscale routing)
const inContainer = isContainer();
const tailscaleIP = getTailscaleIP();
const tailscaleHosts = getTailscaleHostnames();
const devHost = inContainer && tailscaleIP ? "0.0.0.0" : "localhost";

// Enable SSL when in container with Tailscale (some browser APIs require secure context)
const useSsl = inContainer && tailscaleIP !== null;

if (inContainer && tailscaleIP) {
	console.log(`🐳 Container with Tailscale - binding to 0.0.0.0`);
	const protocol = useSsl ? "https" : "http";
	console.log(`   Access via: ${protocol}://${tailscaleHosts?.short || tailscaleIP}:3000/`);
}

export default defineConfig({
	plugins: [
		react(),
		...(useSsl ? [basicSsl()] : []),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.ico"],
			manifest: {
				name: "Humane Tracker",
				short_name: "HumaneTrack",
				description: "Track habits and behaviors with a humane, local-first approach",
				theme_color: "#4F46E5",
				background_color: "#ffffff",
				display: "standalone",
				orientation: "any",
				icons: [
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
			},
		}),
	],
	server: {
		port: 3000,
		open: true,
		host: devHost,
		// Allow Tailscale hostnames (both short "c-5002" and full "c-5002.squeaker-teeth.ts.net")
		allowedHosts: tailscaleHosts ? [tailscaleHosts.short, tailscaleHosts.full] : undefined,
	},
	build: {
		outDir: "dist",
		sourcemap: true,
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: "./src/test/setup.ts",
		include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
	},
});
