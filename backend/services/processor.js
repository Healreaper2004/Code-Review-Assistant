// Simple helpers for file handling / detection / truncation

const KNOWN = {
  js: "JavaScript", jsx: "JavaScript", ts: "TypeScript", tsx: "TypeScript",
  py: "Python", java: "Java", cs: "C#", cpp: "C++", c: "C",
  rb: "Ruby", go: "Go", php: "PHP", rs: "Rust", kt: "Kotlin",
  swift: "Swift", scala: "Scala", sh: "Shell", bash: "Shell",
  json: "JSON", yml: "YAML", yaml: "YAML", md: "Markdown",
  html: "HTML", css: "CSS", scss: "SCSS"
};

export function detectLanguage(filename = "") {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!m) return "plaintext";
  return KNOWN[m[1]] || "plaintext";
}

export function truncateForLLM(text = "", maxChars = 150_000) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.7));
  const tail = text.slice(-Math.floor(maxChars * 0.3));
  return `${head}\n\n/* ... truncated ... */\n\n${tail}`;
}
