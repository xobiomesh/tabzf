let allTabs = [];
let searchResults = [];
let selectedIndex = 0;
let currentSort = 'recent'; // 'recent' or 'order'

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const tabCountEl = document.getElementById('tabCount');
const sortRecentBtn = document.getElementById('sortRecent');
const sortOrderBtn = document.getElementById('sortOrder');
const sortAlphaBtn = document.getElementById('sortAlpha');

// Initialize
async function init() {
    allTabs = await chrome.tabs.query({});
    tabCountEl.textContent = `${allTabs.length} tabs`;

    applySort();
    searchResults = [...allTabs];
    renderResults();

    searchInput.addEventListener('input', handleSearch);
    document.addEventListener('keydown', handleKeyDown);

    sortRecentBtn.addEventListener('click', () => {
        setSort('recent');
    });

    sortOrderBtn.addEventListener('click', () => {
        setSort('order');
    });

    sortAlphaBtn.addEventListener('click', () => {
        setSort('alpha');
    });
}

function setSort(sortType) {
    if (currentSort === sortType) return;

    currentSort = sortType;
    sortRecentBtn.classList.toggle('active', sortType === 'recent');
    sortOrderBtn.classList.toggle('active', sortType === 'order');
    sortAlphaBtn.classList.toggle('active', sortType === 'alpha');

    applySort();
    handleSearch(); // Refresh results with new sort
}

function applySort() {
    if (currentSort === 'recent') {
        // Sort by lastAccessed (descending)
        allTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    } else if (currentSort === 'alpha') {
        // Sort by title (ascending)
        allTabs.sort((a, b) => {
            const titleA = (a.title || '').toLowerCase();
            const titleB = (b.title || '').toLowerCase();
            return titleA.localeCompare(titleB);
        });
    } else {
        // Sort by windowId then index (opening order/original order)
        allTabs.sort((a, b) => {
            if (a.windowId !== b.windowId) {
                return a.windowId - b.windowId;
            }
            return a.index - b.index;
        });
    }
}

function handleSearch() {
    const query = searchInput.value.trim();

    if (!query) {
        searchResults = [...allTabs];
    } else {
        const fuse = new Fuse(allTabs, {
            keys: ['title', 'url'],
            threshold: 0.4,
            distance: 100
        });
        searchResults = fuse.search(query).map(result => result.item);
    }

    selectedIndex = 0;
    renderResults();
}

function renderResults() {
    resultsContainer.innerHTML = '';
    let lastDate = null;

    searchResults.forEach((tab, index) => {
        // Add date separator if in 'recent' sort, the date has changed, and not searching
        if (currentSort === 'recent' && !searchInput.value.trim()) {
            const dateLabel = getRelativeDate(tab.lastAccessed);
            if (dateLabel !== lastDate) {
                const sep = document.createElement('div');
                sep.className = 'date-separator';
                sep.textContent = dateLabel;
                resultsContainer.appendChild(sep);
                lastDate = dateLabel;
            }
        }

        const div = document.createElement('div');
        div.className = `tab-item ${index === selectedIndex ? 'selected' : ''}`;

        const img = document.createElement('img');
        img.className = 'favicon';
        img.src = tab.favIconUrl || 'icons/default_favicon.png';
        img.onerror = () => {
            img.src = 'icons/default_favicon.png';
        };

        const infoDiv = document.createElement('div');
        infoDiv.className = 'tab-info';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'tab-title';
        titleDiv.textContent = tab.title;

        const urlDiv = document.createElement('div');
        urlDiv.className = 'tab-url';
        urlDiv.textContent = tab.url;

        infoDiv.appendChild(titleDiv);
        infoDiv.appendChild(urlDiv);

        div.appendChild(img);
        div.appendChild(infoDiv);

        div.addEventListener('click', () => focusTab(tab));
        resultsContainer.appendChild(div);

        if (index === selectedIndex) {
            div.scrollIntoView({ block: 'nearest' });
        }
    });
}

function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
        selectedIndex = (selectedIndex + 1) % searchResults.length;
        renderResults();
        e.preventDefault();
    } else if (e.key === 'ArrowUp') {
        selectedIndex = (selectedIndex - 1 + searchResults.length) % searchResults.length;
        renderResults();
        e.preventDefault();
    } else if (e.key === 'Enter') {
        if (searchResults[selectedIndex]) {
            focusTab(searchResults[selectedIndex]);
        }
    }
}

async function focusTab(tab) {
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id, { active: true });
    window.close();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getRelativeDate(timestamp) {
    if (!timestamp) return 'A long time ago';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        // Check if it's within the last 7 days for better readability
        const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            return date.toLocaleDateString(undefined, { weekday: 'long' });
        }
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

init();
