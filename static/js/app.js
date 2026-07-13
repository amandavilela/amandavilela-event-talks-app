// State management
let appState = {
    releases: [],
    filteredReleases: [],
    searchQuery: '',
    selectedCategory: 'all',
    isDarkMode: false,
    activeTweet: {
        text: '',
        url: ''
    }
};

// Circular progress ring setup
const CIRCUMFERENCE = 2 * Math.PI * 10; // 62.8318

// DOM elements
const elements = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    sunIcon: document.getElementById('sunIcon'),
    moonIcon: document.getElementById('moonIcon'),
    refreshBtn: document.getElementById('refreshBtn'),
    refreshIcon: document.getElementById('refreshIcon'),
    lastUpdated: document.getElementById('lastUpdated'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    filterBadges: document.getElementById('filterBadges'),
    notesContainer: document.getElementById('notesContainer'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),
    emptyState: document.getElementById('emptyState'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    
    // Modal elements
    tweetModal: document.getElementById('tweetModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelTweetBtn: document.getElementById('cancelTweetBtn'),
    submitTweetBtn: document.getElementById('submitTweetBtn'),
    tweetTextarea: document.getElementById('tweetTextarea'),
    tweetUrlText: document.getElementById('tweetUrlText'),
    progressCircle: document.getElementById('progressCircle'),
    charCounter: document.getElementById('charCounter')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleases();
    setupEventListeners();
});

// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        setTheme(true);
    } else {
        setTheme(false);
    }
}

function setTheme(dark) {
    appState.isDarkMode = dark;
    if (dark) {
        document.body.classList.add('dark-mode');
        elements.sunIcon.classList.remove('hidden');
        elements.moonIcon.classList.add('hidden');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        elements.sunIcon.classList.add('hidden');
        elements.moonIcon.classList.remove('hidden');
        localStorage.setItem('theme', 'light');
    }
}

function setupEventListeners() {
    // Theme toggle click
    elements.themeToggleBtn.addEventListener('click', () => setTheme(!appState.isDarkMode));
    
    // Refresh button click
    elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
    elements.retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search inputs
    elements.searchInput.addEventListener('input', debounce((e) => {
        appState.searchQuery = e.target.value.trim();
        toggleClearButton();
        filterAndRender();
    }, 250));
    
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        appState.searchQuery = '';
        toggleClearButton();
        elements.searchInput.focus();
        filterAndRender();
    });
    
    // Filter Badges
    elements.filterBadges.addEventListener('click', (e) => {
        const badge = e.target.closest('.badge');
        if (!badge) return;
        
        // Update active class
        document.querySelectorAll('.badge').forEach(b => b.classList.remove('active'));
        badge.classList.add('active');
        
        appState.selectedCategory = badge.dataset.category;
        filterAndRender();
    });
    
    // Reset filters button
    elements.resetFiltersBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        appState.searchQuery = '';
        toggleClearButton();
        
        document.querySelectorAll('.badge').forEach(b => {
            if (b.dataset.category === 'all') b.classList.add('active');
            else b.classList.remove('active');
        });
        
        appState.selectedCategory = 'all';
        filterAndRender();
    });
    
    // Modal events
    elements.closeModalBtn.addEventListener('click', closeTweetModal);
    elements.cancelTweetBtn.addEventListener('click', closeTweetModal);
    elements.tweetTextarea.addEventListener('input', updateTweetComposerStatus);
    elements.submitTweetBtn.addEventListener('click', publishTweet);
    
    // Close modal on background click
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetModal();
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.tweetModal.classList.contains('hidden')) {
            closeTweetModal();
        }
    });
}

// Utility: Debounce search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Utility: Toggle search clear button
function toggleClearButton() {
    if (appState.searchQuery.length > 0) {
        elements.clearSearchBtn.classList.remove('hidden');
    } else {
        elements.clearSearchBtn.classList.add('hidden');
    }
}

// Fetch Release Notes
async function fetchReleases(bypassCache = false) {
    showLoading(true);
    elements.refreshIcon.classList.add('spin');
    elements.refreshBtn.disabled = true;
    
    const url = bypassCache ? '/api/releases?refresh=true' : '/api/releases';
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'error') {
            throw new Error(data.error || 'Unknown error occurred while parsing feed.');
        }
        
        appState.releases = data.entries;
        updateLastFetchedTime(data.fetched_at);
        filterAndRender();
        
    } catch (error) {
        console.error('Failed to load release notes:', error);
        elements.errorMessage.textContent = error.message;
        showError(true);
    } finally {
        showLoading(false);
        elements.refreshIcon.classList.remove('spin');
        elements.refreshBtn.disabled = false;
    }
}

// Update time display
function updateLastFetchedTime(isoString) {
    try {
        const date = new Date(isoString);
        const formatTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const formatDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        elements.lastUpdated.textContent = `Updated: ${formatDate}, ${formatTime}`;
    } catch (e) {
        elements.lastUpdated.textContent = 'Updated recently';
    }
}

// Toggle loading state
function showLoading(show) {
    if (show) {
        elements.loadingState.classList.remove('hidden');
        elements.notesContainer.classList.add('hidden');
        elements.errorState.classList.add('hidden');
        elements.emptyState.classList.add('hidden');
    } else {
        elements.loadingState.classList.add('hidden');
        elements.notesContainer.classList.remove('hidden');
    }
}

// Toggle error state
function showError(show) {
    if (show) {
        elements.errorState.classList.remove('hidden');
        elements.notesContainer.classList.add('hidden');
        elements.loadingState.classList.add('hidden');
        elements.emptyState.classList.add('hidden');
        elements.lastUpdated.textContent = 'Update failed';
    } else {
        elements.errorState.classList.add('hidden');
    }
}

// Filter notes and trigger render
function filterAndRender() {
    const query = appState.searchQuery.toLowerCase();
    const cat = appState.selectedCategory;
    
    const filtered = [];
    
    appState.releases.forEach(entry => {
        const matchingSubUpdates = entry.sub_updates.filter(sub => {
            // Check Category filter
            const matchesCategory = (cat === 'all' || sub.category.toLowerCase() === cat.toLowerCase());
            
            // Check Search term (matches either category name or content text)
            const plainText = stripHtml(sub.content).toLowerCase();
            const matchesSearch = (!query || 
                                   sub.category.toLowerCase().includes(query) || 
                                   plainText.includes(query) || 
                                   entry.title.toLowerCase().includes(query));
            
            return matchesCategory && matchesSearch;
        });
        
        if (matchingSubUpdates.length > 0) {
            filtered.push({
                ...entry,
                sub_updates: matchingSubUpdates
            });
        }
    });
    
    appState.filteredReleases = filtered;
    renderNotes();
}

// Utility: Strip HTML tags to obtain pure text
function stripHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.innerText || tempDiv.textContent || '';
}

// Render release notes to feed
function renderNotes() {
    elements.notesContainer.innerHTML = '';
    
    if (appState.filteredReleases.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    
    appState.filteredReleases.forEach(entry => {
        const card = document.createElement('article');
        card.className = 'date-card';
        card.id = entry.id;
        
        // Header
        const header = document.createElement('div');
        header.className = 'date-card-header';
        
        const title = document.createElement('h2');
        title.className = 'date-card-title';
        title.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${entry.title}
        `;
        
        const externalLink = document.createElement('a');
        externalLink.className = 'date-card-link';
        externalLink.href = entry.link;
        externalLink.target = '_blank';
        externalLink.rel = 'noopener';
        externalLink.title = 'View official documentation for this date';
        externalLink.ariaLabel = `View official documentation for ${entry.title}`;
        externalLink.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
        `;
        
        header.appendChild(title);
        header.appendChild(externalLink);
        card.appendChild(header);
        
        // Updates List
        const list = document.createElement('div');
        list.className = 'sub-updates-list';
        
        entry.sub_updates.forEach(sub => {
            const item = document.createElement('div');
            item.className = `sub-update-item category-${sub.category.toLowerCase()}`;
            item.id = sub.id;
            
            const itemHeader = document.createElement('div');
            itemHeader.className = 'sub-update-header';
            
            const categoryPill = document.createElement('span');
            categoryPill.className = `category-pill ${sub.category.toLowerCase()}`;
            categoryPill.textContent = sub.category;
            
            const tweetBtn = document.createElement('button');
            tweetBtn.className = 'btn-share-tweet';
            tweetBtn.title = 'Compose a tweet about this update';
            tweetBtn.ariaLabel = `Tweet about this ${sub.category} update from ${entry.title}`;
            tweetBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                </svg>
                <span>Tweet Update</span>
            `;
            
            // Set up click for composer modal
            tweetBtn.addEventListener('click', () => {
                openTweetComposer(entry.title, sub.category, sub.content, entry.link);
            });
            
            itemHeader.appendChild(categoryPill);
            itemHeader.appendChild(tweetBtn);
            item.appendChild(itemHeader);
            
            // Content HTML
            const content = document.createElement('div');
            content.className = 'sub-update-content';
            content.innerHTML = sub.content;
            
            item.appendChild(content);
            list.appendChild(item);
        });
        
        card.appendChild(list);
        elements.notesContainer.appendChild(card);
    });
}

// Tweet Composer Modal Logic
function openTweetComposer(date, category, contentHtml, link) {
    // 1. Clean the HTML content to plain text
    const cleanText = stripHtml(contentHtml).trim().replace(/\s+/g, ' ');
    
    // 2. Format a default tweet draft
    // Pre-calculate spacing: we want to keep it punchy and fit easily.
    // Recommended format:
    // BigQuery Update (July 13, 2026) 📊
    // [Feature]: The Overview page is now generally available (GA)...
    // 
    // Link: https://...
    
    const intro = `BigQuery Update (${date}) 📊\n\n[${category}]: `;
    const linkSection = `\n\nLink: ${link}`;
    
    // X handles URLs by replacing them with a t.co link which is exactly 23 characters.
    // So the text budget is: 280 (total limit) - 23 (for linkSection's link) - linkSection structure length.
    // Let's compute characters allocated for descriptions
    const reservedCharsForLink = 23 + 8; // 'Link: ' plus the URL wrapper (23 chars) plus newlines
    const introLen = intro.length;
    const maxDescBudget = 280 - introLen - reservedCharsForLink;
    
    let descriptionText = cleanText;
    if (descriptionText.length > maxDescBudget) {
        descriptionText = descriptionText.substring(0, maxDescBudget - 3) + '...';
    }
    
    const draftText = `${intro}${descriptionText}${linkSection}`;
    
    // Save draft detail in state
    appState.activeTweet.text = draftText;
    appState.activeTweet.url = link;
    
    // 3. Populate Modal fields
    elements.tweetTextarea.value = draftText;
    
    // Show clean domain preview
    try {
        const urlObj = new URL(link);
        elements.tweetUrlText.textContent = urlObj.hostname + (urlObj.hash ? urlObj.hash : '');
    } catch (e) {
        elements.tweetUrlText.textContent = 'docs.cloud.google.com';
    }
    
    // 4. Update UI Status and show
    updateTweetComposerStatus();
    
    elements.tweetModal.classList.remove('hidden');
    elements.tweetTextarea.focus();
    
    // Position cursor at the beginning of description for quick customization
    const descStartIdx = intro.length;
    elements.tweetTextarea.setSelectionRange(descStartIdx, descStartIdx + descriptionText.length);
}

function closeTweetModal() {
    elements.tweetModal.classList.add('hidden');
    appState.activeTweet.text = '';
    appState.activeTweet.url = '';
}

// Compute length accurately matching Twitter's URL-shortening policy
function getTweetLength(text) {
    // Regex for matching URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    let length = text.length;
    
    let match;
    let urlCount = 0;
    let urlCharsSum = 0;
    
    while ((match = urlRegex.exec(text)) !== null) {
        urlCount++;
        urlCharsSum += match[0].length;
    }
    
    // Subtract the literal length of URLs, add 23 characters for each URL
    return length - urlCharsSum + (urlCount * 23);
}

function updateTweetComposerStatus() {
    const text = elements.tweetTextarea.value;
    const tweetLength = getTweetLength(text);
    const charsRemaining = 280 - tweetLength;
    
    // Update numerical counter
    elements.charCounter.textContent = charsRemaining;
    
    // Update progress circle ring
    const percentage = Math.min(tweetLength / 280, 1.0);
    const strokeOffset = CIRCUMFERENCE - (percentage * CIRCUMFERENCE);
    elements.progressCircle.style.strokeDashoffset = strokeOffset;
    
    // Visual indicators classes
    elements.progressCircle.classList.remove('warning', 'danger');
    elements.charCounter.classList.remove('danger');
    elements.submitTweetBtn.disabled = false;
    
    if (charsRemaining <= 0) {
        elements.progressCircle.classList.add('danger');
        elements.charCounter.classList.add('danger');
        elements.submitTweetBtn.disabled = true;
    } else if (charsRemaining <= 20) {
        elements.progressCircle.classList.add('warning');
    }
}

// Trigger browser tweet action
function publishTweet() {
    const text = elements.tweetTextarea.value;
    const tweetLength = getTweetLength(text);
    
    if (tweetLength > 280) {
        alert('Your tweet exceeds the 280-character limit.');
        return;
    }
    
    // Open Twitter/X Web Intent
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    
    closeTweetModal();
}
