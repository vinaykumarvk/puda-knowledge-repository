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
// This function should NEVER be called in production (NODE_ENV=production)
export async function setupVite(app: Express, server: Server) {
  // Guard: This should never run in production
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: setupVite called in production mode. This should not happen.');
    throw new Error('setupVite cannot be called in production');
  }
  
  // Dynamic imports - only load vite packages when this function is called (development only)
  const { createServer: createViteServer, createLogger } = await import("vite");
  const { nanoid } = await import("nanoid");
  
  // Import vite config dynamically
  // This path is relative to the source file location (server/vite.ts -> ../vite.config.ts)
  // Use a try-catch to handle if vite.config is not available (shouldn't happen in dev)
  let viteConfig;
  try {
    const viteConfigModule = await import("../vite.config");
    viteConfig = viteConfigModule.default;
  } catch (e) {
    console.error('Failed to import vite.config:', e);
    throw new Error('vite.config.ts is required for development mode');
  }
  
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
  // In production, built files are in dist/public (relative to dist/index.js)
  // The current directory is /app and dist/index.js is at /app/dist/index.js
  // So relative to dist/index.js, public is at ./public (same directory)
  const distPublicPath = path.resolve(import.meta.dirname, "public");
  // Also check the dist/public path relative to the app root
  const altPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  // And check for a public folder in the current directory
  const fallbackPath = path.resolve(process.cwd(), "dist", "public");

  let staticPath: string | null = null;
  
  if (fs.existsSync(distPublicPath)) {
    staticPath = distPublicPath;
  } else if (fs.existsSync(altPath)) {
    staticPath = altPath;
  } else if (fs.existsSync(fallbackPath)) {
    staticPath = fallbackPath;
  }

  if (!staticPath) {
    console.error('Could not find static files directory. Checked:');
    console.error(`  - ${distPublicPath}`);
    console.error(`  - ${altPath}`);
    console.error(`  - ${fallbackPath}`);
    console.error(`Current directory: ${process.cwd()}`);
    console.error(`import.meta.dirname: ${import.meta.dirname}`);
    
    // List what's in the dist directory
    const distDir = path.resolve(import.meta.dirname);
    if (fs.existsSync(distDir)) {
      console.error(`Contents of ${distDir}:`, fs.readdirSync(distDir));
    }
    
    throw new Error(
      `Could not find the build directory. Make sure to build the client first with 'npm run build'`,
    );
  }

  console.log(`Serving static files from: ${staticPath}`);
  app.use(express.static(staticPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(staticPath!, "index.html"));
  });
}
