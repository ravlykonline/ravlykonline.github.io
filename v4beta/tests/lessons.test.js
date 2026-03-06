import assert from 'node:assert/strict';
import {
    getLessonsOrder,
    resolveInitialLessonId,
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

console.log('Lessons tests completed.');
