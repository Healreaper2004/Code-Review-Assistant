import fs from 'fs';
import path from 'path';


// Basic heuristics: detect language from extension
export function detectLanguage(filename = '') {
const ext = filename.split('.').pop()?.toLowerCase();
const map = {
js: 'JavaScript', ts: 'TypeScript', jsx: 'JSX', tsx: 'TSX',
py: 'Python', java: 'Java', cs: 'C#', cpp: 'C++', c: 'C',
go: 'Go', rb: 'Ruby', php: 'PHP', swift: 'Swift', kt: 'Kotlin',
rs: 'Rust', sql: 'SQL', sh: 'Shell', md: 'Markdown', json: 'JSON',
html: 'HTML', css: 'CSS', yml: 'YAML', yaml: 'YAML'
};
return map[ext] || 'PlainText';
}


export function readFileUTF8(tempPath) {
return fs.readFileSync(path.join(tempPath), 'utf8');
}


export function truncateForLLM(text, maxChars = 180_000) {
// Safety guard for context limits
if (text.length <= maxChars) return text;
const head = text.slice(0, Math.floor(maxChars * 0.6));
const tail = text.slice(-Math.floor(maxChars * 0.3));
const note = '\n\n/* [Truncated middle for token limit] */\n\n';
return head + note + tail;
}