import path from "node:path";
import fs from "node:fs";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";

const EKG_ENGINE_MODE = (process.env.EKG_ENGINE_MODE || "embedded").toLowerCase();
const EKG_ENGINE_HOST = process.env.EKG_ENGINE_HOST || "127.0.0.1";
const EKG_ENGINE_PORT = parseInt(process.env.EKG_ENGINE_PORT || "8787", 10);
const EKG_ENGINE_STARTUP_TIMEOUT_MS = parseInt(
  process.env.EKG_ENGINE_STARTUP_TIMEOUT_MS || "120000",
  10,
);
const EKG_ENGINE_AUTO_START = process.env.EKG_ENGINE_AUTO_START !== "false";
const EKG_ENGINE_DIR =
  process.env.EKG_ENGINE_DIR || path.resolve(process.cwd(), "ekg_engine");

let ekgProcess: ChildProcessWithoutNullStreams | null = null;
let startupInFlight: Promise<void> | null = null;
let shutdownHooksRegistered = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolvePythonBinary(): string {
  if (process.env.EKG_ENGINE_PYTHON_BIN) {
    return process.env.EKG_ENGINE_PYTHON_BIN;
  }

  const venvPython = path.join(
    EKG_ENGINE_DIR,
    ".venv",
    process.platform === "win32" ? "Scripts" : "bin",
    process.platform === "win32" ? "python.exe" : "python",
  );

  if (fs.existsSync(venvPython)) {
    return venvPython;
  }

  return process.env.PYTHON_BIN || "python3";
}

function assertPythonDependencies(pythonBin: string) {
  const check = spawnSync(
    pythonBin,
    [
      "-c",
      "import fastapi,uvicorn,openai,networkx,pydantic_settings,rapidfuzz",
    ],
    {
      cwd: EKG_ENGINE_DIR,
      stdio: "pipe",
      env: process.env,
      encoding: "utf8",
    },
  );

  if (check.status === 0) {
    return;
  }

  const stderr = (check.stderr || "").trim();
  const stdout = (check.stdout || "").trim();
  throw new Error(
    [
      `Embedded EKG Python dependencies are missing (python=${pythonBin}).`,
      "Run `npm run ekg:setup` once to install the embedded engine environment.",
      stdout ? `stdout: ${stdout}` : "",
      stderr ? `stderr: ${stderr}` : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

async function waitForEngineHealth(baseUrl: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  let lastError = "Unknown startup error";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
      lastError = `Health check failed with status ${response.status}`;
    } catch (error: any) {
      lastError = error?.message || String(error);
    }

    await sleep(1000);
  }

  throw new Error(
    `Embedded EKG engine did not become healthy in ${timeoutMs}ms. Last error: ${lastError}`,
  );
}

export function isEmbeddedEkgEnabled(): boolean {
  return EKG_ENGINE_MODE === "embedded";
}

export function getEmbeddedEkgBaseUrl(): string {
  return `http://${EKG_ENGINE_HOST}:${EKG_ENGINE_PORT}`;
}

export async function initializeEmbeddedEkgEngine(): Promise<void> {
  if (!isEmbeddedEkgEnabled() || !EKG_ENGINE_AUTO_START) {
    return;
  }

  if (startupInFlight) {
    return startupInFlight;
  }

  startupInFlight = (async () => {
    const baseUrl = getEmbeddedEkgBaseUrl();

    try {
      await waitForEngineHealth(baseUrl, 2000);
      return;
    } catch {
      // Engine not running yet; continue to spawn.
    }

    if (!fs.existsSync(EKG_ENGINE_DIR)) {
      throw new Error(
        `Embedded EKG engine directory not found: ${EKG_ENGINE_DIR}`,
      );
    }

    const pythonBin = resolvePythonBinary();
    assertPythonDependencies(pythonBin);

    const args = [
      "-m",
      "uvicorn",
      "api.main:app",
      "--host",
      EKG_ENGINE_HOST,
      "--port",
      String(EKG_ENGINE_PORT),
      "--log-level",
      process.env.EKG_ENGINE_LOG_LEVEL || "info",
    ];

    ekgProcess = spawn(pythonBin, args, {
      cwd: EKG_ENGINE_DIR,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
      stdio: "pipe",
    });

    ekgProcess.stdout.on("data", (chunk) => {
      process.stdout.write(`[ekg-engine] ${chunk}`);
    });

    ekgProcess.stderr.on("data", (chunk) => {
      process.stderr.write(`[ekg-engine] ${chunk}`);
    });

    ekgProcess.on("exit", (code, signal) => {
      console.warn(
        `[ekg-engine] exited (code=${code ?? "null"}, signal=${signal ?? "null"})`,
      );
      ekgProcess = null;
    });

    await waitForEngineHealth(baseUrl, EKG_ENGINE_STARTUP_TIMEOUT_MS);
  })();

  try {
    await startupInFlight;
  } finally {
    startupInFlight = null;
  }
}

export async function ensureEmbeddedEkgEngineReady(): Promise<void> {
  if (!isEmbeddedEkgEnabled()) {
    return;
  }

  await initializeEmbeddedEkgEngine();
}

export function stopEmbeddedEkgEngine() {
  if (!ekgProcess) {
    return;
  }

  const processRef = ekgProcess;
  ekgProcess = null;
  processRef.kill("SIGTERM");
}

export function registerEmbeddedEkgShutdownHandlers() {
  if (shutdownHooksRegistered) {
    return;
  }

  shutdownHooksRegistered = true;

  process.on("exit", stopEmbeddedEkgEngine);
  process.on("SIGINT", () => {
    stopEmbeddedEkgEngine();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stopEmbeddedEkgEngine();
    process.exit(0);
  });
}
