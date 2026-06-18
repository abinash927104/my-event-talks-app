// BigQuery Release Notes - Frontend Logic

document.addEventListener('DOMContentLoaded', () => {
    // State
    let allNotes = []; // Raw notes from API
    let parsedUpdates = []; // Notes segmented into individual update items
    let currentFilterType = 'all';
    let searchQuery = '';

    // Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn.querySelector('.btn-icon');
    const statusContainer = document.getElementById('status-container');
    const lastUpdatedText = document.getElementById('last-updated-text');
    const searchInput = document.getElementById('search-input');
    const filterChips = document.querySelectorAll('.filter-chip');
    const loader = document.getElementById('loader');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    const emptyState = document.getElementById('empty-state');
    const notesFeed = document.getElementById('notes-feed');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const modalBadge = document.getElementById('modal-badge');
    const modalDate = document.getElementById('modal-date');
    const modalUpdateText = document.getElementById('modal-update-text');
    const tweetTextarea = document.getElementById('tweet-text');
    const charCounter = document.getElementById('char-counter');
    const charWarning = document.getElementById('char-warning');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const shareTweetBtn = document.getElementById('share-tweet-btn');

    // Toast element
    const toastNotification = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');

    // Initialize Lucide Icons
    lucide.createIcons();

    // Init App
    loadReleaseNotes();

    // Event Listeners
    refreshBtn.addEventListener('click', refreshReleaseNotes);
    retryBtn.addEventListener('click', loadReleaseNotes);
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderNotes();
    });

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilterType = chip.getAttribute('data-type');
            renderNotes();
        });
    });

    // Setup character counter on textarea
    tweetTextarea.addEventListener('input', () => {
        updateCharCount();
    });

    // Copy to clipboard click
    copyTweetBtn.addEventListener('click', () => {
        const textToCopy = tweetTextarea.value;
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                showToast("Tweet copied to clipboard!");
            })
            .catch(err => {
                console.error("Could not copy text: ", err);
                showToast("Failed to copy text.");
            });
    });

    // Modal dialog light-dismiss fallback for unsupported browsers
    if (!('closedBy' in HTMLDialogElement.prototype)) {
        tweetModal.addEventListener('click', (event) => {
            if (event.target !== tweetModal) return;
            const rect = tweetModal.getBoundingClientRect();
            const isDialogContent = (
                rect.top <= event.clientY &&
                event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX &&
                event.clientX <= rect.left + rect.width
            );
            if (!isDialogContent) {
                tweetModal.close();
            }
        });
    }

    // Helper functions
    function showToast(message) {
        toastMessage.textContent = message;
        toastNotification.showPopover();
        
        // Auto dismiss after 3 seconds
        setTimeout(() => {
            try {
                toastNotification.hidePopover();
            } catch (e) {
                // Ignore if already closed
            }
        }, 3000);
    }

    // Fetch notes from Flask API
    async function loadReleaseNotes() {
        showLoader();
        try {
            const response = await fetch('/api/notes');
            const data = await response.json();
            
            if (data.status === 'success') {
                allNotes = data.notes;
                updateLastUpdatedTime(data.last_fetched);
                processNotes();
                renderNotes();
            } else {
                showError(data.message || 'Unknown server error');
            }
        } catch (err) {
            showError('Failed to communicate with server: ' + err.message);
        }
    }

    // Force refresh the notes from BigQuery Feed
    async function refreshReleaseNotes() {
        // Spin the refresh icon
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
        
        try {
            const response = await fetch('/api/refresh', {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.status === 'success') {
                allNotes = data.notes;
                updateLastUpdatedTime(data.last_fetched);
                processNotes();
                renderNotes();
                showToast("Release notes successfully refreshed!");
            } else {
                showToast("Refresh failed: " + data.message);
            }
        } catch (err) {
            showToast("Refresh failed: Network error");
        } finally {
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    function updateLastUpdatedTime(timeStr) {
        if (timeStr) {
            lastUpdatedText.textContent = `Feed checked: ${timeStr}`;
        } else {
            lastUpdatedText.textContent = `Feed checked: Unknown`;
        }
    }

    // Process raw entries and segment them by sub-updates (e.g. splitting by <h3>)
    function processNotes() {
        parsedUpdates = [];
        
        allNotes.forEach(note => {
            const updates = parseEntryContent(note.content, note.title);
            updates.forEach(upd => {
                parsedUpdates.push({
                    id: note.id,
                    entryDate: note.title,
                    updatedAt: note.updated,
                    link: note.link,
                    type: upd.type,
                    html: upd.html,
                    cleanText: extractCleanText(upd.html)
                });
            });
        });
    }

    // Parse HTML content to group elements by <h3> headers
    function parseEntryContent(contentHtml, dateTitle) {
        const temp = document.createElement('div');
        temp.innerHTML = contentHtml;
        
        const updates = [];
        let currentUpdate = null;
        
        const h3s = temp.querySelectorAll('h3');
        if (h3s.length === 0) {
            return [{
                type: 'General',
                html: contentHtml
            }];
        }
        
        let currentChild = temp.firstElementChild;
        while (currentChild) {
            if (currentChild.tagName === 'H3') {
                if (currentUpdate) {
                    updates.push(currentUpdate);
                }
                currentUpdate = {
                    type: currentChild.textContent.trim(),
                    elements: []
                };
            } else {
                if (!currentUpdate) {
                    currentUpdate = {
                        type: 'General',
                        elements: []
                    };
                }
                currentUpdate.elements.push(currentChild.cloneNode(true));
            }
            currentChild = currentChild.nextElementSibling;
        }
        
        if (currentUpdate) {
            updates.push(currentUpdate);
        }
        
        return updates.map(u => {
            const container = document.createElement('div');
            u.elements.forEach(el => container.appendChild(el));
            return {
                type: u.type,
                html: container.innerHTML
            };
        });
    }

    // Strip HTML to get clean text
    function extractCleanText(htmlContent) {
        const temp = document.createElement('div');
        temp.innerHTML = htmlContent;
        let text = temp.textContent || temp.innerText || "";
        return text.replace(/\s+/g, ' ').trim();
    }

    // Render parsed notes onto screen
    function renderNotes() {
        // Filter
        let filtered = parsedUpdates.filter(upd => {
            // Type Filter
            if (currentFilterType !== 'all' && upd.type !== currentFilterType) {
                return false;
            }
            
            // Search Query Filter
            if (searchQuery) {
                const matchDate = upd.entryDate.toLowerCase().includes(searchQuery);
                const matchType = upd.type.toLowerCase().includes(searchQuery);
                const matchText = upd.cleanText.toLowerCase().includes(searchQuery);
                return matchDate || matchType || matchText;
            }
            
            return true;
        });

        // Toggle visibility
        if (filtered.length === 0) {
            loader.classList.add('hidden');
            errorState.classList.add('hidden');
            notesFeed.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        loader.classList.add('hidden');
        errorState.classList.add('hidden');
        notesFeed.classList.remove('hidden');

        // Group filtered updates by Date
        const grouped = {};
        filtered.forEach(upd => {
            if (!grouped[upd.entryDate]) {
                grouped[upd.entryDate] = [];
            }
            grouped[upd.entryDate].push(upd);
        });

        // Build HTML
        let feedHtml = '';
        
        // Retrieve dates in original order (they come sorted from feed)
        const dates = Object.keys(grouped);
        
        dates.forEach(date => {
            feedHtml += `
                <div class="date-group">
                    <h2 class="date-header">
                        <i data-lucide="calendar"></i>
                        <span>${date}</span>
                    </h2>
            `;
            
            grouped[date].forEach((upd, idx) => {
                const badgeClass = getBadgeClass(upd.type);
                const accentColor = getAccentColor(upd.type);
                
                feedHtml += `
                    <article class="update-card" style="--accent-color: ${accentColor}">
                        <div class="card-header">
                            <div class="card-meta">
                                <span class="badge ${badgeClass}">${upd.type}</span>
                                <span class="card-date">
                                    <i data-lucide="clock"></i>
                                    <span>${formatDateISO(upd.updatedAt)}</span>
                                </span>
                            </div>
                        </div>
                        <div class="card-content">
                            ${upd.html}
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-secondary btn-tweet" data-index="${parsedUpdates.indexOf(upd)}">
                                <i data-lucide="twitter" class="btn-icon"></i>
                                <span>Tweet Update</span>
                            </button>
                        </div>
                    </article>
                `;
            });
            
            feedHtml += `</div>`; // Close date-group
        });

        notesFeed.innerHTML = feedHtml;
        
        // Bind tweet button event listeners
        document.querySelectorAll('.btn-tweet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                openTweetModal(parsedUpdates[idx]);
            });
        });

        // Render icons
        lucide.createIcons();
    }

    // Formats dates like 2026-06-17T00:00:00-07:00 to just time or simplified version if needed
    function formatDateISO(isoStr) {
        if (!isoStr) return "";
        try {
            const d = new Date(isoStr);
            // Format time nicely
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return isoStr;
        }
    }

    function getBadgeClass(type) {
        switch (type) {
            case 'Feature': return 'badge-feature';
            case 'Announcement': return 'badge-announcement';
            case 'Deprecation': return 'badge-deprecation';
            case 'Bug Fix': return 'badge-bug-fix';
            default: return 'badge-general';
        }
    }

    function getAccentColor(type) {
        switch (type) {
            case 'Feature': return '#2dd4bf';
            case 'Announcement': return '#a78bfa';
            case 'Deprecation': return '#fbbf24';
            case 'Bug Fix': return '#34d399';
            default: return '#94a3b8';
        }
    }

    // Modal Twitter Sharing
    function openTweetModal(update) {
        // Setup details
        modalBadge.className = `badge ${getBadgeClass(update.type)}`;
        modalBadge.textContent = update.type;
        modalDate.textContent = update.entryDate;
        modalUpdateText.textContent = update.cleanText;
        
        // Generate Default Tweet Text
        const link = update.link || "https://docs.cloud.google.com/bigquery/docs/release-notes";
        
        // Compose default text
        const prefix = `BigQuery ${update.type} (${update.entryDate}): `;
        const hashtags = ` #BigQuery #GoogleCloud`;
        const urlPart = ` ${link}`;
        
        // Calculate max available room for content in tweet (limit 280)
        const reservedLen = prefix.length + hashtags.length + urlPart.length;
        const maxDescLen = 280 - reservedLen;
        
        let desc = update.cleanText;
        if (desc.length > maxDescLen && maxDescLen > 10) {
            desc = desc.substring(0, maxDescLen - 3) + "...";
        }
        
        const defaultTweet = `${prefix}${desc}${hashtags}${urlPart}`;
        tweetTextarea.value = defaultTweet;
        
        // Update counts
        updateCharCount();
        
        // Open
        tweetModal.showModal();
    }

    function updateCharCount() {
        const text = tweetTextarea.value;
        const len = text.length;
        
        charCounter.textContent = `${len} / 280`;
        
        if (len > 280) {
            charCounter.className = 'char-count danger';
            charWarning.classList.remove('hidden');
            shareTweetBtn.classList.add('disabled');
            // Disable button clickability natively by stopping link behavior
            shareTweetBtn.onclick = (e) => e.preventDefault();
        } else {
            if (len > 250) {
                charCounter.className = 'char-count warning';
            } else {
                charCounter.className = 'char-count';
            }
            charWarning.classList.add('hidden');
            shareTweetBtn.classList.remove('disabled');
            shareTweetBtn.onclick = null;
            
            // Set dynamic sharing href
            shareTweetBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        }
    }

    // Loader/Error States
    function showLoader() {
        loader.classList.remove('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
        notesFeed.classList.add('hidden');
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        loader.classList.add('hidden');
        errorState.classList.remove('hidden');
        emptyState.classList.add('hidden');
        notesFeed.classList.add('hidden');
    }
});
