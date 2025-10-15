// ✅ You can override this in DevTools if needed:
// localStorage.setItem('apiBase', 'http://localhost:5000')
const API_BASE = localStorage.getItem('apiBase') || 'http://localhost:5000';

const el = (id) => document.getElementById(id);
const codeInput = el('code');
const languageSelect = el('language');
const fileInput = el('fileUpload');
const fileNameDisplay = el('fileName');
const reviewBtn = el('reviewBtn');
const outputDiv = el('output');

// 📁 Handle file selection and preview
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) {
    fileNameDisplay.textContent = `Selected: ${file.name}`;
    const reader = new FileReader();
    reader.onload = (e) => {
      codeInput.value = e.target.result;
    };
    reader.readAsText(file);
  } else {
    fileNameDisplay.textContent = '';
  }
});

// 📝 Handle code review request
reviewBtn.addEventListener('click', async () => {
  const code = codeInput.value.trim();
  const language = languageSelect.value;

  if (!code) {
    alert('Please paste code or upload a file first.');
    return;
  }

  reviewBtn.disabled = true;
  outputDiv.classList.remove('hidden');
  outputDiv.innerHTML = `<div class="status">🔍 Reviewing code…</div>`;

  try {
    const res = await fetch(`${API_BASE}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText.slice(0, 100)}`);
    }

    // ✅ Safer JSON parsing to catch HTML error pages
    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      const text = await res.text();
      throw new Error(`Expected JSON but got: ${text.slice(0, 80)}...`);
    }

    renderReport(data);
  } catch (e) {
    console.error(e);
    outputDiv.innerHTML = `<div class="error">❌ Error: ${e.message}</div>`;
  } finally {
    reviewBtn.disabled = false;
  }
});

// 🧾 Render report nicely
function renderReport(report) {
  outputDiv.innerHTML = '';

  const header = document.createElement('div');
  header.innerHTML = `
    <h2 class="text-lg font-semibold mb-2">Result</h2>
    <div class="small">${escapeHtml(report.summary || '')}</div>
  `;
  outputDiv.appendChild(header);

  (report.files || []).forEach((f) => {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'report-file';
    fileDiv.innerHTML = `
      <div class="mb-1">
        <strong>${escapeHtml(f.file_path || 'Uploaded Code')}</strong>
        <span class="small">(${escapeHtml(f.language || 'Unknown')})</span>
      </div>
      <div class="small mb-2">${escapeHtml(f.summary || '')}</div>
    `;

    const list = document.createElement('div');
    (f.issues || []).forEach((issue) => {
      const div = document.createElement('div');
      div.className = `issue ${issue.severity || ''}`;
      const lines = [issue.line_start, issue.line_end]
        .filter(n => Number.isInteger(n))
        .join('–');

      div.innerHTML = `
        <div><strong>[${escapeHtml(issue.severity || 'info')}] ${escapeHtml(issue.title || '')}</strong></div>
        <div class="small">${lines ? `Lines: <span class="code">${lines}</span>` : ''}</div>
        <div>${escapeHtml(issue.details || '')}</div>
        <div class="small"><em>Suggestion:</em> ${escapeHtml(issue.suggestion || '')}</div>
      `;
      list.appendChild(div);
    });

    fileDiv.appendChild(list);
    outputDiv.appendChild(fileDiv);
  });

  if ((report.files || []).length === 0) {
    outputDiv.innerHTML = `<div class="status">✅ No issues found.</div>`;
  }
}

// 🔐 Escape HTML to prevent XSS
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}
