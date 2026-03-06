export function getManualSectionIds(sections) {
    return Array.from(sections).map((section) => section.id).filter(Boolean);
}

export function findManualSectionIndexById(sectionIds, id) {
    return sectionIds.indexOf(id);
}

export function getInitialManualSectionIndex(sectionIds, hash) {
    const hashId = String(hash || '').replace('#', '');
    const hashIndex = findManualSectionIndexById(sectionIds, hashId);
    return hashIndex !== -1 ? hashIndex : 0;
}

export function updateManualPagingState({
    activeIndex,
    sectionIds,
    sections,
    links,
    prevBtn,
    nextBtn,
    prevBtnBottom = null,
    nextBtnBottom = null,
    indicator,
    indicatorBottom = null,
}) {
    const activeId = sectionIds[activeIndex];

    sections.forEach((section, index) => {
        const isActive = index === activeIndex;
        section.classList.toggle('is-active', isActive);
        section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    links.forEach((link) => {
        const linkId = link.getAttribute('href').replace('#', '');
        const isCurrent = linkId === activeId;
        link.classList.toggle('is-active', isCurrent);
        if (isCurrent) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });

    const atStart = activeIndex === 0;
    const atEnd = activeIndex === sectionIds.length - 1;
    prevBtn.disabled = atStart;
    nextBtn.disabled = atEnd;
    if (prevBtnBottom) prevBtnBottom.disabled = atStart;
    if (nextBtnBottom) nextBtnBottom.disabled = atEnd;

    const indicatorText = `Розділ ${activeIndex + 1} з ${sectionIds.length}`;
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

    const sectionIds = getManualSectionIds(sections);
    let activeIndex = 0;

    function setActiveIndex(nextIndex, options = {}) {
        activeIndex = Math.max(0, Math.min(sectionIds.length - 1, nextIndex));
        updateManualPagingState({
            activeIndex,
            sectionIds,
            sections,
            links,
            prevBtn,
            nextBtn,
            prevBtnBottom,
            nextBtnBottom,
            indicator,
            indicatorBottom,
        });

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
            if (windowRef.innerWidth > 991) closeMenu();
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

    return {
        init() {
            initTopLinks();
            initPaging();
            initMobileMenu();
        },
        setActiveIndex,
        closeMenu,
        openMenu,
    };
}
