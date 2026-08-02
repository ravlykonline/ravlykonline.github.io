import { test, expect } from '@playwright/test';

const gameSuites = [
  { path: '/game/tests/index.html', summary: '#summary', name: 'unit rules' },
  { path: '/game/tests/encoding-check.html', summary: '#encoding-summary', name: 'encoding' },
  { path: '/game/tests/integration.html', summary: '#integration-summary', name: 'integration' },
  { path: '/game/tests/gameplay-integration.html', summary: '#gameplay-summary', name: 'gameplay' },
];

test.describe('published project test suites', () => {
  for (const suite of gameSuites) {
    test(`@desktop-chromium-only game: ${suite.name} browser suite passes`, async ({ page }) => {
      await page.goto(suite.path);

      const summary = page.locator(suite.summary);
      await expect(summary).toHaveClass(/\bpass\b/, { timeout: 15_000 });
      await expect(summary).not.toContainText('FAIL');
    });
  }
});
