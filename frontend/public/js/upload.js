const uploadForm = document.getElementById('uploadForm');
const tagsContainer = document.getElementById('tagsContainer');
const addTagBtn = document.getElementById('addTagBtn');

const generateId = label => label.toLowerCase().trim().replace(/\s+/g, '-');
const ImageUrl = window.IMAGE_SERVICE_URL || 'http://localhost:3001';

addTagBtn.addEventListener('click', () => {
  const tagRow = document.createElement('div');
  tagRow.className = 'd-flex align-items-center mb-2 gap-2';

  tagRow.innerHTML = `
    <input type="text" placeholder="Label" class="form-control form-control-sm tag-label" required />
    <input type="color" class="form-control form-control-color tag-color" value="#6c757d" title="Choose tag color" />
    <button type="button" class="btn btn-sm btn-danger remove-tag">✖</button>
  `;

  tagRow.querySelector('.remove-tag').addEventListener('click', () => {
    tagsContainer.removeChild(tagRow);
  });

  tagsContainer.appendChild(tagRow);
});

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData();

  formData.append('image', form.image.files[0]);
  formData.append('title', form.title.value);
  formData.append('description', form.description.value);

  const tags = [];
  const labelInputs = form.querySelectorAll('.tag-label');
  const colorInputs = form.querySelectorAll('.tag-color');

  labelInputs.forEach((labelInput, i) => {
    const label = labelInput.value.trim();
    const color = colorInputs[i].value;
    if (label) {
      tags.push({
        id: generateId(label),
        label: label,
        color: color
      });
    }
  });

  formData.append('tags', JSON.stringify(tags));

  const result = document.getElementById('result');
  result.innerHTML = 'Uploading...';

  try {
    const res = await fetch(`${ImageUrl}/api/images/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      result.innerHTML = `<div class="alert alert-success">Upload successful! Redirecting to gallery...</div>`;
      window.location.href = 'index.html';
    } else {
      throw new Error(data.message || 'Upload failed');
    }
  } catch (err) {
    result.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
});
