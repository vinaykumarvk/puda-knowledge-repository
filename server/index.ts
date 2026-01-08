import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// import { seedUsers } from "./seed-users"; // Commented out - not used in production
import { initializeDomainRegistry } from "./services/domainRegistry";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('Starting server initialization...');
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`PORT: ${process.env.PORT || '5000'}`);
    
    // Ensure domain registry reflects latest vector stores before wiring routes
    // This may fail if OpenAI API is not configured, but we continue anyway
    console.log('Initializing domain registry...');
    await initializeDomainRegistry().catch((err) => {
      console.warn('Domain registry initialization failed (non-fatal):', err.message);
    });
    console.log('Domain registry initialized');

  // Serve attached assets FIRST (before routes and Vite)
  // This ensures the static files are served correctly
  console.log('Setting up routes...');
  app.use("/attached_assets", express.static("attached_assets"));
  
  const server = await registerRoutes(app);
  console.log('Routes registered');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (status >= 500) {
      console.error(err);
    }

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  console.log('Setting up static file serving...');
  if (app.get("env") === "development") {
    await setupVite(app, server);
    console.log('Vite dev server configured');
  } else {
    serveStatic(app);
    console.log('Static file serving configured');
  }

  // Seed sample users on startup - disabled in production
  // await seedUsers();

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Cloud Run uses PORT env var (defaults to 8080)
  // For local dev, default to 5000 if not specified
  const port = parseInt(process.env.PORT || (process.env.NODE_ENV === 'production' ? '8080' : '5000'), 10);
  
  // Use standard Node.js server.listen() syntax
  // Cloud Run requires listening on 0.0.0.0 to accept external connections
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    console.log(`Server started successfully on port ${port}`);
  });
  
  // Handle server errors
  server.on('error', (err: any) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    }
    process.exit(1);
  });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
