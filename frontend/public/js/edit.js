const imageId = new URLSearchParams(window.location.search).get('imageId');
const form = document.getElementById('editForm');
const result = document.getElementById('result');
const tagsContainer = document.getElementById('tagsContainer');
const addTagBtn = document.getElementById('addTagBtn');

const generateId = label => label.toLowerCase().trim().replace(/\s+/g, '-');
const metaUrl = window.META_SERVICE_URL || 'http://localhost:3002';

function renderTag({ label, color }) {
  const tagRow = document.createElement('div');
  tagRow.className = 'd-flex align-items-center mb-2 gap-2';

  tagRow.innerHTML = `
    <input type="text" value="${label}" placeholder="Label" class="form-control form-control-sm tag-label" required />
    <input type="color" class="form-control form-control-color tag-color" value="${color || '#6c757d'}" />
    <button type="button" class="btn btn-sm btn-danger remove-tag">✖</button>
  `;

  tagRow.querySelector('.remove-tag').addEventListener('click', () => {
    tagsContainer.removeChild(tagRow);
  });

  tagsContainer.appendChild(tagRow);
}

addTagBtn.addEventListener('click', () => {
  renderTag({ label: '', color: '#6c757d' });
});

async function loadMetadata() {
  try {
    const res = await fetch(`${metaUrl}/api/meta/by-imageId?imageId=${imageId}`);
    if (!res.ok) throw new Error('Metadata not found');

    const meta = await res.json();
    form.title.value = meta.title || '';
    form.description.value = meta.description || '';
    document.getElementById('imagePreview').src = meta.fileUrl;

    (meta.tags || []).forEach(tag => renderTag(tag));
  } catch (err) {
    result.innerHTML = `<div class="alert alert-danger">Failed to load metadata</div>`;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const labels = form.querySelectorAll('.tag-label');
  const colors = form.querySelectorAll('.tag-color');
  const tags = [];

  labels.forEach((labelInput, i) => {
    const label = labelInput.value.trim();
    const color = colors[i].value;
    if (label) {
      tags.push({
        id: generateId(label),
        label,
        color
      });
    }
  });

  const payload = {
    imageId,
    title: form.title.value,
    description: form.description.value,
    tags
  };

  try {
    const res = await fetch(`${metaUrl}/api/meta/${imageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Failed to update metadata');
    result.innerHTML = `<div class="alert alert-success">Metadata updated! Redirecting to gallery...</div>`;
    window.location.href = 'index.html';
  } catch (err) {
    result.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
});

loadMetadata();
