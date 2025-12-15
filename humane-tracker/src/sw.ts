/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

/**
 * Service Worker combining:
 * 1. Dexie Cloud background sync (syncs data even when app is closed)
 * 2. Workbox asset caching (offline PWA support)
 *
 * See: https://dexie.org/cloud/docs/db.cloud.configure()
 * See: https://vite-pwa-org.netlify.app/guide/inject-manifest
 */

// Enable Dexie Cloud background sync
// This allows sync to happen even when the app is closed
import "dexie-cloud-addon/service-worker";

// Workbox precaching for offline asset support
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

// Precache all assets from the Vite build manifest
// self.__WB_MANIFEST is injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// Clean up old cached assets when SW updates
cleanupOutdatedCaches();

// Activate new service worker immediately (auto-update behavior)
self.addEventListener("install", () => {
	self.skipWaiting();
});

// Take control of all clients immediately
self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});
