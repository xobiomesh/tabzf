let allTabs = [];
let searchResults = [];
let selectedIndex = 0;
let currentSort = 'recent'; // 'recent', 'order', or 'alpha'
let selectedDates = new Set(); // Stores Date.toDateString() values
let isCalendarVisible = false;

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const tabCountEl = document.getElementById('tabCount');
const sortRecentBtn = document.getElementById('sortRecent');
const sortOrderBtn = document.getElementById('sortOrder');
const sortAlphaBtn = document.getElementById('sortAlpha');
const calendarToggle = document.getElementById('calendarToggle');
const calendarView = document.getElementById('calendarView');

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

    calendarToggle.addEventListener('click', toggleCalendar);
}

function toggleCalendar() {
    isCalendarVisible = !isCalendarVisible;
    calendarView.classList.toggle('hidden', !isCalendarVisible);
    calendarToggle.classList.toggle('active', isCalendarVisible);
    if (isCalendarVisible) {
        renderCalendar();
    }
}

function renderCalendar() {
    calendarView.innerHTML = '';

    const tabsByDate = getTabsByDate();
    const maxTabs = Math.max(...Object.values(tabsByDate), 0);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const header = document.createElement('div');
    header.className = 'calendar-header';

    const title = document.createElement('span');
    title.textContent = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    header.appendChild(title);

    if (selectedDates.size > 0) {
        const clearBtn = document.createElement('button');
        clearBtn.className = 'sort-btn';
        clearBtn.style.fontSize = '10px';
        clearBtn.style.padding = '2px 6px';
        clearBtn.textContent = 'Clear Filter';
        clearBtn.addEventListener('click', () => {
            selectedDates.clear();
            renderCalendar();
            handleSearch();
        });
        header.appendChild(clearBtn);
    }

    calendarView.appendChild(header);

    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const weekdaysRow = document.createElement('div');
    weekdaysRow.className = 'calendar-weekdays';
    weekdays.forEach(day => {
        const div = document.createElement('div');
        div.textContent = day;
        weekdaysRow.appendChild(div);
    });
    calendarView.appendChild(weekdaysRow);

    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Padding for first day of month
    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(currentYear, currentMonth, d);
        const dateStr = date.toDateString();
        const tabCount = tabsByDate[dateStr] || 0;

        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';

        // Apply density class
        if (tabCount === 0) dayEl.classList.add('density-none');
        else if (tabCount < maxTabs * 0.25) dayEl.classList.add('density-low');
        else if (tabCount < maxTabs * 0.5) dayEl.classList.add('density-medium');
        else if (tabCount < maxTabs * 0.75) dayEl.classList.add('density-high');
        else dayEl.classList.add('density-very-high');

        if (selectedDates.has(dateStr)) {
            dayEl.classList.add('selected');
        }

        const span = document.createElement('span');
        span.textContent = d;
        dayEl.appendChild(span);

        dayEl.addEventListener('click', () => {
            if (selectedDates.has(dateStr)) {
                selectedDates.delete(dateStr);
            } else {
                selectedDates.add(dateStr);
            }
            renderCalendar();
            handleSearch();
        });

        grid.appendChild(dayEl);
    }

    calendarView.appendChild(grid);
}

function getTabsByDate() {
    const groups = {};
    allTabs.forEach(tab => {
        if (tab.lastAccessed) {
            const dateStr = new Date(tab.lastAccessed).toDateString();
            groups[dateStr] = (groups[dateStr] || 0) + 1;
        }
    });
    return groups;
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
    let filtered = [...allTabs];

    // Filter by selected dates
    if (selectedDates.size > 0) {
        filtered = filtered.filter(tab => {
            if (!tab.lastAccessed) return false;
            return selectedDates.has(new Date(tab.lastAccessed).toDateString());
        });
    }

    if (!query) {
        searchResults = filtered;
    } else {
        const fuse = new Fuse(filtered, {
            keys: ['title', 'url'],
            threshold: 0.4,
            distance: 100
        });
        searchResults = fuse.search(query).map(result => result.item);
    }

    tabCountEl.textContent = `${searchResults.length} tabs ${selectedDates.size > 0 ? '(filtered by date)' : ''}`;
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
