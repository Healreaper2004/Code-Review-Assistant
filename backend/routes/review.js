import express from "express";
import multer from "multer";
import dotenv from "dotenv";

import { reviewLimiter } from "../middleware/rateLimit.js";
import { detectLanguage, truncateForLLM } from "../services/processor.js";
import { reviewWithGemini } from "../services/geminiClient.js";

dotenv.config();
const router = express.Router();

// ---- Upload limits (from .env)
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 1);
const MAX_FILES = Number(process.env.MAX_FILES || 20);

// ---- Multer in-memory (so we can pass buffers to Gemini and avoid fs cleanup)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: isNaN(MAX_FILES) ? 20 : MAX_FILES,
    fileSize: (isNaN(MAX_FILE_MB) ? 1 : MAX_FILE_MB) * 1024 * 1024,
  },
});

/**
 * Accept EITHER:
 *  - application/json  { "prompt": "..." }
 *  - multipart/form-data with one or more files (field name "files") and optional "prompt"
 */
router.post("/", reviewLimiter, upload.array("files"), async (req, res) => {
  try {
    const promptInput = (req.body?.prompt || "").toString().trim();
    const files = req.files || [];

    if (!promptInput && files.length === 0) {
      return res.status(400).json({ error: "Provide a prompt or upload at least one file." });
    }

    const reviews = [];

    // If files are provided, review each file
    if (files.length > 0) {
      for (const file of files) {
        // file.buffer is a Buffer in memory
        const raw = file.buffer.toString("utf8");
        const content = truncateForLLM(raw);
        const language = detectLanguage(file.originalname);

        // Backward-compatible call: your gemini client previously accepted an object
        const review = await reviewWithGemini({
          filename: file.originalname,
          language,
          // prepend optional prompt if provided
          content: promptInput
            ? `${promptInput}\n\n---\n\n${content}`
            : content,
        });

        reviews.push(review);
      }
    }

    // If only prompt is provided (no files), do a single "virtual file" review
    if (files.length === 0 && promptInput) {
      const content = truncateForLLM(promptInput);
      const review = await reviewWithGemini({
        filename: "prompt.txt",
        language: "plaintext",
        content,
      });
      reviews.push(review);
    }

    const totalIssues = reviews.reduce((acc, r) => acc + (r?.issues?.length || 0), 0);

    return res.json({
      report_id: `report_${Date.now()}`,
      status: "completed",
      summary: `Automated code review completed. ${totalIssues} issue(s) found across ${reviews.length} item(s).`,
      files: reviews,
    });
  } catch (err) {
    console.error("Review route error:", err);
    return res.status(500).json({ error: "Review failed. Check server logs." });
  }
});

router.get("/_models", async (_req, res) => {
  try {
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
    const j = await r.json();
    res.json((j.models || []).map(m => ({
      name: (m.name || '').replace(/^models\//, ''),
      methods: m.supportedGenerationMethods || []
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


export default router;
