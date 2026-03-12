// js/common.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Handlers for manual.html ---
    const manualBackToEditorBtn = document.getElementById('manual-back-to-editor');
    if (manualBackToEditorBtn) {
        manualBackToEditorBtn.addEventListener('click', () => window.location.href = 'index.html');
    }

    const manualToLessonsBtn = document.getElementById('manual-to-lessons');
    if (manualToLessonsBtn) {
        manualToLessonsBtn.addEventListener('click', () => window.location.href = 'lessons.html');
    }

    const manualBackToEditorFooterBtn = document.getElementById('manual-back-to-editor-footer');
    if (manualBackToEditorFooterBtn) {
        manualBackToEditorFooterBtn.addEventListener('click', () => window.location.href = 'index.html');
    }

    const manualToLessonsFooterBtn = document.getElementById('manual-to-lessons-footer');
    if (manualToLessonsFooterBtn) {
        manualToLessonsFooterBtn.addEventListener('click', () => window.location.href = 'lessons.html');
    }

    // --- Handlers for resources.html ---
    // (Example IDs, you'll need to add these IDs to your buttons in resources.html)
    const resourcesToEditorBtn = document.getElementById('resources-to-editor');
    if (resourcesToEditorBtn) {
        resourcesToEditorBtn.addEventListener('click', () => window.location.href = 'index.html');
    }

    const resourcesToLessonsBtn = document.getElementById('resources-to-lessons');
    if (resourcesToLessonsBtn) {
        resourcesToLessonsBtn.addEventListener('click', () => window.open('lessons.html', '_blank'));
    }
    
    const resourcesToManualBtn = document.getElementById('resources-to-manual');
    if (resourcesToManualBtn) {
        resourcesToManualBtn.addEventListener('click', () => window.open('manual.html', '_blank'));
    }

    // --- Smooth scroll for Table of Contents links (if not handled by CSS globally) ---
    // CSS `scroll-behavior: smooth;` on `html` tag is preferred.
    // This JS is a fallback or for more complex scenarios.
    const tocLinks = document.querySelectorAll('.toc-list a');
    tocLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetElement = document.getElementById(href.substring(1));
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                    // Optionally update URL hash without page jump, if not using default behavior
                    // history.pushState(null, null, href); 
                }
            }
        });
    });

    // Add any other common JavaScript functionality here.
    // For example, handling a mobile navigation menu, theme switcher, etc.
});