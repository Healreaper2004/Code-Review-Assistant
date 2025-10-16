import cors from "cors";
import express from "express";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import reviewRoutes from "./routes/review.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Dynamically include your Render URL in allowed origins
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `https://${process.env.RENDER_SERVICE_NAME}.onrender.com`;
const rawOrigins = process.env.CORS_ORIGIN || RENDER_URL;
const allowedOrigins = rawOrigins
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // allow same-origin requests
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: Origin ${origin} is not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Preflight
app.options("*", cors());

// Helmet (CSP disabled for simplicity)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// JSON body parser
const maxMb = Number(process.env.MAX_FILE_MB || 1);
app.use(express.json({ limit: `${isNaN(maxMb) ? 1 : maxMb}mb` }));

// Routes
app.use("/api/review", reviewRoutes);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Static frontend
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend listening on ${PORT}`);
  console.log(`   CORS allowed: ${allowedOrigins.join(", ")}`);
});
