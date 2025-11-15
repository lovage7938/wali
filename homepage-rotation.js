// Auto-rotation and wallpapers display for homepage
(function() {
    let heroImageIndex = 0;
    let heroInterval = null;
    const aestheticImages = getWallpapers('Aesthetic', '1920x1080');
    let allWallpapers = [];
    let displayedWallpapers = [];
    let currentPage = 1;
    const itemsPerPage = 50; // Load 50 images per page
    let infiniteScrollMode = false; // Start with pagination mode

    if (!aestheticImages || aestheticImages.length === 0) {
        console.log('No aesthetic images found for rotation');
        return;
    }

    // Extract tags/keywords from filename
    function extractTags(filename) {
        // Remove file extension and replace separators with spaces
        const name = filename.replace(/\.(png|jpg|jpeg)$/i, '')
                             .replace(/[-_]/g, ' ')
                             .toLowerCase();

        // Split into words and filter out numbers and short words
        const words = name.split(/\s+/).filter(word =>
            word.length > 2 && !/^\d+$/.test(word)
        );

        return words;
    }

    // Collect all wallpapers from all categories
    function collectAllWallpapers() {
        const categories = getAllCategories();
        const wallpapers = [];

        categories.forEach(category => {
            const images = getWallpapers(category, '1920x1080');
            if (images && images.length > 0) {
                images.forEach((url, index) => {
                    const filename = url.split('/').pop();
                    const tags = extractTags(filename);

                    // Use pre-generated caption from wallpapers-data.js
                    const caption = (typeof getCaption === 'function') ? getCaption(url) : (tags.slice(0, 3).join(', ') || 'wallpaper');

                    wallpapers.push({
                        url: url,
                        category: category,
                        index: index + 1,
                        filename: filename,
                        tags: tags,
                        caption: caption
                    });
                });
            }
        });

        return wallpapers;
    }

    // Shuffle array for random order
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Random hero background
    function initRandomHeroBackground() {
        const heroBackground = document.getElementById('heroBackground');
        const randomIndex = Math.floor(Math.random() * aestheticImages.length);
        heroImageIndex = randomIndex;

        // Set initial random image
        heroBackground.style.backgroundImage = `url('${aestheticImages[heroImageIndex]}')`;
        heroBackground.style.opacity = '1';

        // Rotate every 5 seconds with random images
        heroInterval = setInterval(() => {
            heroImageIndex = Math.floor(Math.random() * aestheticImages.length);
            heroBackground.style.opacity = '0';

            setTimeout(() => {
                heroBackground.style.backgroundImage = `url('${aestheticImages[heroImageIndex]}')`;
                heroBackground.style.opacity = '1';
            }, 500);
        }, 5000);
    }

    // Image loading queue to prevent overwhelming the server
    let imageLoadQueue = [];
    let activeLoads = 0;
    const maxConcurrentLoads = 6; // Limit concurrent image loads

    function loadImageWithRetry(img, url, maxRetries = 5) {
        return new Promise((resolve, reject) => {
            let retryCount = 0;
            
            const attemptLoad = () => {
                img.onload = () => {
                    img.classList.add('loaded');
                    resolve();
                };
                
                img.onerror = () => {
                    retryCount++;
                    if (retryCount <= maxRetries) {
                        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
                        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 16000);
                        console.log(`Retry ${retryCount}/${maxRetries} for image after ${delay}ms`);
                        setTimeout(() => {
                            // Add cache buster to force reload
                            img.src = url + (url.includes('?') ? '&' : '?') + `retry=${retryCount}&t=${Date.now()}`;
                        }, delay);
                    } else {
                        console.error('Failed to load image after retries:', url);
                        // Show placeholder or error state
                        img.classList.add('load-error');
                        resolve(); // Resolve anyway to continue queue
                    }
                };
                
                img.src = url;
            };
            
            attemptLoad();
        });
    }

    async function processImageQueue() {
        while (imageLoadQueue.length > 0 && activeLoads < maxConcurrentLoads) {
            const { img, url } = imageLoadQueue.shift();
            activeLoads++;
            
            try {
                await loadImageWithRetry(img, url);
            } catch (error) {
                console.error('Image load error:', error);
            } finally {
                activeLoads--;
                // Process next item
                if (imageLoadQueue.length > 0) {
                    processImageQueue();
                }
            }
        }
    }

    function queueImageLoad(img, url) {
        imageLoadQueue.push({ img, url });
        processImageQueue();
    }

    // Display wallpapers grid with pagination
    function displayWallpapers(wallpapers) {
        const grid = document.getElementById('wallpapersGrid');
        grid.innerHTML = '';
        
        // Clear queue for new page
        imageLoadQueue = [];
        activeLoads = 0;

        // Calculate pagination
        const totalPages = Math.ceil(wallpapers.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageWallpapers = infiniteScrollMode ? wallpapers : wallpapers.slice(startIndex, endIndex);

        pageWallpapers.forEach((wallpaper, index) => {
            const item = document.createElement('div');
            item.className = 'wallpaper-item';

            const img = document.createElement('img');
            const directUrl = getDirectImageUrlSync(wallpaper.url);
            img.alt = `${wallpaper.caption}`;
            img.className = 'wallpaper-img loading';
            img.loading = 'lazy';
            
            // Add loading placeholder
            img.style.backgroundColor = '#1a1a2e';
            img.style.minHeight = '200px';

            // Use IntersectionObserver for better lazy loading
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        queueImageLoad(img, directUrl);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px' // Start loading 50px before entering viewport
            });
            
            observer.observe(img);

            const info = document.createElement('div');
            info.className = 'wallpaper-item-info';
            info.innerHTML = `
                <div class="wallpaper-meta">
                    <span class="wallpaper-category">${wallpaper.category}</span>
                    <span class="wallpaper-caption">${wallpaper.caption}</span>
                </div>
                <button class="wallpaper-download" data-url="${wallpaper.url}" data-name="${wallpaper.category}_${wallpaper.index}.png">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
            `;

            item.appendChild(img);
            item.appendChild(info);
            grid.appendChild(item);

            // Click to view full image
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.wallpaper-download')) {
                    openImagePreview(wallpaper.url);
                }
            });
        });

        // Add download button listeners
        document.querySelectorAll('.wallpaper-download').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = btn.dataset.url;
                const name = btn.dataset.name;
                downloadImageDirect(url, name);
            });
        });

        // Update pagination controls
        updatePaginationControls(wallpapers.length, totalPages);
    }

    // Update pagination controls
    function updatePaginationControls(totalItems, totalPages) {
        const paginationDiv = document.getElementById('paginationControls');
        const pageNumbersDiv = document.getElementById('pageNumbers');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        // Hide pagination in infinite scroll mode
        if (infiniteScrollMode) {
            paginationDiv.style.display = 'none';
            return;
        }

        paginationDiv.style.display = 'flex';
        pageNumbersDiv.innerHTML = '';

        // Previous button state
        prevBtn.disabled = currentPage === 1;
        prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
        prevBtn.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';

        // Next button state
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
        nextBtn.style.cursor = currentPage === totalPages ? 'not-allowed' : 'pointer';

        // Page numbers (show max 7 page buttons)
        const maxButtons = 7;
        let startPage = Math.max(1, currentPage - 3);
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        // First page
        if (startPage > 1) {
            addPageButton(1, pageNumbersDiv);
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.style.padding = '0.5rem';
                dots.style.color = 'var(--gray)';
                pageNumbersDiv.appendChild(dots);
            }
        }

        // Page number buttons
        for (let i = startPage; i <= endPage; i++) {
            addPageButton(i, pageNumbersDiv);
        }

        // Last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.style.padding = '0.5rem';
                dots.style.color = 'var(--gray)';
                pageNumbersDiv.appendChild(dots);
            }
            addPageButton(totalPages, pageNumbersDiv);
        }

        // Page info
        const pageInfo = document.createElement('span');
        pageInfo.style.color = 'var(--gray)';
        pageInfo.style.fontSize = '0.9rem';
        pageInfo.style.padding = '0.75rem';
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);
        pageInfo.textContent = `Showing ${startItem}-${endItem} of ${totalItems}`;
        pageNumbersDiv.appendChild(pageInfo);
    }

    // Add page number button
    function addPageButton(pageNum, container) {
        const btn = document.createElement('button');
        btn.textContent = pageNum;
        btn.style.padding = '0.5rem 0.75rem';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = '600';
        btn.style.transition = 'all 0.3s';

        if (pageNum === currentPage) {
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
        } else {
            btn.style.background = 'var(--dark)';
            btn.style.color = 'var(--light)';
        }

        btn.addEventListener('click', () => goToPage(pageNum));
        btn.addEventListener('mouseenter', () => {
            if (pageNum !== currentPage) {
                btn.style.background = 'var(--primary)';
                btn.style.opacity = '0.7';
            }
        });
        btn.addEventListener('mouseleave', () => {
            if (pageNum !== currentPage) {
                btn.style.background = 'var(--dark)';
                btn.style.opacity = '1';
            }
        });

        container.appendChild(btn);
    }

    // Go to specific page
    function goToPage(pageNum) {
        currentPage = pageNum;
        displayWallpapers(displayedWallpapers);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Setup pagination event listeners
    function setupPagination() {
        document.getElementById('prevPage').addEventListener('click', () => {
            if (currentPage > 1) {
                goToPage(currentPage - 1);
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            const totalPages = Math.ceil(displayedWallpapers.length / itemsPerPage);
            if (currentPage < totalPages) {
                goToPage(currentPage + 1);
            }
        });

        // Infinite scroll toggle
        document.getElementById('infiniteScrollToggle').addEventListener('click', () => {
            infiniteScrollMode = !infiniteScrollMode;
            const toggleBtn = document.getElementById('infiniteScrollToggle');
            const icon = document.getElementById('scrollModeIcon');

            if (infiniteScrollMode) {
                toggleBtn.style.background = 'linear-gradient(135deg, var(--primary), #9333ea)';
                icon.style.opacity = '1';
                toggleBtn.title = 'Switch to Pagination Mode';
                currentPage = 1;
            } else {
                toggleBtn.style.background = 'rgba(255,255,255,0.1)';
                icon.style.opacity = '0.7';
                toggleBtn.title = 'Toggle Infinite Scroll';
                currentPage = 1;
            }

            displayWallpapers(displayedWallpapers);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Open image preview
    function openImagePreview(url) {
        const modal = document.getElementById('imageModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        const directUrl = getDirectImageUrlSync(url);
        const caption = (typeof getCaption === 'function') ? getCaption(url) : 'Wallpaper';

        document.getElementById('previewImage').src = directUrl;
        document.getElementById('imageName').textContent = caption;

        const downloadBtn = document.getElementById('downloadBtn');
        const newDownloadBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);

        newDownloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            downloadImageDirect(directUrl, `${caption}.png`);
        });
    }

    // Close image modal
    function closeImageModal() {
        const modal = document.getElementById('imageModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Setup close button listeners
    function setupModalCloseListeners() {
        // Close button
        document.querySelector('.image-close-btn').addEventListener('click', closeImageModal);

        // Click outside to close
        document.querySelector('.image-modal-overlay').addEventListener('click', closeImageModal);

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeImageModal();
            }
        });
    }

    // Direct download function
    async function downloadImageDirect(url, filename) {
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

            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch (error) {
            console.error('Download failed:', error);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Search functionality
    function setupSearch() {
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value.toLowerCase().trim();

                if (query.length > 0) {
                    const filtered = allWallpapers.filter(wallpaper => {
                        // Search in category
                        if (wallpaper.category.toLowerCase().includes(query)) return true;

                        // Search in tags
                        if (wallpaper.tags && wallpaper.tags.some(tag => tag.includes(query))) return true;

                        // Search in caption
                        if (wallpaper.caption && wallpaper.caption.toLowerCase().includes(query)) return true;

                        return false;
                    });
                    displayWallpapers(filtered);
                } else {
                    displayWallpapers(displayedWallpapers);
                }
            }, 300); // Debounce for 300ms
        });
    }

    // Initialize
    initRandomHeroBackground();
    allWallpapers = collectAllWallpapers();
    displayedWallpapers = shuffleArray(allWallpapers);
    displayWallpapers(displayedWallpapers);
    setupSearch();
    setupModalCloseListeners();
    setupPagination();

})();