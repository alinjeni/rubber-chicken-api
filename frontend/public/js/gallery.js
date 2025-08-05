const galleryGrid = document.getElementById('galleryGrid');
const tagInput = document.getElementById('tagInput');
const sortSelect = document.getElementById('sortSelect');
const sortOrder = document.getElementById('sortOrder');
const applyBtn = document.getElementById('applyBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageText = document.getElementById('pageText');
const pageButtons = document.getElementById('pageButtons');
const imageUrl = window.IMAGE_SERVICE_URL || 'http://localhost:3001';

let offset = 0;
const limit = 6;

window.addEventListener('DOMContentLoaded', () => {
  const savedFilters = localStorage.getItem('galleryFilters');
  if (savedFilters) {
    const { tags, sortBy, sortOrder: order, includeDuplicates } = JSON.parse(savedFilters);
    tagInput.value = tags || '';
    sortSelect.value = sortBy || 'uploadDate';
    sortOrder.value = order || 'desc';
    document.getElementById('duplicatesCheckbox').checked = !!includeDuplicates;
  }
  loadGallery();
});
applyBtn.addEventListener('click', () => {
  const filters = {
    tags: tagInput.value.trim(),
    sortBy: sortSelect.value,
    sortOrder: sortOrder.value,
    includeDuplicates: document.getElementById('duplicatesCheckbox').checked
  };
  localStorage.setItem('galleryFilters', JSON.stringify(filters));
  offset = 0;
  loadGallery();
});
prevBtn.addEventListener('click', () => {
  if (offset >= limit) {
    offset -= limit;
    loadGallery();
  }
});
nextBtn.addEventListener('click', () => {
  offset += limit;
  loadGallery();
});

document.getElementById('clearFiltersBtn').addEventListener('click', () => {
  localStorage.removeItem('galleryFilters');
  tagInput.value = '';
  sortSelect.value = 'title';
  sortOrder.value = 'desc';
  document.getElementById('duplicatesCheckbox').checked = false;
  offset = 0;
  loadGallery();
});

document.addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('.delete-btn');
  if (!deleteBtn) return;

  const imageId = deleteBtn.dataset.imageId;
  if (!confirm('Are you sure you want to delete this image?')) return;

  try {
    const res = await fetch(`${imageUrl}/api/images/${imageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Delete response:', res);
    if (!res.ok) throw new Error('Delete failed');

    deleteBtn.closest('.card').remove();
    alert('Image deleted successfully');
  } catch (err) {
    alert('Failed to delete image: ' + err.message);
  }
});

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

async function loadGallery() {
  const tags = tagInput.value.trim();
  const sortBy = sortSelect.value;
  const order = sortOrder.value;
  const includeDuplicates = document.getElementById('duplicatesCheckbox').checked;

  const params = new URLSearchParams({
    offset,
    limit,
    sortBy,
    sortOrder: order,
  });
  if (tags) {
    params.append('tagIds', tags);
  }
  if (includeDuplicates) {
    params.append('includeDuplicates', 'true');
  }

  const response = await fetch(`${imageUrl}/api/images/gallery?${params.toString()}`);
  console.log('Fetching gallery data from:', response.url);
  const data = await response.json();
  console.log('Gallery data:', data); 
  renderGallery(data.items || []);
  updatePageText(data.total || 0);
}

function renderGallery(images) {
  galleryGrid.innerHTML = '';

  if (images.length === 0) {
    galleryGrid.innerHTML = `<div class="col"><div class="alert alert-warning">No images found.</div></div>`;
    return;
  }

  images.forEach(img => {
    const { fileUrl, title, description, tags, imageId, uploadDate, modificationDateMeta, fileSize } = img;

    const uploaded = new Date(uploadDate).toLocaleString();
    const modified = new Date(modificationDateMeta).toLocaleString();

    const bottomRightDate = modificationDateMeta
        ? `
          <div class="text-end small text-muted">
            <div>Updated on:</div>
            <div>${modified}</div>
          </div>`
        : `
          <div class="text-end small text-muted">
            <div>Uploaded on:</div>
            <div>${uploaded}</div>
          </div>`;

    const col = document.createElement('div');
    col.className = 'col-md-4';

    col.innerHTML = `
      <div class="card mb-4 shadow-sm">
        <div class="position-relative">
          <img src="${fileUrl}" class="card-img-top" alt="${title}" />
          <div class="position-absolute top-0 start-0 bg-dark bg-opacity-50 text-white px-2 py-1 mx-1 my-1 badge me-1 rounded-end">
            ${formatFileSize(fileSize)}
          </div>
        </div>
        <div class="card-body d-flex flex-column justify-content-between">
          <div>
            <h5 class="card-title">${title || 'Untitled'}</h5>
            <p class="card-text">${description || ''}</p>
            <div class="mb-2">
              ${(tags || [])
                .map(t => `<span class="badge me-1" style="background-color:${t.color}">${t.label}</span>`)
                .join('')}
            </div>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <div>
              <a href="edit.html?imageId=${imageId}" class="btn btn-sm btn-outline-primary" data-bs-toggle="tooltip" title="Edit"><i class="bi bi-pencil"></i></a>
              <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-secondary ms-2" data-bs-toggle="tooltip" title="View"><i class="bi bi-eye"></i></a>
              <button class="btn btn-sm btn-outline-danger delete-btn ms-2" data-image-id="${imageId}" data-bs-toggle="tooltip" title="Delete"><i class="bi bi-trash"></i></button>
            </div>
            ${bottomRightDate}
          </div>
        </div>
      </div>
    `;

    galleryGrid.appendChild(col);
  });
}

function updatePageText(total) {
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  pageText.textContent = `Page ${page} of ${totalPages}`;

  prevBtn.disabled = offset === 0;
  nextBtn.disabled = offset + limit >= total;

  pageButtons.innerHTML = '';

  const startPage = Math.max(1, page - 1);
  const endPage = Math.min(totalPages, startPage + 2);

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = `btn btn-sm ${i === page ? 'btn-primary' : 'btn-outline-secondary'}`;
    btn.addEventListener('click', () => {
      offset = (i - 1) * limit;
      loadGallery();
    });
    pageButtons.appendChild(btn);
  }
}

loadGallery();