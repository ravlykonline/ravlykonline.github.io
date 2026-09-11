import { test, expect } from '@playwright/test';

test('TXT export/import round trip and replacement protection', async ({ page }) => {
  await page.goto('/index.html');
  const editor = page.locator('#code-editor');
  const source = 'вперед 10\n// 🐌';
  await editor.fill(source);
  await page.locator('#download-btn').click();
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#download-code-btn').click();
  const download = await downloadEvent;
  await page.reload();
  const chooserEvent = page.waitForEvent('filechooser');
  await page.locator('#open-code-btn').click();
  const chooser = await chooserEvent;
  // Use the actual exported bytes with the original TXT filename.
  const { readFile } = await import('node:fs/promises');
  await chooser.setFiles({ name: download.suggestedFilename(), mimeType: 'text/plain', buffer: await readFile(await download.path()) });
  await expect(editor).toHaveValue(source);
  await expect(page.locator('#stop-btn')).toBeDisabled();
  const payload = { name: 'next.txt', mimeType: 'text/plain', buffer: Buffer.from('праворуч 90') };
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('#open-code-input').setInputFiles(payload);
  await expect(editor).toHaveValue(source);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#open-code-input').setInputFiles(payload);
  await expect(editor).toHaveValue('праворуч 90');
  await page.locator('#open-code-input').setInputFiles({ name: 'binary.txt', mimeType: 'text/plain', buffer: Buffer.from([0, 255]) });
  await expect(editor).toHaveValue('праворуч 90');
});

test('TXT containing markup stays inert in the editor', async ({ page }) => {
  await page.goto('/index.html');
  const source = '<img src=x onerror="window.importExecuted=true">';
  await page.locator('#open-code-input').setInputFiles({ name: 'code.txt', mimeType: 'text/plain', buffer: Buffer.from(source) });
  await expect(page.locator('#code-editor')).toHaveValue(source);
  expect(await page.evaluate(() => window.importExecuted)).toBeUndefined();
  await expect(page.locator('#stop-btn')).toBeDisabled();
});
