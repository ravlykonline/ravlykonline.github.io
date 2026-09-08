import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    getLessonsOrder,
    getLessonTabTargetIndex,
    prefersReducedLessonMotion,
    resolveInitialLessonId,
    updateLessonView,
    updateLessonNavigationButtons,
} from '../js/modules/lessonsPageController.js';
import { runTest } from './testUtils.js';

runTest('lessons controller derives lesson order from tab buttons', () => {
    const order = getLessonsOrder([
        { getAttribute(name) { return name === 'data-lesson' ? 'lesson1' : null; } },
        { getAttribute(name) { return name === 'data-lesson' ? 'lesson2' : null; } },
        { getAttribute(name) { return name === 'data-lesson' ? 'lesson3' : null; } },
    ]);

    assert.deepEqual(order, ['lesson1', 'lesson2', 'lesson3']);
});

runTest('lessons controller resolves initial lesson from URL only when lesson exists', () => {
    assert.equal(
        resolveInitialLessonId({
            search: '?lesson=lesson3',
            hasLesson: (id) => id === 'lesson3',
            fallbackLessonId: 'lesson1',
        }),
        'lesson3'
    );

    assert.equal(
        resolveInitialLessonId({
            search: '?lesson=missing',
            hasLesson: () => false,
            fallbackLessonId: 'lesson1',
        }),
        'lesson1'
    );
});

runTest('lesson tabs wrap with arrows and support Home and End', () => {
    assert.equal(getLessonTabTargetIndex(2, 'ArrowRight', 3), 0);
    assert.equal(getLessonTabTargetIndex(0, 'ArrowLeft', 3), 2);
    assert.equal(getLessonTabTargetIndex(1, 'Home', 3), 0);
    assert.equal(getLessonTabTargetIndex(1, 'End', 3), 2);
    assert.equal(getLessonTabTargetIndex(4, 'ArrowRight', 3), -1);
    assert.equal(getLessonTabTargetIndex(0, 'Enter', 3), -1);
});

runTest('lesson view rejects invalid ids before hiding the current lesson', () => {
    const content = {
        id: 'lesson1',
        style: { display: 'block' },
        classList: { remove() {}, add() {} },
        setAttribute() { this.hidden = true; },
        removeAttribute() { this.hidden = false; },
    };
    const button = { getAttribute: () => 'lesson1' };
    assert.equal(updateLessonView({ lessonId: 'missing', lessonContents: [content], tabButtons: [button] }), false);
    assert.equal(content.style.display, 'block');
    assert.equal(content.hidden, undefined);
});

runTest('lesson scrolling honors saved and system reduced-motion state', () => {
    assert.equal(prefersReducedLessonMotion({
        documentRef: { documentElement: { classList: { contains: (name) => name === 'a11y-reduce-animations' } } },
        windowRef: { matchMedia: () => ({ matches: false }) },
    }), true);
    assert.equal(prefersReducedLessonMotion({
        documentRef: { documentElement: { classList: { contains: () => false } } },
        windowRef: { matchMedia: () => ({ matches: true }) },
    }), true);
});

runTest('lessons controller updates prev/next button state by current lesson', () => {
    const createButton = () => ({
        disabled: false,
        style: { visibility: 'visible' },
        attributes: {},
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
    });

    const lessonContents = [
        {
            querySelector(selector) {
                if (selector === '.nav-btn-prev') return this.prevBtn;
                if (selector === '.nav-btn-next') return this.nextBtn;
                return null;
            },
            prevBtn: createButton(),
            nextBtn: createButton(),
        },
    ];

    updateLessonNavigationButtons({
        lessonContents,
        lessonsOrder: ['lesson1', 'lesson2', 'lesson3'],
        currentLessonId: 'lesson2',
    });

    assert.equal(lessonContents[0].prevBtn.disabled, false);
    assert.equal(lessonContents[0].prevBtn.attributes['data-target-lesson'], 'lesson1');
    assert.equal(lessonContents[0].nextBtn.disabled, false);
    assert.equal(lessonContents[0].nextBtn.attributes['data-target-lesson'], 'lesson3');
});

runTest('production lessons page keeps lesson0 structure and manual deep links', () => {
    const html = fs.readFileSync('lessons.html', 'utf8');
    const tabMatches = html.match(/class="tab-button/g) ?? [];
    const panelMatches = html.match(/class="lesson-content/g) ?? [];
    const manualLinkMatches = html.match(/class="btn btn-primary lesson-manual-link"/g) ?? [];
    const detailsMatches = html.match(/<details>/g) ?? [];
    const pathRowMatches = html.match(/lesson-path-index/g) ?? [];

    assert.equal(html.includes('id="lesson0-tab"'), true, 'lessons.html must expose lesson0 tab');
    assert.equal(html.includes('id="lesson0" class="lesson-content active"'), true, 'lessons.html must start from lesson0');
    assert.equal(tabMatches.length, 10, 'lessons.html must expose 10 lesson tabs from lesson0 to lesson9');
    assert.equal(panelMatches.length, 10, 'lessons.html must expose 10 lesson panels from lesson0 to lesson9');
    assert.equal(pathRowMatches.length, 9, 'lessons.html must keep the lesson path table for lessons 1-9');
    assert.equal(html.includes('manual.html#movement'), true, 'lessons.html must keep movement manual link');
    assert.equal(html.includes('manual.html#game-mode'), true, 'lessons.html must keep game-mode manual link');
    assert.equal(manualLinkMatches.length, 9, 'lessons.html must keep CTA-style manual deep links across the course');
    assert.equal(html.includes('class="lesson-manual-link-group"'), true, 'lessons.html must keep grouped manual links for lesson7');
    assert.equal(html.includes('class="manual-table lesson-path-table"'), true, 'lessons.html must keep the lesson path table styling hook');
    assert.equal(detailsMatches.length >= 8, true, 'lessons.html must keep expandable hint and answer blocks');
    assert.equal(html.includes('class="bottom-nav-buttons"'), true, 'lessons.html must keep bottom site navigation');
    assert.equal(html.includes('Подумай:'), true, 'lessons.html must keep reflection block label');
    assert.equal(html.includes('Подумай наприкінці циклу:'), true, 'lessons.html must keep the final reflection block label');
});

runTest('production lessons page keeps new structure hooks for lesson0 and lesson7', () => {
    const html = fs.readFileSync('lessons.html', 'utf8');

    assert.equal(html.includes('class="lesson-subsection lesson-intro-subsection" aria-labelledby="lesson0-goal-title"'), true, 'lessons.html must keep lesson0 subsection wrappers');
    assert.equal(html.includes('class="lesson-subsection lesson-example-subsection lesson-path-section"'), true, 'lessons.html must keep the lesson path section');
    assert.equal(html.includes('id="lesson7-function-title"'), true, 'lessons.html must keep the lesson7 functions subsection');
    assert.equal(html.includes('manual.html#variables'), true, 'lessons.html must keep the variables deep link');
    assert.equal(html.includes('manual.html#functions'), true, 'lessons.html must keep the functions deep link');
});

runTest('lessons 4, 6, 7, 8 and 9 keep staged learning routes without changing ids', () => {
    const html = fs.readFileSync('lessons.html', 'utf8');
    for (let lesson = 0; lesson <= 9; lesson++) {
        assert.equal((html.match(new RegExp(`<article id="lesson${lesson}"`, 'g')) || []).length, 1);
        assert.equal((html.match(new RegExp(`id="lesson${lesson}-tab"`, 'g')) || []).length, 1);
    }
    assert.match(html, /Додаткове дослідження: 360\/N/);
    assert.match(html, /На цьому можна завершити заняття\. До координат повернися наступного разу\./);
    assert.match(html, /Етап А — змінна зі значенням/);
    assert.match(html, /Етап Б — оновлення змінної/);
    assert.match(html, /Етап В — функція без параметрів/);
    assert.match(html, /Етап Г — функція з параметром/);
    assert.match(html, /Етап А — <code>якщо число &gt; 5<\/code>/);
    assert.match(html, /Етап Г — остача <code>%<\/code>/);
    assert.match(html, /Завдання без клавіатури або офлайн/);
});

runTest('production lessons page does not depend on archive-only hooks', () => {
    const html = fs.readFileSync('lessons.html', 'utf8');

    assert.equal(html.includes('<h4>'), false, 'lessons.html must not depend on legacy h4 lesson headings');
    assert.equal(html.includes('lesson-image-fullwidth'), false, 'lessons.html must not depend on legacy full-width image helper');
});

runTest('repository no longer keeps archived lessons rollback page', () => {
    assert.equal(fs.existsSync('lessons_old.html'), false, 'lessons_old.html should be removed from the release branch');
});

console.log('Lessons tests completed.');
