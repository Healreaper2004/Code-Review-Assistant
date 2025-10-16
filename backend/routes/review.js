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

// ---- Multer in-memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: isNaN(MAX_FILES) ? 20 : MAX_FILES,
    fileSize: (isNaN(MAX_FILE_MB) ? 1 : MAX_FILE_MB) * 1024 * 1024,
  },
});

/**
 * Accept ANY of:
 *  - JSON: { code, language?, filename?, prompt? }
 *  - multipart/form-data: files[] (field "files") and optional "prompt"
 *  - JSON: { prompt } only (virtual single review)
 */
router.post("/", reviewLimiter, upload.array("files"), async (req, res) => {
  try {
    const isJson = req.is("application/json");
    const files = req.files || [];
    const promptInput = (req.body?.prompt || "").toString().trim();

    const reviews = [];

    // ---- Case A: JSON { code, language?, filename?, prompt? }
    if (isJson && (req.body?.code ?? "").toString().trim()) {
      const raw = (req.body.code || "").toString();
      const language =
        (req.body.language || "").toString().trim() ||
        detectLanguage(req.body.filename || "pasted.txt");
      const filename =
        (req.body.filename || "").toString().trim() ||
        `pasted-${language || "text"}.txt`;

      const content = truncateForLLM(
        promptInput ? `${promptInput}\n\n---\n\n${raw}` : raw
      );

      const review = await reviewWithGemini({ filename, language, content });
      reviews.push(review);
    }

    // ---- Case B: multipart files[] with optional prompt
    // ---- Case B: multipart files[] with optional prompt
    if (files.length > 0) {
      for (const file of files) {
        const raw = file.buffer.toString("utf8");
        if (!raw.trim()) continue;  // ✅ Skip empty files

        const content = truncateForLLM(
          promptInput ? `${promptInput}\n\n---\n\n${raw}` : raw
        );

        const language = detectLanguage(file.originalname) || "plaintext";

        const review = await reviewWithGemini({
          filename: file.originalname,
          language,
          content,
        });

        reviews.push(review);
      }
    }

    // ---- Case C: prompt only (virtual file)
    if (reviews.length === 0 && promptInput) {
      const content = truncateForLLM(promptInput);
      const review = await reviewWithGemini({
        filename: "prompt.txt",
        language: "plaintext",
        content,
      });
      reviews.push(review);
    }

    if (reviews.length === 0) {
      return res
        .status(400)
        .json({ error: "Provide {code} JSON, or upload file(s), or a prompt." });
    }

    const totalIssues = reviews.reduce(
      (acc, r) => acc + (r?.issues?.length || 0),
      0
    );

    return res.json({
      report_id: `report_${Date.now()}`,
      status: "completed",
      summary: `Automated code review completed. ${totalIssues} issue(s) found across ${reviews.length} item(s).`,
      files: reviews,
    });
  } catch (err) {
    console.error("Review route error:", err);
    return res.status(500).json({ error: err.message || "Review failed. Check server logs." });
  }
});

router.get("/_models", async (_req, res) => {
  try {
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) return res.status(400).json({ error: "Missing API key" });
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
