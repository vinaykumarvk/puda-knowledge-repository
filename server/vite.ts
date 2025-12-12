import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

// Log function - used in both dev and production
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// setupVite - ONLY called in development mode
// Uses dynamic imports to avoid loading vite in production
export async function setupVite(app: Express, server: Server) {
  // Dynamic imports - only load vite packages when this function is called (development only)
  const { createServer: createViteServer, createLogger } = await import("vite");
  const { default: viteConfig } = await import("../vite.config");
  const { nanoid } = await import("nanoid");
  
  const viteLogger = createLogger();
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// serveStatic - used in production mode
// No vite dependencies - safe for production
export function serveStatic(app: Express) {
  // In production, built files are in dist/public (relative to server directory)
  // Try dist/public first (production build), then fallback to public (legacy)
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  const fallbackPath = path.resolve(import.meta.dirname, "public");

  const staticPath = fs.existsSync(distPath) ? distPath : fallbackPath;

  if (!fs.existsSync(staticPath)) {
    throw new Error(
      `Could not find the build directory. Tried: ${distPath} and ${fallbackPath}. Make sure to build the client first with 'npm run build'`,
    );
  }

  console.log(`Serving static files from: ${staticPath}`);
  app.use(express.static(staticPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(staticPath, "index.html"));
  });
}
