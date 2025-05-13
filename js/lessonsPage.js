// js/lessonsPage.js
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const lessonContents = document.querySelectorAll(".lesson-content");
    const tabsContainer = document.querySelector('.tabs-container');
    let currentLessonId = 'lesson1'; // Default starting lesson

    function openLesson(lessonId, pushState = true) {
        currentLessonId = lessonId;

        lessonContents.forEach(content => {
            content.classList.remove("active");
            content.style.display = "none"; // Ensure it's hidden before animation
        });

        tabButtons.forEach(button => {
            button.classList.remove("active");
            if (button.getAttribute('data-lesson') === lessonId) {
                button.classList.add("active");
                // Scroll tab into view if container is scrollable
                if (tabsContainer && tabsContainer.scrollWidth > tabsContainer.clientWidth) {
                    button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            }
        });

        const targetLesson = document.getElementById(lessonId);
        if (targetLesson) {
            targetLesson.style.display = "block"; // Make it display block for animation
            // Force a reflow before adding 'active' class for animation to trigger
            // void targetLesson.offsetWidth; 
            targetLesson.classList.add("active");
        }

        updateNavButtonsVisibility();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (pushState && window.history.pushState) {
            // Update URL without reloading
            const url = new URL(window.location);
            url.searchParams.set('lesson', lessonId);
            window.history.pushState({lesson: lessonId}, '', url);
        }
    }

    function navigateToLesson(lessonId) {
        openLesson(lessonId);
    }

    function updateNavButtonsVisibility() {
        const lessonsOrder = Array.from(tabButtons).map(btn => btn.getAttribute('data-lesson'));
        const currentIndex = lessonsOrder.indexOf(currentLessonId);

        lessonContents.forEach(content => {
            const prevBtn = content.querySelector(".nav-btn-prev");
            const nextBtn = content.querySelector(".nav-btn-next");

            if (prevBtn) {
                if (currentIndex === 0) {
                    prevBtn.style.visibility = 'hidden';
                    prevBtn.disabled = true;
                } else {
                    prevBtn.style.visibility = 'visible';
                    prevBtn.disabled = false;
                    prevBtn.setAttribute('data-target-lesson', lessonsOrder[currentIndex - 1]);
                }
            }
            if (nextBtn) {
                if (currentIndex === lessonsOrder.length - 1) {
                    nextBtn.style.visibility = 'hidden';
                    nextBtn.disabled = true;
                } else {
                    nextBtn.style.visibility = 'visible';
                    nextBtn.disabled = false;
                    nextBtn.setAttribute('data-target-lesson', lessonsOrder[currentIndex + 1]);
                }
            }
        });
    }
    
    // Event listeners for tab buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const lessonId = this.getAttribute('data-lesson');
            openLesson(lessonId);
        });
    });

    // Event listeners for prev/next buttons within lesson content
    lessonContents.forEach(content => {
        const prevBtn = content.querySelector(".nav-btn-prev");
        const nextBtn = content.querySelector(".nav-btn-next");
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                navigateToLesson(this.getAttribute('data-target-lesson'));
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                navigateToLesson(this.getAttribute('data-target-lesson'));
            });
        }
    });
    
    // Handle back/forward browser navigation
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.lesson) {
            openLesson(event.state.lesson, false); // Don't push state again
        } else {
             // Fallback if no state, maybe go to first lesson or read from URL
            const urlParams = new URLSearchParams(window.location.search);
            const lessonFromUrl = urlParams.get('lesson') || 'lesson1';
            openLesson(lessonFromUrl, false);
        }
    });

    // Initial setup: Check URL for a lesson parameter
    const urlParams = new URLSearchParams(window.location.search);
    const initialLessonFromUrl = urlParams.get('lesson');
    
    if (initialLessonFromUrl && document.getElementById(initialLessonFromUrl)) {
        openLesson(initialLessonFromUrl, false); // Open lesson from URL, don't push state
    } else {
        openLesson('lesson1', true); // Default to first lesson and set URL param
    }
});