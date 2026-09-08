export function getLessonsOrder(tabButtons) {
    return Array.from(tabButtons).map((button) => button.getAttribute('data-lesson')).filter(Boolean);
}

export function updateLessonView({
    lessonId,
    lessonContents,
    tabButtons,
    tabsContainer = null,
    scrollBehavior = 'smooth',
}) {
    const targetLesson = Array.from(lessonContents).find((content) => content.id === lessonId);
    const targetButton = Array.from(tabButtons).find((button) => button.getAttribute('data-lesson') === lessonId);
    if (!targetLesson || !targetButton) return false;

    lessonContents.forEach((content) => {
        content.classList.remove('active');
        content.style.display = 'none';
        content.setAttribute('hidden', '');
    });

    tabButtons.forEach((button) => {
        const isActive = button.getAttribute('data-lesson') === lessonId;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        button.setAttribute('tabindex', isActive ? '0' : '-1');
        if (isActive) {
            if (tabsContainer && tabsContainer.scrollWidth > tabsContainer.clientWidth) {
                button.scrollIntoView({ behavior: scrollBehavior, inline: 'center', block: 'nearest' });
            }
        }
    });

    targetLesson.style.display = 'block';
    targetLesson.removeAttribute('hidden');
    targetLesson.classList.add('active');
    return true;
}

export function getLessonTabTargetIndex(currentIndex, key, length) {
    if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= length || length <= 0) return -1;
    if (key === 'ArrowRight') return (currentIndex + 1) % length;
    if (key === 'ArrowLeft') return (currentIndex - 1 + length) % length;
    if (key === 'Home') return 0;
    if (key === 'End') return length - 1;
    return -1;
}

export function prefersReducedLessonMotion({ documentRef, windowRef }) {
    if (documentRef?.documentElement?.classList?.contains('a11y-reduce-animations')) return true;
    try {
        return !!windowRef?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    } catch {
        return false;
    }
}

export function updateLessonNavigationButtons({
    lessonContents,
    lessonsOrder,
    currentLessonId,
}) {
    const currentIndex = lessonsOrder.indexOf(currentLessonId);

    lessonContents.forEach((content) => {
        const prevBtn = content.querySelector('.nav-btn-prev');
        const nextBtn = content.querySelector('.nav-btn-next');

        if (prevBtn) {
            const hasPrev = currentIndex > 0;
            prevBtn.style.visibility = hasPrev ? 'visible' : 'hidden';
            prevBtn.disabled = !hasPrev;
            if (hasPrev) prevBtn.setAttribute('data-target-lesson', lessonsOrder[currentIndex - 1]);
        }

        if (nextBtn) {
            const hasNext = currentIndex >= 0 && currentIndex < lessonsOrder.length - 1;
            nextBtn.style.visibility = hasNext ? 'visible' : 'hidden';
            nextBtn.disabled = !hasNext;
            if (hasNext) nextBtn.setAttribute('data-target-lesson', lessonsOrder[currentIndex + 1]);
        }
    });
}

export function resolveInitialLessonId({
    search = '',
    hasLesson = () => false,
    fallbackLessonId = 'lesson1',
}) {
    const params = new URLSearchParams(search);
    const lessonFromUrl = params.get('lesson');
    if (lessonFromUrl && hasLesson(lessonFromUrl)) {
        return lessonFromUrl;
    }
    return fallbackLessonId;
}

export function createLessonsPageController(options) {
    const {
        documentRef,
        windowRef,
    } = options;
    const tabButtons = Array.from(documentRef.querySelectorAll('.tab-button'));
    const lessonContents = Array.from(documentRef.querySelectorAll('.lesson-content'));
    const tabsContainer = documentRef.querySelector('.tabs-container');
    const lessonsOrder = getLessonsOrder(tabButtons);
    let currentLessonId = lessonsOrder[0] || 'lesson1';

    function openLesson(lessonId, pushState = true) {
        if (!lessonsOrder.includes(lessonId)) return false;
        const scrollBehavior = prefersReducedLessonMotion({ documentRef, windowRef }) ? 'auto' : 'smooth';
        const didUpdate = updateLessonView({
            lessonId,
            lessonContents,
            tabButtons,
            tabsContainer,
            scrollBehavior,
        });
        if (!didUpdate) return false;
        currentLessonId = lessonId;
        updateLessonNavigationButtons({
            lessonContents,
            lessonsOrder,
            currentLessonId,
        });
        windowRef.scrollTo({ top: 0, behavior: scrollBehavior });

        if (pushState && windowRef.history?.pushState) {
            const url = new URL(windowRef.location.href);
            url.searchParams.set('lesson', lessonId);
            windowRef.history.pushState({ lesson: lessonId }, '', url);
        }
        return true;
    }

    function init() {
        tabButtons.forEach((button) => {
            button.addEventListener('click', () => {
                openLesson(button.getAttribute('data-lesson'));
            });
        });

        tabsContainer?.addEventListener('keydown', (event) => {
            const currentIndex = tabButtons.indexOf(event.target);
            const targetIndex = getLessonTabTargetIndex(currentIndex, event.key, tabButtons.length);
            if (targetIndex < 0) return;
            event.preventDefault();
            const targetButton = tabButtons[targetIndex];
            const lessonId = targetButton.getAttribute('data-lesson');
            if (openLesson(lessonId)) targetButton.focus();
        });

        lessonContents.forEach((content) => {
            const prevBtn = content.querySelector('.nav-btn-prev');
            const nextBtn = content.querySelector('.nav-btn-next');

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    openLesson(prevBtn.getAttribute('data-target-lesson'));
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    openLesson(nextBtn.getAttribute('data-target-lesson'));
                });
            }
        });

        windowRef.addEventListener('popstate', (event) => {
            const lessonId = event.state?.lesson || resolveInitialLessonId({
                search: windowRef.location.search,
                hasLesson: (id) => !!documentRef.getElementById(id),
                fallbackLessonId: lessonsOrder[0] || 'lesson1',
            });
            openLesson(lessonId, false);
        });

        const initialLessonId = resolveInitialLessonId({
            search: windowRef.location.search,
            hasLesson: (id) => !!documentRef.getElementById(id),
            fallbackLessonId: lessonsOrder[0] || 'lesson1',
        });
        openLesson(initialLessonId, !windowRef.location.search.includes('lesson='));
    }

    return {
        init,
        openLesson,
        getCurrentLessonId: () => currentLessonId,
    };
}
