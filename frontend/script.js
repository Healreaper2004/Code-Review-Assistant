// ✅ Auto-detect API base URL
const API_BASE =
  localStorage.getItem('apiBase') ||
  (window.location.hostname.includes('onrender.com')
    ? `https://${window.location.hostname}`
    : '');

const el = (id) => document.getElementById(id);
const codeInput = el('code');
const languageSelect = el('language');
const fileInput = el('fileUpload');
const fileNameDisplay = el('fileName');
const reviewBtn = el('reviewBtn');
const outputDiv = el('output');

// 📁 File upload preview
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

// 📝 Review handler
reviewBtn.addEventListener('click', async () => {
  const code = codeInput.value.trim();
  const language = languageSelect.value;
  const file = fileInput.files[0];

  if (!code && !file) {
    alert('Please paste code or upload a file first.');
    return;
  }

  reviewBtn.disabled = true;
  outputDiv.classList.remove('hidden');
  outputDiv.innerHTML = `<div class="status">🔍 Reviewing code…</div>`;

  try {
    let response;

    if (file) {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('language', language);

      response = await fetch(`${API_BASE}/api/review`, {
        method: 'POST',
        body: formData,
      });
    } else {
      response = await fetch(`${API_BASE}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    renderReport(data);
  } catch (err) {
    console.error(err);
    outputDiv.innerHTML = `<div class="error text-red-600">❌ Error: ${err.message}</div>`;
  } finally {
    reviewBtn.disabled = false;
  }
});

// 🧾 Render result
function renderReport(report) {
  outputDiv.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'mb-4';
  header.innerHTML = `
    <h2 class="text-lg font-semibold mb-2 text-indigo-600">📋 Code Review Result</h2>
    <div class="text-gray-700 text-sm">${escapeHtml(report.summary || '')}</div>
  `;
  outputDiv.appendChild(header);

  (report.files || []).forEach(file => {
    const fileContainer = document.createElement('div');
    fileContainer.className = 'bg-white shadow rounded-lg border border-gray-200 mb-4 p-4';

    const fileHeader = document.createElement('div');
    fileHeader.className = 'flex justify-between items-center cursor-pointer';
    fileHeader.innerHTML = `
      <div>
        <strong class="text-gray-800">${escapeHtml(file.file_path)}</strong>
        <span class="ml-2 text-sm text-gray-500">(${escapeHtml(file.language)})</span>
      </div>
      <span class="text-indigo-600 text-sm">${file.issues.length} issue(s)</span>
    `;

    const issuesList = document.createElement('div');
    issuesList.className = 'mt-3 space-y-3';
    issuesList.style.display = 'block';

    fileHeader.addEventListener('click', () => {
      issuesList.style.display = issuesList.style.display === 'none' ? 'block' : 'none';
    });

    file.issues.forEach(issue => {
      const issueDiv = document.createElement('div');
      issueDiv.className = 'border-l-4 p-3 rounded bg-gray-50';
      issueDiv.style.borderLeftColor = getBadgeColor(issue.severity);

      issueDiv.innerHTML = `
        <div class="flex justify-between items-center mb-1">
          <span class="font-semibold">${escapeHtml(issue.title || '(No title)')}</span>
          <span class="text-xs px-2 py-1 rounded text-white" style="background:${getBadgeColor(issue.severity)}">
            ${escapeHtml(issue.severity || 'info')}
          </span>
        </div>
        <div class="text-sm text-gray-700 mb-1">${escapeHtml(issue.details || '')}</div>
        <div class="text-sm text-gray-500 italic mb-1">Suggestion: ${escapeHtml(issue.suggestion || '')}</div>
        ${issue.line_start ? `<div class="text-xs text-gray-400">Lines: ${issue.line_start}${issue.line_end && issue.line_end !== issue.line_start ? '–' + issue.line_end : ''}</div>` : ''}
      `;
      issuesList.appendChild(issueDiv);
    });

    fileContainer.appendChild(fileHeader);
    fileContainer.appendChild(issuesList);
    outputDiv.appendChild(fileContainer);
  });

  if ((report.files || []).length === 0) {
    outputDiv.innerHTML = `<div class="text-green-600 font-medium">✅ No issues found.</div>`;
  }
}

function getBadgeColor(severity) {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'major': return '#f59e0b';
    case 'minor': return '#0ea5e9';
    case 'info': return '#16a34a';
    default: return '#6b7280';
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}
