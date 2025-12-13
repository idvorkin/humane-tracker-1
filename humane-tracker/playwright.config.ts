import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Check if Tailscale is running (matches vite.config.ts logic)
function isTailscaleRunning(): boolean {
  try {
    const output = execSync('tailscale status --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const status = JSON.parse(output);
    return !!status.Self?.DNSName;
  } catch {
    return false;
  }
}

// Get process working directory - cross-platform
function getProcessCwd(pid: string): string | null {
  try {
    if (process.platform === 'darwin') {
      // macOS: use lsof to get cwd
      const output = execSync(
        `lsof -p ${pid} 2>/dev/null | grep cwd | awk '{print $NF}'`,
        { encoding: 'utf-8' }
      ).trim();
      return output || null;
    } else {
      // Linux: use /proc filesystem
      return (
        execSync(`readlink -f /proc/${pid}/cwd 2>/dev/null`, {
          encoding: 'utf-8',
        }).trim() || null
      );
    }
  } catch {
    return null;
  }
}

// Get process command line - cross-platform
function getProcessCmd(pid: string): string | null {
  try {
    if (process.platform === 'darwin') {
      // macOS: use ps
      return (
        execSync(`ps -p ${pid} -o command= 2>/dev/null`, {
          encoding: 'utf-8',
        }).trim() || null
      );
    } else {
      // Linux: use /proc filesystem
      return (
        execSync(`cat /proc/${pid}/cmdline 2>/dev/null | tr '\\0' ' '`, {
          encoding: 'utf-8',
        }).trim() || null
      );
    }
  } catch {
    return null;
  }
}

// Find a running vite server in the current directory
function findRunningViteServer(): { port: number; https: boolean } | null {
  try {
    const cwd = process.cwd();
    // Use lsof to find listening ports and their PIDs
    const lsofOutput = execSync(
      'lsof -i -P -n 2>/dev/null | grep LISTEN || true',
      {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    for (const line of lsofOutput.split('\n')) {
      const parts = line.split(/\s+/);
      if (parts.length < 9) continue;

      const pid = parts[1];
      const portMatch = parts[8]?.match(/:(\d+)$/);
      if (!portMatch) continue;

      const port = parseInt(portMatch[1], 10);
      // Check typical vite/dev server ports (3000-3100, 5173)
      if ((port < 3000 || port > 3100) && port !== 5173) continue;

      // Check if this process is running from our directory
      try {
        const processCwd = getProcessCwd(pid);
        const cmdline = getProcessCmd(pid);

        if (processCwd === cwd && cmdline?.includes('vite')) {
          // Check if it's HTTPS
          const timeoutCmd = process.platform === 'darwin' ? 'gtimeout' : 'timeout';
          const isHttps =
            execSync(
              `${timeoutCmd} 1 bash -c "echo | openssl s_client -connect localhost:${port} 2>/dev/null | grep -q 'CONNECTED' && echo yes" 2>/dev/null || true`,
              { encoding: 'utf-8' }
            ).trim() === 'yes';
          return { port, https: isHttps };
        }
      } catch {
        // Process might have exited
      }
    }
  } catch {
    // lsof not available or other error
  }
  return null;
}

// Detect if running in container with Tailscale (HTTPS) - matches vite.config.ts
const isContainer = existsSync('/.dockerenv') || process.env.container !== undefined;
const hasTailscale = isTailscaleRunning();
const useHttps = isContainer && hasTailscale;

// Try to find an already-running vite server for this project
const runningServer = findRunningViteServer();
const PORT = process.env.E2E_PORT || (runningServer?.port.toString() ?? '3001');
const PROTOCOL = runningServer?.https ? 'https' : useHttps ? 'https' : 'http';
const BASE_URL = `${PROTOCOL}://localhost:${PORT}`;

// Log detected server for debugging
if (runningServer) {
  console.log(`[Playwright] Using running vite server at ${BASE_URL}`);
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: BASE_URL,
    // Enhanced artifact capture - use 'on' for development, 'retain-on-failure' for CI
    trace: process.env.CI ? 'retain-on-failure' : 'on',
    video: process.env.CI ? 'retain-on-failure' : 'on',
    screenshot: process.env.CI ? 'only-on-failure' : 'on',
    // Ignore HTTPS certificate errors in container (self-signed cert)
    ignoreHTTPSErrors: isContainer,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14 Pro'] },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120 * 1000,
    // Ignore HTTPS certificate errors when checking server readiness
    ignoreHTTPSErrors: isContainer,
  },
});