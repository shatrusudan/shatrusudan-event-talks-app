// Application State
let appState = {
    rawData: [],
    flatUpdates: [],
    selectedUpdates: new Set(), // Set of update.id
    searchQuery: '',
    activeFilter: 'all', // 'all', 'Feature', 'Announcement', 'Issue', 'Deprecated', 'Fixed'
    sidebarFilter: 'all', // 'all', 'features', 'announcements', 'issues'
    lastFetched: null
};

// UI Elements
const els = {
    refreshBtn: document.getElementById('refresh-btn'),
    syncTime: document.querySelector('.sync-time'),
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    categoryFilters: document.getElementById('category-filters'),
    skeletonLoader: document.getElementById('skeleton-loader'),
    emptyState: document.getElementById('empty-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    feedContainer: document.getElementById('release-notes-feed'),
    
    // Sidebar items
    navAll: document.getElementById('nav-all'),
    navFeatures: document.getElementById('nav-features'),
    navAnnouncements: document.getElementById('nav-announcements'),
    navIssues: document.getElementById('nav-issues'),
    
    // Floating Banner
    floatingBanner: document.getElementById('floating-action-banner'),
    selectedCount: document.getElementById('selected-count'),
    bannerTweetBtn: document.getElementById('banner-tweet-btn'),
    bannerClearBtn: document.getElementById('banner-clear-btn'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    modalClose: document.getElementById('modal-close'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    tweetPreviewList: document.getElementById('tweet-preview-list'),
    charProgressCircle: document.getElementById('char-progress-circle'),
    charCountText: document.getElementById('char-count-text'),
    tweetCopyBtn: document.getElementById('tweet-copy-btn'),
    tweetSubmitBtn: document.getElementById('tweet-submit-btn'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toast-icon'),
    toastMessage: document.getElementById('toast-message'),
    
    // Action buttons inside empty/error states
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    retryBtn: document.getElementById('retry-btn'),
    
    // Theme Toggle & Export
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initEventListeners();
    fetchReleases();
});

// Event Listeners Setup
function initEventListeners() {
    // Refresh & Sync
    els.refreshBtn.addEventListener('click', () => fetchReleases(true));
    els.retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Searching
    els.searchInput.addEventListener('input', handleSearchInput);
    els.clearSearch.addEventListener('click', handleClearSearch);
    
    // Category chips
    els.categoryFilters.addEventListener('click', handleCategoryFilter);
    els.resetFiltersBtn.addEventListener('click', resetAllFilters);
    
    // Sidebar nav
    els.navAll.addEventListener('click', (e) => handleSidebarNav(e, 'all', els.navAll));
    els.navFeatures.addEventListener('click', (e) => handleSidebarNav(e, 'features', els.navFeatures));
    els.navAnnouncements.addEventListener('click', (e) => handleSidebarNav(e, 'announcements', els.navAnnouncements));
    els.navIssues.addEventListener('click', (e) => handleSidebarNav(e, 'issues', els.navIssues));
    
    // Floating banner
    els.bannerClearBtn.addEventListener('click', clearSelection);
    els.bannerTweetBtn.addEventListener('click', openTweetComposerForSelection);
    
    // Modal actions
    els.modalClose.addEventListener('click', closeTweetModal);
    els.tweetModal.addEventListener('click', (e) => {
        if (e.target === els.tweetModal) closeTweetModal();
    });
    els.tweetTextarea.addEventListener('input', handleTweetTextareaInput);
    els.tweetCopyBtn.addEventListener('click', handleCopyTweet);
    els.tweetSubmitBtn.addEventListener('click', handlePostTweet);
    
    // Theme toggle & Export CSV
    els.themeToggleBtn.addEventListener('click', toggleTheme);
    els.exportCsvBtn.addEventListener('click', exportToCSV);
}

// Fetch Release Notes
async function fetchReleases(refresh = false) {
    showLoadingState();
    
    try {
        const url = refresh ? '/api/releases?refresh=true' : '/api/releases';
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'error') {
            throw new Error(result.error || 'Unknown server error');
        }
        
        // Save raw data
        appState.rawData = result.data;
        appState.lastFetched = result.last_fetched;
        
        // Flatten for easier processing
        flattenReleases();
        
        // Clear old selection
        appState.selectedUpdates.clear();
        updateFloatingBanner();
        
        // Render
        renderFeed();
        updateSyncIndicator();
        
    } catch (err) {
        console.error('Error fetching release notes:', err);
        showErrorState(err.message);
    }
}

// Flatten JSON feed updates for easy sorting and search
function flattenReleases() {
    appState.flatUpdates = [];
    
    appState.rawData.forEach((entry, entryIdx) => {
        entry.updates.forEach((update, updateIdx) => {
            appState.flatUpdates.push({
                id: `${entryIdx}_${updateIdx}`,
                entryIndex: entryIdx,
                updateIndex: updateIdx,
                date: entry.title,
                updatedRaw: entry.updated,
                link: entry.link,
                type: update.type,
                html: update.description_html,
                text: update.description_text
            });
        });
    });
}

// Filter and Group Updates
function getFilteredUpdates() {
    return appState.flatUpdates.filter(update => {
        // 1. Search Query Filter
        if (appState.searchQuery) {
            const query = appState.searchQuery.toLowerCase();
            const textMatch = update.text.toLowerCase().includes(query);
            const typeMatch = update.type.toLowerCase().includes(query);
            const dateMatch = update.date.toLowerCase().includes(query);
            if (!textMatch && !typeMatch && !dateMatch) {
                return false;
            }
        }
        
        // 2. Category Filter (All chip at the top)
        if (appState.activeFilter !== 'all') {
            if (update.type.toLowerCase() !== appState.activeFilter.toLowerCase()) {
                return false;
            }
        }
        
        // 3. Sidebar Filter groups
        if (appState.sidebarFilter !== 'all') {
            const type = update.type.toLowerCase();
            if (appState.sidebarFilter === 'features') {
                if (type !== 'feature' && type !== 'fixed') return false;
            } else if (appState.sidebarFilter === 'announcements') {
                if (type !== 'announcement' && type !== 'general') return false;
            } else if (appState.sidebarFilter === 'issues') {
                if (type !== 'issue' && type !== 'deprecated') return false;
            }
        }
        
        return true;
    });
}

// Group Flat Array by Date for Chronological Groups
function groupUpdatesByDate(updates) {
    const grouped = {};
    updates.forEach(update => {
        if (!grouped[update.date]) {
            grouped[update.date] = [];
        }
        grouped[update.date].push(update);
    });
    return grouped;
}

// Render Feed
function renderFeed() {
    const filtered = getFilteredUpdates();
    
    if (filtered.length === 0) {
        showEmptyState();
        return;
    }
    
    hideStates();
    
    const grouped = groupUpdatesByDate(filtered);
    let feedHTML = '';
    
    // Render timeline grouped by date
    Object.keys(grouped).forEach(date => {
        const updates = grouped[date];
        
        feedHTML += `
            <div class="date-group" data-date="${date}">
                <div class="group-date">${date}</div>
                <div class="group-cards">
        `;
        
        updates.forEach(update => {
            const isSelected = appState.selectedUpdates.has(update.id);
            const selectedClass = isSelected ? 'selected' : '';
            const badgeClass = getBadgeClass(update.type);
            
            feedHTML += `
                <article class="update-card ${selectedClass}" data-id="${update.id}" id="card-${update.id}">
                    <div class="card-header-row">
                        <div class="card-meta">
                            <div class="card-select-container" onclick="toggleSelectCard('${update.id}', event)">
                                <div class="checkbox-custom">
                                    <i class="fa-solid fa-check"></i>
                                </div>
                            </div>
                            <span class="badge ${badgeClass}">${update.type}</span>
                        </div>
                        
                        <div class="card-actions-top">
                            <!-- Click bubble avoids toggling select card -->
                            <button class="btn btn-card-action" onclick="copySingleUpdate('${update.id}', event)" title="Copy description to clipboard">
                                <i class="fa-solid fa-copy"></i> Copy
                            </button>
                            <button class="btn btn-secondary btn-card-tweet" onclick="openTweetComposerForSingle('${update.id}', event)">
                                <i class="fa-brands fa-x-twitter"></i> Tweet
                            </button>
                        </div>
                    </div>
                    
                    <div class="card-content" onclick="toggleSelectCard('${update.id}', event)">
                        ${update.html}
                    </div>
                </article>
            `;
        });
        
        feedHTML += `
                </div>
            </div>
        `;
    });
    
    els.feedContainer.innerHTML = feedHTML;
    els.feedContainer.style.display = 'flex';
}

function getBadgeClass(type) {
    const t = type.toLowerCase();
    if (t === 'feature') return 'feature';
    if (t === 'announcement') return 'announcement';
    if (t === 'issue') return 'issue';
    if (t === 'deprecated') return 'deprecated';
    if (t === 'fixed') return 'fixed';
    return 'general';
}

// Card Selection Logic
window.toggleSelectCard = function(id, event) {
    // If user clicked an anchor link inside card, let the browser process it without selecting card
    if (event.target.tagName === 'A') {
        return;
    }
    
    event.stopPropagation();
    
    const card = document.getElementById(`card-${id}`);
    
    if (appState.selectedUpdates.has(id)) {
        appState.selectedUpdates.delete(id);
        card.classList.remove('selected');
    } else {
        appState.selectedUpdates.add(id);
        card.classList.add('selected');
    }
    
    updateFloatingBanner();
};

function clearSelection() {
    appState.selectedUpdates.clear();
    document.querySelectorAll('.update-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    updateFloatingBanner();
}

function updateFloatingBanner() {
    const count = appState.selectedUpdates.size;
    els.selectedCount.textContent = count;
    
    if (count > 0) {
        els.floatingBanner.classList.add('show');
    } else {
        els.floatingBanner.classList.remove('show');
    }
}

// Smart Tweet Composers
function composeTweetText(selectedItems) {
    if (selectedItems.length === 0) return '';
    
    const hashtags = "\n#BigQuery #GCP";
    const link = selectedItems[0].link || "https://cloud.google.com/bigquery/docs/release-notes";
    
    if (selectedItems.length === 1) {
        const item = selectedItems[0];
        const prefix = `BigQuery Update (${item.date}):\n[${item.type}] `;
        const footer = `\n${link}${hashtags}`;
        
        // Character count calculations
        const availableLength = 280 - prefix.length - footer.length;
        let content = item.text;
        
        if (content.length > availableLength) {
            content = content.substring(0, availableLength - 3) + "...";
        }
        return `${prefix}${content}${footer}`;
    } else {
        // Multi-updates selection tweet compose
        const prefix = `BigQuery Updates:\n`;
        const footer = `\nRead more: ${link}${hashtags}`;
        
        let availableLength = 280 - prefix.length - footer.length;
        let itemsText = "";
        
        selectedItems.forEach((item, idx) => {
            const itemPrefix = `• [${item.type}] `;
            const remainingBudget = availableLength - itemPrefix.length - 2; // account for newline
            let itemContent = item.text;
            
            // Allocate space dynamically among the rest of elements
            const singleItemBudget = Math.floor(availableLength / (selectedItems.length - idx));
            const budgetForContent = singleItemBudget - itemPrefix.length - 2;
            
            if (itemContent.length > budgetForContent && budgetForContent > 10) {
                itemContent = itemContent.substring(0, budgetForContent - 3) + "...";
            }
            
            const line = `${itemPrefix}${itemContent}\n`;
            itemsText += line;
            availableLength -= line.length;
        });
        
        return `${prefix}${itemsText}${footer}`;
    }
}

// Modal handling
window.openTweetComposerForSingle = function(id, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const selectedItem = appState.flatUpdates.find(u => u.id === id);
    if (!selectedItem) return;
    
    openTweetModal([selectedItem]);
};

function openTweetComposerForSelection() {
    const selectedItems = appState.flatUpdates.filter(u => appState.selectedUpdates.has(u.id));
    if (selectedItems.length === 0) return;
    
    openTweetModal(selectedItems);
}

function openTweetModal(items) {
    // Render Modal previews list
    let previewsHTML = '';
    items.forEach(item => {
        previewsHTML += `
            <div class="preview-item">
                <div class="preview-item-info">
                    <span class="badge ${getBadgeClass(item.type)}">${item.type}</span>
                    <span>${item.date}</span>
                </div>
            </div>
        `;
    });
    els.tweetPreviewList.innerHTML = previewsHTML;
    
    // Store items as list attributes or global for removal handling
    const defaultText = composeTweetText(items);
    els.tweetTextarea.value = defaultText;
    
    // Update character counts and show modal
    updateCharCounter();
    els.tweetModal.classList.add('show');
}

function closeTweetModal() {
    els.tweetModal.classList.remove('show');
}

// Textarea event handler
function handleTweetTextareaInput() {
    updateCharCounter();
}

function updateCharCounter() {
    const limit = 280;
    const text = els.tweetTextarea.value;
    const charCount = text.length;
    const remaining = limit - charCount;
    
    els.charCountText.textContent = remaining;
    
    // Circular SVG Progress calculation
    // Radius of circle = 12. Circumference = 2 * PI * r = 75.398
    const circumference = 2 * Math.PI * 12;
    const percentage = Math.min(charCount / limit, 1);
    const dashOffset = circumference - (percentage * circumference);
    
    els.charProgressCircle.style.strokeDasharray = circumference;
    els.charProgressCircle.style.strokeDashoffset = dashOffset;
    
    const container = document.querySelector('.char-counter-container');
    container.classList.remove('warning', 'error');
    
    if (remaining <= 0) {
        container.classList.add('error');
        els.charProgressCircle.style.stroke = 'var(--color-issue)';
    } else if (remaining <= 20) {
        container.classList.add('warning');
        els.charProgressCircle.style.stroke = 'var(--bq-accent)';
    } else {
        els.charProgressCircle.style.stroke = 'var(--primary-blue)';
    }
    
    // Disable submit button if empty or exceeds characters
    els.tweetSubmitBtn.disabled = (charCount === 0 || charCount > limit);
}

// Copy Tweet
function handleCopyTweet() {
    const text = els.tweetTextarea.value;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Tweet copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Post Tweet
function handlePostTweet() {
    const text = els.tweetTextarea.value;
    const encodedText = encodeURIComponent(text);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(twitterUrl, '_blank');
    closeTweetModal();
}

// Toast System
function showToast(message, type = 'success') {
    els.toastMessage.textContent = message;
    
    if (type === 'error') {
        els.toastIcon.className = 'fa-solid fa-circle-exclamation';
        els.toastIcon.style.color = 'var(--color-issue)';
    } else {
        els.toastIcon.className = 'fa-solid fa-check';
        els.toastIcon.style.color = 'var(--color-feature)';
    }
    
    els.toast.classList.add('show');
    setTimeout(() => {
        els.toast.classList.remove('show');
    }, 3000);
}

// Search Handler
function handleSearchInput(e) {
    appState.searchQuery = e.target.value;
    
    if (appState.searchQuery) {
        els.clearSearch.style.display = 'block';
    } else {
        els.clearSearch.style.display = 'none';
    }
    
    renderFeed();
}

function handleClearSearch() {
    els.searchInput.value = '';
    appState.searchQuery = '';
    els.clearSearch.style.display = 'none';
    renderFeed();
}

// Filter Chip Handler
function handleCategoryFilter(e) {
    if (!e.target.classList.contains('filter-chip')) return;
    
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    e.target.classList.add('active');
    appState.activeFilter = e.target.dataset.type;
    
    renderFeed();
}

// Sidebar filters
function handleSidebarNav(e, filterType, activeEl) {
    e.preventDefault();
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    activeEl.classList.add('active');
    appState.sidebarFilter = filterType;
    
    renderFeed();
}

function resetAllFilters() {
    els.searchInput.value = '';
    appState.searchQuery = '';
    els.clearSearch.style.display = 'none';
    
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    document.querySelector('.filter-chip[data-type="all"]').classList.add('active');
    appState.activeFilter = 'all';
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    els.navAll.classList.add('active');
    appState.sidebarFilter = 'all';
    
    renderFeed();
}

// State transition screens
function showLoadingState() {
    els.refreshBtn.classList.add('syncing');
    els.skeletonLoader.style.display = 'block';
    els.feedContainer.style.display = 'none';
    els.emptyState.style.display = 'none';
    els.errorState.style.display = 'none';
}

function hideStates() {
    els.refreshBtn.classList.remove('syncing');
    els.skeletonLoader.style.display = 'none';
    els.emptyState.style.display = 'none';
    els.errorState.style.display = 'none';
}

function showEmptyState() {
    els.refreshBtn.classList.remove('syncing');
    els.skeletonLoader.style.display = 'none';
    els.feedContainer.style.display = 'none';
    els.emptyState.style.display = 'flex';
    els.errorState.style.display = 'none';
}

function showErrorState(message) {
    els.refreshBtn.classList.remove('syncing');
    els.skeletonLoader.style.display = 'none';
    els.feedContainer.style.display = 'none';
    els.emptyState.style.display = 'none';
    els.errorMessage.textContent = message || 'An error occurred during sync.';
    els.errorState.style.display = 'flex';
}

function updateSyncIndicator() {
    if (!appState.lastFetched) return;
    
    const date = new Date(appState.lastFetched * 1000);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    els.syncTime.textContent = `Last synced: ${hours}:${minutes}:${seconds}`;
}

// Copy Single Update Content
window.copySingleUpdate = function(id, event) {
    if (event) event.stopPropagation();
    const update = appState.flatUpdates.find(u => u.id === id);
    if (!update) return;
    
    navigator.clipboard.writeText(update.text).then(() => {
        showToast('Description copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy description: ', err);
    });
};

// Export Filtered Updates to CSV
function exportToCSV() {
    const filtered = getFilteredUpdates();
    if (filtered.length === 0) {
        showToast('No updates to export', 'error');
        return;
    }
    
    // CSV Headers
    const headers = ['Date', 'Type', 'Link', 'Description'];
    
    // Escape quotes and format rows
    const rows = filtered.map(u => {
        const date = u.date.replace(/"/g, '""');
        const type = u.type.replace(/"/g, '""');
        const link = u.link.replace(/"/g, '""');
        const text = u.text.replace(/"/g, '""');
        return `"${date}","${type}","${link}","${text}"`;
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV Exported Successfully!');
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.className = savedTheme === 'light' ? 'light-theme' : 'dark-theme';
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    if (isDark) {
        document.body.className = 'light-theme';
        localStorage.setItem('theme', 'light');
        showToast('Switched to Light Theme');
    } else {
        document.body.className = 'dark-theme';
        localStorage.setItem('theme', 'dark');
        showToast('Switched to Dark Theme');
    }
}
