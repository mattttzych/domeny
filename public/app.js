// ========================================
// DOMAIN FINDER — APP.JS
// ========================================

(function () {
    'use strict';

    // State
    const state = {
        keywords: [],
        results: [],
        filter: 'all',
    };

    // DOM Elements
    const els = {
        keywordInput: document.getElementById('keywordInput'),
        keywordsTags: document.getElementById('keywordsTags'),
        keywordsContainer: document.getElementById('keywordsContainer'),
        searchBtn: document.getElementById('searchBtn'),
        resultsSection: document.getElementById('resultsSection'),
        resultsGrid: document.getElementById('resultsGrid'),
        loadingSection: document.getElementById('loadingSection'),
        progressBar: document.getElementById('progressBar'),
        loadingCount: document.getElementById('loadingCount'),
        statTotal: document.getElementById('statTotal'),
        statAvailable: document.getElementById('statAvailable'),
        quickSuggestions: document.getElementById('quickSuggestions'),
    };

    // ========================================
    // KEYWORDS MANAGEMENT
    // ========================================

    function addKeyword(word) {
        const clean = word.trim().toLowerCase();
        if (!clean || clean.length < 2) return;
        if (state.keywords.includes(clean)) return;
        if (state.keywords.length >= 8) return;

        state.keywords.push(clean);
        renderKeywords();
        updateSearchBtn();
    }

    function removeKeyword(word) {
        state.keywords = state.keywords.filter(k => k !== word);
        renderKeywords();
        updateSearchBtn();
    }

    function renderKeywords() {
        els.keywordsTags.innerHTML = state.keywords
            .map(kw => `
        <span class="keyword-tag" data-keyword="${kw}">
          ${kw}
          <button onclick="window.__removeKeyword('${kw}')" aria-label="Usuń ${kw}">×</button>
        </span>
      `)
            .join('');
    }

    function updateSearchBtn() {
        els.searchBtn.disabled = state.keywords.length === 0;

        // Show quick suggestions on first load
        if (state.keywords.length === 0) {
            els.quickSuggestions.style.display = 'block';
        } else {
            els.quickSuggestions.style.display = 'none';
        }
    }

    // Expose for inline onclick handler
    window.__removeKeyword = removeKeyword;

    // ========================================
    // EXTENSIONS
    // ========================================

    function getSelectedExtensions() {
        const checkboxes = document.querySelectorAll('.ext-toggle input[type="checkbox"]');
        const exts = [];
        checkboxes.forEach(cb => {
            if (cb.checked) exts.push(cb.value);
        });
        return exts;
    }

    // ========================================
    // SEARCH
    // ========================================

    async function performSearch() {
        const extensions = getSelectedExtensions();
        if (state.keywords.length === 0) return;
        if (extensions.length === 0) return;

        // Show loading
        els.resultsSection.style.display = 'none';
        els.loadingSection.style.display = 'block';
        els.progressBar.style.width = '10%';
        els.loadingCount.textContent = 'Generuję kombinacje...';
        els.searchBtn.disabled = true;

        try {
            // Animate progress
            let progress = 10;
            const progressInterval = setInterval(() => {
                progress = Math.min(progress + Math.random() * 8, 90);
                els.progressBar.style.width = `${progress}%`;
            }, 300);

            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keywords: state.keywords,
                    extensions,
                }),
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                throw new Error('Błąd serwera');
            }

            const data = await response.json();
            state.results = data.results;

            // Finish progress
            els.progressBar.style.width = '100%';
            els.loadingCount.textContent = `Sprawdzono ${data.total} domen`;

            // Wait a moment for the progress animation to complete
            await new Promise(r => setTimeout(r, 400));

            // Switch to results
            els.loadingSection.style.display = 'none';
            renderResults();
            els.resultsSection.style.display = 'block';
            els.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error('Search error:', error);
            els.loadingSection.style.display = 'none';
            alert('Wystąpił błąd podczas wyszukiwania. Spróbuj ponownie.');
        } finally {
            els.searchBtn.disabled = state.keywords.length === 0;
        }
    }

    // ========================================
    // RESULTS RENDERING
    // ========================================

    function renderResults() {
        const available = state.results.filter(r => r.available === true).length;
        const total = state.results.length;

        els.statTotal.textContent = `${total} domen sprawdzonych`;
        els.statAvailable.textContent = `${available} dostępnych`;

        renderDomainCards();
    }

    function renderDomainCards() {
        const filtered = state.results.filter(r => {
            if (state.filter === 'all') return true;
            if (state.filter === 'available') return r.available === true;
            if (state.filter === 'taken') return r.available === false;
            return true;
        });

        els.resultsGrid.innerHTML = filtered
            .map((r, i) => {
                const statusClass = r.available === true ? 'available' : r.available === false ? 'taken' : 'unknown';
                const statusIcon = r.available === true ? '✅' : r.available === false ? '❌' : '❓';
                const statusText = r.available === true ? 'Dostępna' : r.available === false ? 'Zajęta' : 'Nieznany';
                const nameParts = r.domain.split('.');
                const domainBase = nameParts[0];
                const domainExt = '.' + nameParts.slice(1).join('.');

                // Build registrar link
                const registrarLinks = buildRegistrarLinks(r.domain);

                return `
          <div class="domain-card ${statusClass}" style="animation-delay: ${i * 30}ms">
            <div class="domain-info">
              <div class="domain-status-icon">${statusIcon}</div>
              <span class="domain-name">${domainBase}<span class="domain-ext">${domainExt}</span></span>
            </div>
            <div class="domain-actions">
              <span class="domain-badge">${statusText}</span>
              ${r.available === true ? `
                <a href="${registrarLinks.main}" target="_blank" class="domain-action-btn" rel="noopener">
                  🛒 Kup
                </a>
              ` : ''}
              <button class="domain-action-btn" onclick="navigator.clipboard.writeText('${r.domain}');this.textContent='Skopiowano!';setTimeout(()=>this.textContent='📋 Kopiuj',1500)">
                📋 Kopiuj
              </button>
            </div>
          </div>
        `;
            })
            .join('');

        if (filtered.length === 0) {
            els.resultsGrid.innerHTML = `
        <div class="domain-card" style="justify-content: center; padding: 40px; opacity: 0.6;">
          <p style="text-align: center; color: var(--text-muted);">Brak wyników dla wybranego filtra</p>
        </div>
      `;
        }
    }

    function buildRegistrarLinks(domain) {
        const ext = domain.split('.').slice(1).join('.');
        let main;

        if (ext === 'pl') {
            main = `https://www.nazwa.pl/domena/?d=${encodeURIComponent(domain)}`;
        } else {
            main = `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`;
        }

        return { main };
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================

    // Keyword input
    els.keywordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addKeyword(els.keywordInput.value);
            els.keywordInput.value = '';
        }
        if (e.key === 'Backspace' && els.keywordInput.value === '' && state.keywords.length > 0) {
            removeKeyword(state.keywords[state.keywords.length - 1]);
        }
    });

    // Also handle pasting comma-separated keywords
    els.keywordInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        text.split(/[,;\s]+/).forEach(word => addKeyword(word));
        els.keywordInput.value = '';
    });

    // Focus input when clicking container
    els.keywordsContainer.addEventListener('click', () => {
        els.keywordInput.focus();
    });

    // Extension toggles
    document.querySelectorAll('.ext-toggle').forEach(toggle => {
        toggle.addEventListener('change', () => {
            toggle.classList.toggle('active', toggle.querySelector('input').checked);
        });
    });

    // Search button
    els.searchBtn.addEventListener('click', performSearch);

    // Enter to search when keywords exist
    els.keywordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.shiftKey && state.keywords.length > 0) {
            performSearch();
        }
    });

    // Quick suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const keywords = chip.dataset.keywords.split(',');
            state.keywords = [];
            keywords.forEach(kw => addKeyword(kw));
            els.keywordInput.value = '';
            performSearch();
        });
    });

    // Results filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filter = btn.dataset.filter;
            renderDomainCards();
        });
    });

    // ========================================
    // INIT
    // ========================================

    updateSearchBtn();
    els.quickSuggestions.style.display = 'block';

})();
