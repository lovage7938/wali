// State
let searchQuery = '';
let heroImageIndex = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    startHeroRotation();
});

function initializeApp() {
    updateTotalImages();
    loadCategories();
}

// Hero background rotation
function startHeroRotation() {
    const aestheticImages = getWallpapers('Aesthetic', '1920x1080');
    if (!aestheticImages || aestheticImages.length === 0) return;

    const heroBackground = document.getElementById('heroBackground');

    // Set initial image
    heroBackground.style.backgroundImage = `url('${aestheticImages[0]}')`;

    // Rotate every 5 seconds
    heroInterval = setInterval(() => {
        heroImageIndex = (heroImageIndex + 1) % aestheticImages.length;
        heroBackground.style.opacity = '0';

        setTimeout(() => {
            heroBackground.style.backgroundImage = `url('${aestheticImages[heroImageIndex]}')`;
            heroBackground.style.opacity = '1';
        }, 500);
    }, 5000);
}

// Download function that fetches and downloads without showing URL
async function downloadImage(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
        console.error('Download failed:', error);
        // Fallback to direct download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function updateTotalImages() {
    let total = 0;
    getAllCategories().forEach(cat => {
        total += getCategoryCount(cat);
    });
    document.getElementById('totalImages').textContent = total.toLocaleString();
}

function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';

    const categories = getAllCategories().filter(cat => {
        if (searchQuery && !cat.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        return true;
    });

    categories.forEach(category => {
        const card = createCategoryCard(category);
        grid.appendChild(card);
    });
}

function createCategoryCard(category) {
    const count = getCategoryCount(category);
    let previewUrl = '';

    // Get preview image
    for (let res of ['1920x1080', '1280x720', '800x600']) {
        const images = getWallpapers(category, res);
        if (images && images.length > 0) {
            previewUrl = images[0];
            break;
        }
    }

    const card = document.createElement('div');
    card.className = 'category-card';
    card.onclick = () => openGallery(category);

    const directUrl = getDirectImageUrlSync(previewUrl);

    card.innerHTML = `
        <img src="${directUrl}" alt="${category}" loading="lazy">
        <div class="category-badge">${count}</div>
        <div class="category-info">
            <h3>${category}</h3>
            <p>${count} wallpapers available</p>
        </div>
    `;

    return card;
}

function openGallery(category) {
    const modal = document.getElementById('galleryModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    document.getElementById('modalTitle').textContent = category;
    modal.dataset.category = category;

    loadGalleryImages(category, '1920x1080');
}

function loadGalleryImages(category, resolution) {
    const grid = document.getElementById('galleryGrid');
    const images = getWallpapers(category, resolution);

    document.getElementById('imageCount').textContent = images.length;

    grid.innerHTML = '';

    if (!images || images.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #6c757d; padding: 4rem;">No wallpapers available for this resolution</p>';
        return;
    }

    images.forEach((url, index) => {
        const item = createGalleryItem(url, category, index + 1, resolution);
        grid.appendChild(item);
    });
}

function createGalleryItem(url, category, number, resolution) {
    const item = document.createElement('div');
    item.className = 'gallery-item';

    const directUrl = getDirectImageUrlSync(url);

    item.onclick = () => openImagePreview(directUrl, category, number, resolution);

    item.innerHTML = `
        <img src="${directUrl}" alt="${category} ${number}" loading="lazy">
        <div class="overlay">
            <p><strong>${category}</strong> #${number}</p>
        </div>
    `;

    return item;
}

function openImagePreview(directUrl, category, number, resolution) {
    const modal = document.getElementById('imageModal');
    modal.classList.add('active');

    document.getElementById('previewImage').src = directUrl;
    document.getElementById('imageName').textContent = `${category} #${number} (${resolution})`;

    const downloadBtn = document.getElementById('downloadBtn');
    const filename = `${category}_${resolution}_${number}.png`;

    // Remove old event listener and add new one
    const newDownloadBtn = downloadBtn.cloneNode(true);
    downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);

    newDownloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        downloadImage(directUrl, filename);
    });
}

function setupEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        loadCategories();
    });


    // Close gallery modal
    document.querySelector('#galleryModal .close-btn').addEventListener('click', () => {
        document.getElementById('galleryModal').classList.remove('active');
        document.body.style.overflow = '';
    });

    document.querySelector('.modal-overlay').addEventListener('click', () => {
        document.getElementById('galleryModal').classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close image modal
    document.querySelector('.image-close-btn').addEventListener('click', () => {
        document.getElementById('imageModal').classList.remove('active');
    });

    document.querySelector('.image-modal-overlay').addEventListener('click', () => {
        document.getElementById('imageModal').classList.remove('active');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('galleryModal').classList.remove('active');
            document.getElementById('imageModal').classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}
