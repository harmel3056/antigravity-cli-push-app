// BIGQUERY RELEASE HUB - FRONTEND APP ENGINE

// State Management
let allReleases = [];
let filteredReleases = [];
let currentFilter = 'all';
let searchKeyword = '';

// Active selected update state for the Tweet Modal
let selectedUpdate = {
    text: '',
    type: 'Feature',
    date: '',
    link: ''
};

// SVG Circle circumference for Tweet progress ring
const CIRCUMFERENCE = 2 * Math.PI * 11; // r = 11, circumference = 69.115

// DOM Elements Cache
const elements = {
    refreshBtn: document.getElementById('refreshBtn'),
    refreshIcon: document.getElementById('refreshIcon'),
    cacheStatus: document.getElementById('cacheStatus'),
    cacheStatusText: document.getElementById('cacheStatusText'),
    searchInput: document.getElementById('searchInput'),
    filterChips: document.getElementById('filterChips'),
    timelineContainer: document.getElementById('timelineContainer'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    emptyState: document.getElementById('emptyState'),
    retryBtn: document.getElementById('retryBtn'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    
    // Tweet Modal elements
    tweetModal: document.getElementById('tweetModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelTweetBtn: document.getElementById('cancelTweetBtn'),
    submitTweetBtn: document.getElementById('submitTweetBtn'),
    modalBadge: document.getElementById('modalBadge'),
    modalDate: document.getElementById('modalDate'),
    modalPreviewText: document.getElementById('modalPreviewText'),
    tweetTextarea: document.getElementById('tweetTextarea'),
    toggleLink: document.getElementById('toggleLink'),
    toggleHashtags: document.getElementById('toggleHashtags'),
    charCounter: document.getElementById('charCounter'),
    charCountNum: document.getElementById('charCountNum'),
    progressCircle: document.getElementById('progressCircle'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    toggleAutoTruncate: document.getElementById('toggleAutoTruncate'),
    scrollTopBtn: document.getElementById('scrollTopBtn')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleases(false);
    setupEventListeners();
    setupProgressRing();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh release notes
    elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
    elements.retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Live Search (with small input debouncing)
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchKeyword = e.target.value.trim().toLowerCase();
            applyFilterAndSearch();
        }, 150);
    });
    
    // Category Chips Filtering
    elements.filterChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        
        // Toggle active class
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        currentFilter = chip.dataset.filter;
        applyFilterAndSearch();
    });
    
    // Empty state reset button
    elements.clearFiltersBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        searchKeyword = '';
        currentFilter = 'all';
        document.querySelectorAll('.chip').forEach(c => {
            c.classList.toggle('active', c.dataset.filter === 'all');
        });
        applyFilterAndSearch();
    });
    
    // Modal Close actions
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.cancelTweetBtn.addEventListener('click', closeModal);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) closeModal();
    });
    
    // Tweet composer reactive edits
    elements.tweetTextarea.addEventListener('input', updateTweetCharacterCount);
    elements.toggleLink.addEventListener('change', generateTweetDraft);
    elements.toggleHashtags.addEventListener('change', generateTweetDraft);
    elements.toggleAutoTruncate.addEventListener('change', generateTweetDraft);
    
    // Send Tweet
    elements.submitTweetBtn.addEventListener('click', submitTweet);
    
    // Theme Switcher & CSV Export
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    elements.exportCsvBtn.addEventListener('click', exportToCSV);

    // Scroll to Top action
    elements.scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            elements.scrollTopBtn.classList.remove('hidden');
            setTimeout(() => elements.scrollTopBtn.classList.add('visible'), 10);
        } else {
            elements.scrollTopBtn.classList.remove('visible');
            setTimeout(() => {
                if (!elements.scrollTopBtn.classList.contains('visible')) {
                    elements.scrollTopBtn.classList.add('hidden');
                }
            }, 300);
        }
    });
}

// SETUP PROGRESS RING ON INITIAL LOAD
function setupProgressRing() {
    elements.progressCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    elements.progressCircle.style.strokeDashoffset = CIRCUMFERENCE;
}

// FETCH DATA FROM SERVER API
async function fetchReleases(forceRefresh = false) {
    toggleLoading(true);
    
    try {
        const response = await fetch(`/api/releases?refresh=${forceRefresh}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        allReleases = data.releases || [];
        updateCacheIndicator(data);
        applyFilterAndSearch();
        
        // Success Toast Notification
        const totalItems = allReleases.reduce((acc, rel) => acc + (rel.sections ? rel.sections.length : 0), 0);
        if (forceRefresh) {
            showToast(`Successfully refreshed and parsed ${totalItems} live updates!`, 'success');
        } else {
            showToast(`Successfully loaded ${totalItems} releases from cache.`, 'success');
        }
        
    } catch (error) {
        console.error("Error fetching release notes:", error);
        elements.errorMessage.textContent = error.message || "Could not retrieve feed data. Please verify your connection.";
        toggleError(true);
    } finally {
        toggleLoading(false);
    }
}

// VISUAL STATES MANAGEMENT
function toggleLoading(isLoading) {
    if (isLoading) {
        elements.refreshBtn.classList.add('loading');
        elements.refreshBtn.disabled = true;
        elements.loadingState.classList.remove('hidden');
        elements.timelineContainer.classList.add('hidden');
        elements.errorState.classList.add('hidden');
        elements.emptyState.classList.add('hidden');
    } else {
        elements.refreshBtn.classList.remove('loading');
        elements.refreshBtn.disabled = false;
        elements.loadingState.classList.add('hidden');
    }
}

function toggleError(isError) {
    if (isError) {
        elements.errorState.classList.remove('hidden');
        elements.timelineContainer.classList.add('hidden');
        elements.emptyState.classList.add('hidden');
    } else {
        elements.errorState.classList.add('hidden');
    }
}

// UPDATE CACHE STATUS BADGE
function updateCacheIndicator(data) {
    elements.cacheStatus.className = 'cache-status';
    
    if (data.cached) {
        elements.cacheStatus.classList.add('cached');
        const age = data.cache_age_seconds;
        let ageText = "Just now";
        if (age >= 60) {
            const mins = Math.floor(age / 60);
            ageText = `${mins}m ago`;
        } else if (age > 0) {
            ageText = `${age}s ago`;
        }
        elements.cacheStatusText.textContent = `Cached (${ageText})`;
        elements.cacheStatus.title = `Data loaded from local cache to optimize speed. Auto-invalidates after 5 minutes.`;
    } else {
        elements.cacheStatus.classList.add('live');
        elements.cacheStatusText.textContent = 'Live Feed';
        elements.cacheStatus.title = `Fresh real-time data fetched from Google's BigQuery Release RSS servers.`;
    }
}

// APPLY FILTERS & TEXT SEARCH COMBINED
function applyFilterAndSearch() {
    filteredReleases = [];
    
    allReleases.forEach(release => {
        // Deep copy release and filter its internal sections
        const filteredSections = release.sections.filter(section => {
            // Category check
            const matchesCategory = (currentFilter === 'all' || section.type.toLowerCase() === currentFilter.toLowerCase());
            
            // Text search check
            const textToSearch = `${section.type} ${section.text}`.toLowerCase();
            const matchesSearch = !searchKeyword || textToSearch.includes(searchKeyword);
            
            return matchesCategory && matchesSearch;
        });
        
        // Only append date group if it has matching sections
        if (filteredSections.length > 0) {
            filteredReleases.push({
                ...release,
                sections: filteredSections
            });
        }
    });
    
    updateChipCounters();
    renderTimeline();
}

// RENDER STRUCTURED RELEASES TO THE TIMELINE
function renderTimeline() {
    if (filteredReleases.length === 0) {
        elements.timelineContainer.classList.add('hidden');
        elements.emptyState.classList.remove('hidden');
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    elements.timelineContainer.classList.remove('hidden');
    
    elements.timelineContainer.innerHTML = '';
    
    filteredReleases.forEach((group, index) => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'timeline-date-group';
        dateGroup.style.animationDelay = `${index * 0.08}s`;
        
        // Relative date calculation (e.g., Today, Yesterday, or standard relative check)
        const relativeDateText = getRelativeDateLabel(group.updated);
        
        let headerHtml = `
            <div class="timeline-dot"></div>
            <h3 class="date-header">
                <span>${group.title}</span>
                ${relativeDateText ? `<span class="date-relative">${relativeDateText}</span>` : ''}
            </h3>
        `;
        
        let cardsListHtml = `<div class="updates-list">`;
        
        group.sections.forEach(sec => {
            cardsListHtml += `
                <div class="update-card" data-type="${sec.type}">
                    <div class="card-header">
                        <div class="badge-and-label">
                            <span class="badge">${sec.type}</span>
                        </div>
                        <a href="${group.link}" target="_blank" rel="noopener noreferrer" class="card-source-link" title="Open official Google Docs release notes link">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                    <div class="card-body">
                        ${highlightSearchText(sec.html, searchKeyword)}
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-copy" onclick="copyToClipboard('${escapeJsString(sec.text)}', this)">
                            <svg class="icon-copy" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        </button>
                        <button class="btn btn-tweet" onclick="openTweetModal('${escapeJsString(sec.text)}', '${sec.type}', '${group.title}', '${group.link}')">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 7.56 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.085L1.254 2.25h6.8l4.82 6.384zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                            </svg>
                            <span>Share Update</span>
                        </button>
                    </div>
                </div>
            `;
        });
        
        cardsListHtml += `</div>`;
        dateGroup.innerHTML = headerHtml + cardsListHtml;
        elements.timelineContainer.appendChild(dateGroup);
    });
}

// HELPER: CALCULATE RELATIVE LABELS (TODAY, YESTERDAY, ETC.)
function getRelativeDateLabel(isoString) {
    if (!isoString) return '';
    try {
        const updateDate = new Date(isoString);
        const today = new Date();
        
        // Zero out time for clean date-only comparison
        const d1 = new Date(updateDate.getFullYear(), updateDate.getMonth(), updateDate.getDate());
        const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const diffTime = d2 - d1;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays > 1 && diffDays <= 7) return `${diffDays} days ago`;
    } catch (e) {
        // Fall silent if date parse fails
    }
    return '';
}

// TWEET COMPOSER SYSTEM
function openTweetModal(text, type, date, link) {
    // Store current state
    selectedUpdate = { text, type, date, link };
    
    // Set static UI text fields
    elements.modalBadge.textContent = type;
    elements.modalBadge.parentElement.parentElement.parentElement.setAttribute('data-type', type);
    elements.modalDate.textContent = date;
    elements.modalPreviewText.textContent = text;
    
    // Default toggles on
    elements.toggleLink.checked = true;
    elements.toggleHashtags.checked = true;
    elements.toggleAutoTruncate.checked = true;
    
    // Generate draft
    generateTweetDraft();
    
    // Show Modal
    elements.tweetModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Stop background scroll
    elements.tweetTextarea.focus();
}

function closeModal() {
    elements.tweetModal.classList.add('hidden');
    document.body.style.overflow = ''; // Resume background scroll
}

// GENERATE PRE-POPULATED DRAFT COMPOSITION
function generateTweetDraft() {
    const emojis = {
        'Feature': '🚀',
        'Issue': '⚠️',
        'Announcement': '📢',
        'Deprecation': '🛑',
        'General': '⚡'
    };
    
    const emoji = emojis[selectedUpdate.type] || '⚡';
    const header = `${emoji} [BigQuery Release - ${selectedUpdate.date}]\n\n${selectedUpdate.type}: `;
    
    let linkPart = '';
    if (elements.toggleLink.checked) {
        linkPart = `\n\n🔗 ${selectedUpdate.link}`;
    }
    
    let hashPart = '';
    if (elements.toggleHashtags.checked) {
        hashPart = `\n\n#BigQuery #GoogleCloud #DataEngineering`;
    }
    
    let bodyText = selectedUpdate.text;
    
    if (elements.toggleAutoTruncate.checked) {
        // Accurately calculate exact remaining budget for description body
        const rawHeaderLength = header.length;
        const rawHashLength = hashPart.length;
        
        // Link counts as 23 characters on Twitter. "🔗 \n\n" is 4 characters.
        const linkPartShortenedLength = elements.toggleLink.checked ? (linkPart.replace(selectedUpdate.link, '').length + 23) : 0;
        
        const surroundingLength = rawHeaderLength + rawHashLength + linkPartShortenedLength;
        const descriptionBudget = 280 - surroundingLength;
        
        if (bodyText.length > descriptionBudget) {
            const truncatedLength = Math.max(0, descriptionBudget - 3);
            bodyText = bodyText.substring(0, truncatedLength) + '...';
        }
    }
    
    const draft = `${header}${bodyText}${linkPart}${hashPart}`;
    elements.tweetTextarea.value = draft;
    updateTweetCharacterCount();
}

// CALCULATE PRECISE TWITTER CHARACTER LIMIT (with t.co link shortening logic)
function updateTweetCharacterCount() {
    const text = elements.tweetTextarea.value;
    
    // Twitter shortens all URLs to t.co which occupies exactly 23 characters.
    // Let's implement this calculation for maximum accuracy!
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    let textLengthWithoutUrls = text.replace(urlRegex, '').length;
    let urlEquivalentLength = urls.length * 23;
    
    // Add spacer adjustments if URL replacement stripped spaces
    const totalCharCount = textLengthWithoutUrls + urlEquivalentLength;
    const charsRemaining = 280 - totalCharCount;
    
    // Update Counter Num
    elements.charCountNum.textContent = charsRemaining;
    
    // Radial Indicator calculation
    const percentage = Math.max(0, Math.min(100, (totalCharCount / 280) * 100));
    const offset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;
    elements.progressCircle.style.strokeDashoffset = offset;
    
    // Visual Threshold Warnings
    elements.charCounter.className = 'char-counter';
    elements.submitTweetBtn.disabled = false;
    
    if (charsRemaining < 0) {
        elements.charCounter.classList.add('danger');
        elements.submitTweetBtn.disabled = true; // Disable if too long
    } else if (charsRemaining <= 20) {
        elements.charCounter.classList.add('warning');
    }
}

// OPEN TWITTER WEB INTENT WITH THE DRAFT
function submitTweet() {
    const text = elements.tweetTextarea.value;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    closeModal();
}

// THEME SWITCHER LOGIC
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        elements.themeToggleBtn.querySelector('.icon-sun').classList.remove('hidden');
        elements.themeToggleBtn.querySelector('.icon-moon').classList.add('hidden');
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    const sunIcon = elements.themeToggleBtn.querySelector('.icon-sun');
    const moonIcon = elements.themeToggleBtn.querySelector('.icon-moon');
    
    if (isLight) {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
}

// COPY TO CLIPBOARD FUNCTION
function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copied update description to clipboard!", "success");
        btn.classList.add('copied');
        const span = btn.querySelector('span');
        const originalHtml = btn.innerHTML;
        
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Copied!</span>
        `;
        
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = originalHtml;
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy release update: ', err);
    });
}

// EXPORT TO CSV SYSTEM
function exportToCSV() {
    const csvRows = [];
    
    // Header
    csvRows.push(['Date', 'Category', 'Update Link', 'Description']);
    
    filteredReleases.forEach(group => {
        group.sections.forEach(sec => {
            const dateVal = `"${group.title.replace(/"/g, '""')}"`;
            const catVal = `"${sec.type.replace(/"/g, '""')}"`;
            const linkVal = `"${group.link.replace(/"/g, '""')}"`;
            const descVal = `"${sec.text.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
            
            csvRows.push([dateVal, catVal, linkVal, descVal]);
        });
    });
    
    if (csvRows.length <= 1) {
        alert("No items found in the current filtered list to export!");
        return;
    }
    
    // Compile lines (using standard UTF-8 BOM for CSV to prevent Excel encoding issues)
    const csvContent = "\uFEFFDate,Category,Update Link,Description\n" 
        + csvRows.slice(1).map(e => e.join(",")).join("\n");
    
    // Create browser downloader with explicit Blob formatting
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_releases_export_${dateStr}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Successfully exported ${csvRows.length - 1} items to CSV!`, "success");
}

// UTIL: ESCAPE SPECIAL CHARACTERS FOR INLINE HANDLERS
function escapeJsString(str) {
    if (!str) return '';
    return str
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\r?\n/g, ' ');
}

// ==========================================
// UX ADDITIONS & HELPER METHODS
// ==========================================

// 1. Dynamic Chip Counters Calculation
function updateChipCounters() {
    const counts = {
        all: 0,
        Feature: 0,
        Issue: 0,
        Announcement: 0,
        Deprecation: 0
    };
    
    allReleases.forEach(release => {
        release.sections.forEach(sec => {
            const textToSearch = `${sec.type} ${sec.text}`.toLowerCase();
            const matchesSearch = !searchKeyword || textToSearch.includes(searchKeyword);
            
            if (matchesSearch) {
                counts.all++;
                if (counts[sec.type] !== undefined) {
                    counts[sec.type]++;
                }
            }
        });
    });
    
    document.querySelectorAll('.chip').forEach(chip => {
        const filter = chip.dataset.filter;
        const countSpan = chip.querySelector('.chip-count');
        if (countSpan && counts[filter] !== undefined) {
            countSpan.textContent = `(${counts[filter]})`;
        }
    });
}

// 2. Safe DOM-aware Search Highlight Replacement
function highlightSearchText(htmlString, keyword) {
    if (!keyword) return htmlString;
    
    try {
        const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        
        const walkAndHighlight = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue;
                if (regex.test(text)) {
                    const span = document.createElement('span');
                    span.innerHTML = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                    node.parentNode.replaceChild(span, node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'A' && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
                Array.from(node.childNodes).forEach(child => walkAndHighlight(child));
            }
        };
        
        Array.from(tempDiv.childNodes).forEach(node => walkAndHighlight(node));
        return tempDiv.innerHTML;
    } catch (e) {
        console.error("Failed to highlight search term:", e);
        return htmlString; // Fallback safely if DOM parsing throws an error
    }
}

// 3. Elegant Non-blocking Toast Popup Trigger
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = '✨';
    if (type === 'success') icon = '✅';
    else if (type === 'info') icon = 'ℹ️';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'error') icon = '❌';
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Force a CSS trigger repaint
    toast.offsetHeight;
    
    toast.classList.add('show');
    
    // Smooth transition removal
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}
