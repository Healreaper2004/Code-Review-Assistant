// backend/services/geminiClient.js
// ✅ Robust Gemini client with BYPASS_LLM and safe fallbacks

import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const FAIL_ON_MISSING_KEY = String(process.env.FAIL_ON_MISSING_KEY || "").toLowerCase() === "true";
const ENV_MODEL = (process.env.GEMINI_MODEL || "").trim();
const BYPASS_LLM = String(process.env.BYPASS_LLM || "0") === "1";

// Preferred models in order
const PREFERRED = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-1.5-pro-002",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
];

let RESOLVED_MODEL = null;

// ---- List models from Gemini API ----
async function listModelsV1() {
  if (!API_KEY) throw new Error("Missing API key for listModels");
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`List models failed: HTTP ${r.status} ${t}`);
  }
  const j = await r.json();
  return (j.models || []).map((m) => ({
    name: (m.name || "").replace(/^models\//, ""),
    methods: m.supportedGenerationMethods || [],
  }));
}

// ---- Resolve model ----
async function resolveModel() {
  if (RESOLVED_MODEL) return RESOLVED_MODEL;

  // If no key and not forced to fail, default to a known model (mock call anyway)
  if (!API_KEY && !FAIL_ON_MISSING_KEY) {
    RESOLVED_MODEL = ENV_MODEL || "gemini-1.5-flash";
    return RESOLVED_MODEL;
  }

  const models = await listModelsV1();
  const supportsGen = (name) =>
    models.some((m) => m.name === name && m.methods.includes("generateContent"));

  // 1) ENV model if supported
  if (ENV_MODEL && supportsGen(ENV_MODEL)) {
    RESOLVED_MODEL = ENV_MODEL;
    return RESOLVED_MODEL;
  }

  // 2) Preferred list
  for (const want of PREFERRED) {
    if (supportsGen(want)) {
      RESOLVED_MODEL = want;
      return RESOLVED_MODEL;
    }
  }

  // 3) Any model that supports generation
  const any = models.find((m) => m.methods.includes("generateContent"));
  if (any) {
    RESOLVED_MODEL = any.name;
    return RESOLVED_MODEL;
  }

  const names = models.map((m) => `${m.name} [${m.methods.join(",")}]`);
  throw new Error(
    `No compatible Gemini model found for this API key. Available:\n${names.join("\n")}`
  );
}

// ---- Extract JSON helper ----
function extractJson(text) {
  if (!text) return null;
  // ```json fenced block
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }
  // Full JSON
  try {
    return JSON.parse(text);
  } catch {}
  // JSON from last brace block
  const brace = text.match(/\{[\s\S]*\}$/);
  if (brace) {
    try {
      return JSON.parse(brace[0]);
    } catch {}
  }
  return null;
}

// ---- Normalize issue severity ----
function normalizeIssue(o) {
  if (!o || typeof o !== "object") return o;
  const sev = String(o.severity || "").toLowerCase();
  const map = {
    critical: "critical",
    high: "major",
    major: "major",
    medium: "minor",
    minor: "minor",
    low: "info",
    info: "info",
  };
  return { ...o, severity: map[sev] || "info" };
}

// ---- Main review function ----
export async function reviewWithGemini({ filename, language, content }) {
  console.log("🚀 [Gemini] BYPASS_LLM =", BYPASS_LLM);
  console.log("🚀 [Gemini] API_KEY present =", !!API_KEY);

  // ✅ BYPASS_LLM mode for testing (no external calls)
  if (BYPASS_LLM) {
    return {
      file_path: filename,
      language,
      summary: "Mock review: BYPASS_LLM is enabled. No real Gemini call was made.",
      issues: [
        {
          severity: "info",
          title: "Example mock issue",
          details: "This is a placeholder issue to verify that the pipeline works end-to-end.",
          suggestion: "Set BYPASS_LLM=0 in the environment to enable real Gemini calls.",
          line_start: 1,
          line_end: 1,
        },
      ],
    };
  }

  // ✅ Mock mode if API key is missing but not forced to fail
  if (!API_KEY && !FAIL_ON_MISSING_KEY) {
    return {
      file_path: filename,
      language,
      summary:
        "Processed in MOCK mode (no GEMINI_API_KEY). Connect a real key to enable LLM review.",
      issues: [
        {
          severity: "minor",
          title: "Example: Prefer strict equality",
          details: "Use strict equality (===) to avoid type coercion bugs.",
          suggestion: "Replace == with === where appropriate.",
          line_start: 1,
          line_end: 1,
        },
      ],
    };
  }

  // ✅ Real Gemini API call
  const model = await resolveModel();
  const V1_URL = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
    model
  )}:generateContent?key=${API_KEY}`;

  const system = `
    You are a senior software engineer performing a **comprehensive code review**.
    Analyze the given code **thoroughly**, focusing on:
    - ❌ Syntax errors and compilation issues
    - ⚠️ Security vulnerabilities (e.g., SQL injection, hardcoded secrets, unsafe string operations)
    - 🧠 Logic errors and potential bugs
    - 🏗️ Design issues, anti-patterns, performance problems
    - 🧹 Readability, maintainability, and code smells

    Respond in **valid JSON only** with this format:
    {
      "file_path": "<filename>",
      "language": "<language>",
      "summary": "<short overall review>",
      "issues": [
        {
          "severity": "critical|major|minor|info",
          "title": "<short issue title>",
          "details": "<explanation>",
          "suggestion": "<clear actionable fix>",
          "line_start": <number>,
          "line_end": <number>
        }
      ]
    }

    Do not output markdown. Do not add explanations outside of the JSON.
    `;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: system },
          { text: `File: ${filename}\nLanguage: ${language}\n\n<CODE>\n${content}\n</CODE>` },
        ],
      },
    ],
    generationConfig: { temperature: 0, topP: 0.1, topK: 1, maxOutputTokens: 2048 },
  };

  const r = await fetch(V1_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    console.error(`❌ Gemini API error [${r.status}]:`, errText);
    if (r.status === 404) RESOLVED_MODEL = null; // retry model resolve next call
    return {
      file_path: filename,
      language,
      summary: `LLM error: HTTP ${r.status}. ${errText || "No details."}`,
      issues: [],
    };
  }

  const j = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";

  const parsed = extractJson(text);
  if (parsed && parsed.file_path && parsed.language && Array.isArray(parsed.issues)) {
    parsed.issues = parsed.issues.map(normalizeIssue);
    return parsed;
  }

  return {
    file_path: filename,
    language,
    summary: text || "No content returned.",
    issues: [],
  };
}
