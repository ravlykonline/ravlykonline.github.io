import { buildShareLink, copyTextToClipboard } from './share.js';

export function getManualSectionIds(sections) {
    return Array.from(sections).map((section) => section.id).filter(Boolean);
}

export function getManualExampleCodeText(rawCode) {
    return String(rawCode || '')
        .replace(/\r\n/g, '\n')
        .replace(/\n+$/u, '');
}

export function buildManualEditorLink(code, editorHref = 'index.html', currentUrl = 'https://ravlyk.org/manual.html') {
    const editorUrl = new URL(editorHref, currentUrl).toString();
    return buildShareLink(getManualExampleCodeText(code), editorUrl);
}

export function resolveManualSectionId(sectionIds, id) {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) return normalizedId;
    if (sectionIds.includes(normalizedId)) return normalizedId;

    const aliasMap = {
        movement: 'basic-commands',
        rotation: 'basic-commands',
        pen: 'pen-control',
        variables: 'variables-functions',
        functions: 'variables-functions',
    };

    return aliasMap[normalizedId] || normalizedId;
}

export function findManualSectionIndexById(sectionIds, id) {
    return sectionIds.indexOf(resolveManualSectionId(sectionIds, id));
}

export function getInitialManualSectionIndex(sectionIds, hash) {
    const hashId = String(hash || '').replace('#', '');
    const hashIndex = findManualSectionIndexById(sectionIds, hashId);
    return hashIndex !== -1 ? hashIndex : 0;
}

export function normalizeManualSearchQuery(query) {
    return String(query || '').trim().toLowerCase();
}

export function matchesManualSectionFilters({ section, query = '', mode = 'full' }) {
    if (!section) return false;

    const normalizedQuery = normalizeManualSearchQuery(query);
    const isAdvanced = typeof section.classList?.contains === 'function'
        ? section.classList.contains('advanced-only')
        : false;

    if (mode === 'beginner' && isAdvanced) {
        return false;
    }

    if (!normalizedQuery) {
        return true;
    }

    const keywords = section.dataset?.keywords || '';
    const title = typeof section.querySelector === 'function'
        ? section.querySelector('h2, h3')?.textContent || ''
        : '';
    const textContent = section.textContent || '';
    const haystack = `${keywords} ${title} ${textContent}`.toLowerCase();

    return normalizedQuery
        .split(/\s+/)
        .every((token) => haystack.includes(token));
}

export function getAvailableManualSectionIndexes({ sections, query = '', mode = 'full' }) {
    return Array.from(sections)
        .map((section, index) => (matchesManualSectionFilters({ section, query, mode }) ? index : -1))
        .filter((index) => index !== -1);
}

export function updateManualPagingState({
    activeIndex,
    sectionIds,
    sections,
    links,
    availableIndexes = null,
    prevBtn,
    nextBtn,
    prevBtnBottom = null,
    nextBtnBottom = null,
    indicator,
    indicatorBottom = null,
}) {
    const resolvedIndexes = Array.isArray(availableIndexes) && availableIndexes.length
        ? availableIndexes
        : sectionIds.map((_, index) => index);
    const hasAvailableSections = resolvedIndexes.length > 0;
    const availableSet = new Set(resolvedIndexes);
    const activeId = hasAvailableSections ? sectionIds[activeIndex] : '';

    sections.forEach((section, index) => {
        const isAvailable = availableSet.has(index);
        const isActive = isAvailable && index === activeIndex;
        section.classList.toggle('is-active', isActive);
        section.classList.toggle('is-hidden-by-filter', !isAvailable);
        section.hidden = !isAvailable;
        section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    links.forEach((link) => {
        const linkId = link.getAttribute('href').replace('#', '');
        const linkIndex = findManualSectionIndexById(sectionIds, linkId);
        const isAvailable = availableSet.has(linkIndex);
        const isCurrent = isAvailable && linkId === activeId;
        link.classList.toggle('is-active', isCurrent);
        link.classList.toggle('is-filter-hidden', !isAvailable);
        link.hidden = !isAvailable;
        if (isCurrent) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });

    const currentVisiblePosition = resolvedIndexes.indexOf(activeIndex);
    const atStart = !hasAvailableSections || currentVisiblePosition <= 0;
    const atEnd = !hasAvailableSections || currentVisiblePosition === resolvedIndexes.length - 1;
    prevBtn.disabled = atStart;
    nextBtn.disabled = atEnd;
    if (prevBtnBottom) prevBtnBottom.disabled = atStart;
    if (nextBtnBottom) nextBtnBottom.disabled = atEnd;

    const indicatorText = hasAvailableSections
        ? `Розділ ${currentVisiblePosition + 1} з ${resolvedIndexes.length}`
        : 'Нічого не знайдено';
    indicator.textContent = indicatorText;
    if (indicatorBottom) indicatorBottom.textContent = indicatorText;
}

export function createManualPageController({ documentRef, windowRef }) {
    const links = Array.from(documentRef.querySelectorAll('.toc-list a'));
    const sections = Array.from(documentRef.querySelectorAll('.guide-sections-wrapper .guide-section'));
    const prevBtn = documentRef.getElementById('manual-prev-section');
    const nextBtn = documentRef.getElementById('manual-next-section');
    const prevBtnBottom = documentRef.getElementById('manual-prev-section-bottom');
    const nextBtnBottom = documentRef.getElementById('manual-next-section-bottom');
    const indicator = documentRef.getElementById('manual-section-indicator');
    const indicatorBottom = documentRef.getElementById('manual-section-indicator-bottom');
    const content = documentRef.querySelector('.guide-sections-wrapper');
    const menuBtn = documentRef.getElementById('manual-mobile-menu-btn');
    const closeBtn = documentRef.getElementById('manual-mobile-close-btn');
    const toc = documentRef.getElementById('manual-toc');
    const backdrop = documentRef.getElementById('manual-mobile-backdrop');
    const searchInput = documentRef.getElementById('manual-search-input');
    const searchStatus = documentRef.getElementById('manual-search-status');
    const modeButtons = Array.from(documentRef.querySelectorAll('[data-manual-mode]'));
    const editorLink = documentRef.getElementById('manual-back-to-editor')
        || documentRef.getElementById('manual-back-to-editor-footer');

    const sectionIds = getManualSectionIds(sections);
    let activeIndex = 0;
    let searchQuery = '';
    let readingMode = documentRef.body.classList.contains('mode-full') ? 'full' : 'beginner';

    function getAvailableIndexes() {
        return getAvailableManualSectionIndexes({
            sections,
            query: searchQuery,
            mode: readingMode,
        });
    }

    function resolveAvailableIndex(nextIndex, availableIndexes) {
        if (!availableIndexes.length) return -1;
        if (availableIndexes.includes(nextIndex)) return nextIndex;

        const firstHigherIndex = availableIndexes.find((index) => index >= nextIndex);
        return typeof firstHigherIndex === 'number'
            ? firstHigherIndex
            : availableIndexes[availableIndexes.length - 1];
    }

    function updateSearchStatus(availableIndexes) {
        if (!searchStatus) return;

        if (!availableIndexes.length) {
            searchStatus.textContent = 'За цим запитом у вибраному режимі нічого не знайдено.';
            return;
        }

        if (searchQuery) {
            searchStatus.textContent = `Знайдено розділів: ${availableIndexes.length}.`;
            return;
        }

        const modeLabel = readingMode === 'beginner' ? 'початківця' : 'повному';
        searchStatus.textContent = `Показано ${availableIndexes.length} розділів у режимі ${modeLabel}.`;
    }

    function updateModeButtons() {
        modeButtons.forEach((button) => {
            const isActive = button.dataset.manualMode === readingMode;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        documentRef.body.classList.toggle('mode-beginner', readingMode === 'beginner');
        documentRef.body.classList.toggle('mode-full', readingMode === 'full');
    }

    function renderActiveState(activeSectionIndex, options = {}) {
        const availableIndexes = getAvailableIndexes();
        if (activeSectionIndex === -1) {
            updateManualPagingState({
                activeIndex: 0,
                sectionIds,
                sections,
                links,
                availableIndexes,
                prevBtn,
                nextBtn,
                prevBtnBottom,
                nextBtnBottom,
                indicator,
                indicatorBottom,
            });
            updateSearchStatus(availableIndexes);
            return false;
        }

        activeIndex = activeSectionIndex;
        updateManualPagingState({
            activeIndex,
            sectionIds,
            sections,
            links,
            availableIndexes,
            prevBtn,
            nextBtn,
            prevBtnBottom,
            nextBtnBottom,
            indicator,
            indicatorBottom,
        });
        updateSearchStatus(availableIndexes);

        const activeId = sectionIds[activeIndex];
        const currentHash = `#${activeId}`;
        if (options.replaceHistory) {
            windowRef.history.replaceState(null, '', currentHash);
        } else if (!options.skipHistory && windowRef.location.hash !== currentHash) {
            windowRef.history.pushState(null, '', currentHash);
        }

        if (!options.keepScroll && content) {
            const top = content.getBoundingClientRect().top + windowRef.scrollY - 14;
            windowRef.scrollTo({ top, behavior: 'smooth' });
        }

        return true;
    }

    function setActiveIndex(nextIndex, options = {}) {
        const availableIndexes = getAvailableIndexes();
        const resolvedIndex = resolveAvailableIndex(
            Math.max(0, Math.min(sectionIds.length - 1, nextIndex)),
            availableIndexes
        );
        renderActiveState(resolvedIndex, options);
    }

    function syncDiscoveryState(options = {}) {
        updateModeButtons();
        const availableIndexes = getAvailableIndexes();
        const nextIndex = options.preserveActive !== false && availableIndexes.includes(activeIndex)
            ? activeIndex
            : resolveAvailableIndex(activeIndex, availableIndexes);
        renderActiveState(nextIndex, {
            keepScroll: options.keepScroll !== false,
            replaceHistory: options.replaceHistory !== false,
        });
    }

    function closeMenu() {
        documentRef.body.classList.remove('manual-toc-open');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
        if (backdrop) {
            backdrop.classList.add('hidden');
            backdrop.setAttribute('aria-hidden', 'true');
        }
    }

    function openMenu() {
        documentRef.body.classList.add('manual-toc-open');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
        if (closeBtn) closeBtn.focus();
    }

    function initPaging() {
        if (!sections.length || !links.length || !prevBtn || !nextBtn || !indicator || !content) {
            return;
        }

        documentRef.body.classList.add('manual-paged-ready');

        links.forEach((link) => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const index = findManualSectionIndexById(sectionIds, link.getAttribute('href').replace('#', ''));
                if (index !== -1) setActiveIndex(index);
                closeMenu();
            });
        });

        prevBtn.addEventListener('click', () => setActiveIndex(activeIndex - 1));
        nextBtn.addEventListener('click', () => setActiveIndex(activeIndex + 1));
        if (prevBtnBottom) prevBtnBottom.addEventListener('click', () => setActiveIndex(activeIndex - 1));
        if (nextBtnBottom) nextBtnBottom.addEventListener('click', () => setActiveIndex(activeIndex + 1));

        windowRef.addEventListener('popstate', () => {
            const hashIndex = findManualSectionIndexById(sectionIds, windowRef.location.hash.replace('#', ''));
            if (hashIndex !== -1) {
                setActiveIndex(hashIndex, { skipHistory: true, keepScroll: true });
            }
        });

        setActiveIndex(getInitialManualSectionIndex(sectionIds, windowRef.location.hash), {
            replaceHistory: true,
            keepScroll: true,
        });
    }

    function initMobileMenu() {
        if (!menuBtn || !closeBtn || !toc || !backdrop) return;

        menuBtn.addEventListener('click', () => {
            if (documentRef.body.classList.contains('manual-toc-open')) {
                closeMenu();
                return;
            }
            openMenu();
        });
        closeBtn.addEventListener('click', closeMenu);
        backdrop.addEventListener('click', closeMenu);
        windowRef.addEventListener('resize', () => {
            if (windowRef.innerWidth >= 1280) closeMenu();
        });
        documentRef.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && documentRef.body.classList.contains('manual-toc-open')) {
                closeMenu();
                menuBtn.focus();
            }
        });
    }

    function initTopLinks() {
        const mappings = [
            ['manual-back-to-editor', 'index.html'],
            ['manual-to-lessons', 'lessons.html'],
            ['manual-back-to-editor-footer', 'index.html'],
            ['manual-to-lessons-footer', 'lessons.html'],
        ];
        mappings.forEach(([id, href]) => {
            const element = documentRef.getElementById(id);
            if (!element) return;
            element.addEventListener('click', (event) => {
                event.preventDefault();
                windowRef.location.href = href;
            });
        });
    }

    function initCodeExamples() {
        const codeBlocks = Array.from(documentRef.querySelectorAll('pre.example-code-manual'));
        if (!codeBlocks.length) return;

        const editorHref = editorLink?.getAttribute('href') || 'index.html';

        codeBlocks.forEach((codeBlock, index) => {
            if (codeBlock.parentElement?.classList.contains('manual-code-block')) return;

            const wrapper = documentRef.createElement('div');
            wrapper.className = 'manual-code-block';

            const toolbar = documentRef.createElement('div');
            toolbar.className = 'manual-code-toolbar';

            const copyButton = documentRef.createElement('button');
            copyButton.type = 'button';
            copyButton.className = 'manual-code-action manual-code-copy';
            copyButton.setAttribute('aria-label', 'Скопіювати код');
            copyButton.title = 'Скопіювати код';
            copyButton.innerHTML = '<i class="far fa-copy" aria-hidden="true"></i><span class="manual-code-copy-label">Скопійовано</span>';

            const openLink = documentRef.createElement('a');
            openLink.className = 'manual-code-action manual-code-editor';
            openLink.target = '_blank';
            openLink.rel = 'noopener noreferrer';
            openLink.textContent = 'Відкрити в редакторі';

            const status = documentRef.createElement('span');
            status.className = 'visually-hidden';
            status.setAttribute('aria-live', 'polite');
            status.id = `manual-code-status-${index + 1}`;

            copyButton.setAttribute('aria-describedby', status.id);
            openLink.setAttribute('aria-describedby', status.id);

            const codeText = getManualExampleCodeText(codeBlock.textContent);
            openLink.href = buildManualEditorLink(codeText, editorHref, windowRef.location.href);

            copyButton.addEventListener('click', async () => {
                try {
                    await copyTextToClipboard(codeText);
                    copyButton.classList.add('is-copied');
                    copyButton.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i><span class="manual-code-copy-label">Скопійовано</span>';
                    status.textContent = 'Код скопійовано.';
                    windowRef.setTimeout(() => {
                        copyButton.classList.remove('is-copied');
                        copyButton.innerHTML = '<i class="far fa-copy" aria-hidden="true"></i><span class="manual-code-copy-label">Скопійовано</span>';
                    }, 1500);
                } catch (error) {
                    status.textContent = 'Не вдалося скопіювати код.';
                }
            });

            toolbar.append(copyButton, openLink);
            wrapper.append(toolbar, codeBlock.cloneNode(true), status);
            codeBlock.replaceWith(wrapper);
        });
    }

    function initDiscoveryControls() {
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                searchQuery = normalizeManualSearchQuery(searchInput.value);
                syncDiscoveryState({ preserveActive: false, keepScroll: true, replaceHistory: true });
            });
        }

        modeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const nextMode = button.dataset.manualMode;
                if (!nextMode || nextMode === readingMode) return;
                readingMode = nextMode;
                syncDiscoveryState({ preserveActive: false, keepScroll: true, replaceHistory: true });
            });
        });

        updateModeButtons();
        updateSearchStatus(getAvailableIndexes());
    }

    return {
        init() {
            initTopLinks();
            initCodeExamples();
            initPaging();
            initMobileMenu();
            initDiscoveryControls();
        },
        setActiveIndex,
        closeMenu,
        openMenu,
    };
}
