export function getLessonsOrder(tabButtons) {
    return Array.from(tabButtons).map((button) => button.getAttribute('data-lesson')).filter(Boolean);
}

export function updateLessonView({
    lessonId,
    lessonContents,
    tabButtons,
    tabsContainer = null,
}) {
    lessonContents.forEach((content) => {
        content.classList.remove('active');
        content.style.display = 'none';
        content.setAttribute('hidden', '');
    });

    tabButtons.forEach((button) => {
        const isActive = button.getAttribute('data-lesson') === lessonId;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) {
            button.removeAttribute('tabindex');
            if (tabsContainer && tabsContainer.scrollWidth > tabsContainer.clientWidth) {
                button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        } else {
            button.setAttribute('tabindex', '-1');
        }
    });

    const targetLesson = Array.from(lessonContents).find((content) => content.id === lessonId);
    if (targetLesson) {
        targetLesson.style.display = 'block';
        targetLesson.removeAttribute('hidden');
        targetLesson.classList.add('active');
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
        currentLessonId = lessonId;
        updateLessonView({
            lessonId,
            lessonContents,
            tabButtons,
            tabsContainer,
        });
        updateLessonNavigationButtons({
            lessonContents,
            lessonsOrder,
            currentLessonId,
        });
        windowRef.scrollTo({ top: 0, behavior: 'smooth' });

        if (pushState && windowRef.history?.pushState) {
            const url = new URL(windowRef.location.href);
            url.searchParams.set('lesson', lessonId);
            windowRef.history.pushState({ lesson: lessonId }, '', url);
        }
    }

    function init() {
        tabButtons.forEach((button) => {
            button.addEventListener('click', () => {
                openLesson(button.getAttribute('data-lesson'));
            });
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
