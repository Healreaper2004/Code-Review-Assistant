import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import reviewRoutes from "./routes/review.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Server settings
app.set("x-powered-by", false);
app.set("trust proxy", 1);

// ---- Security (CSP adjusted for static frontend assets)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "https:", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginResourcePolicy: false,
  })
);

// ---- Body limits from env
const maxMb = Number(process.env.MAX_FILE_MB || 1);
app.use(express.json({ limit: `${isNaN(maxMb) ? 1 : maxMb}mb` }));

// ---- CORS (for local dev)
const rawOrigins =
  process.env.CORS_ORIGIN ||
  "http://localhost:3000,http://localhost:5173,http://localhost:5500";
const allowedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // allow same-origin and server-to-server
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: Origin ${origin} is not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

// Preflight
app.options("*", cors());

// ---- Serve static frontend
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// ---- API routes
app.use("/api/review", reviewRoutes);

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ---- Fallback to index.html for SPA / direct routes
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ---- Error handler (keep last)
app.use((err, req, res, _next) => {
  const isDev = process.env.NODE_ENV !== "production";
  const payload = {
    name: err.name || "Error",
    message: err.message || "Server error",
  };
  if (isDev && err.stack) payload.stack = err.stack;
  const code = err.status || 500;
  res.status(code).json(payload);
});

// ---- Start
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend listening on ${PORT}`);
  console.log(`   CORS allowed: ${allowedOrigins.join(", ")}`);
});
