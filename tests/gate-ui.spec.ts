import { expect, test } from '@playwright/test';

const frames = [
  { name: 'vehicle-released', path: '/vehicle-released?preview=design', heading: 'VEHICLE RELEASED', action: 'Scan next vehicle' },
  { name: 'pass-rejected', path: '/pass-rejected?preview=design', heading: 'PASS REJECTED', action: 'Call supervisor' },
  { name: 'queue-offline', path: '/sync-queue?preview=offline', heading: 'Sync Queue', action: 'Keep scanning' },
  { name: 'queue-synced', path: '/sync-queue?preview=synced', heading: 'ALL SCANS SYNCED', action: 'Keep scanning' },
  { name: 'shipments', path: '/shipments?preview=design', heading: 'Shipments', action: 'Scan' },
];

for (const size of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
  test(`five frames render and actions stay reachable at ${size.width} × ${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const frame of frames) {
      await page.goto(frame.path);
      await expect(page.getByRole('heading', { name: frame.heading, exact: true })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(() => page.locator('img').count()).toBeGreaterThan(0);
      await expect.poll(() => page.locator('img').evaluateAll(nodes => nodes.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
      await expect(page.getByRole('button', { name: frame.action, exact: true })).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const images = await page.locator('img').evaluateAll(nodes => nodes.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0));
      expect(images).toBe(true);
      await page.screenshot({ path: `.artifacts/screens/${frame.name}-${size.width}.png` });
      if (size.width === 320) {
        const lastContent = frame.name === 'vehicle-released' ? page.getByText(/Receiving gate at Washing Plant has been notified/)
          : frame.name === 'pass-rejected' ? page.getByText(/Possible re-used or copied pass/)
          : frame.name === 'queue-offline' ? page.getByText('TRF-2610-0425', { exact: true })
          : frame.name === 'queue-synced' ? page.getByText('Waiting', { exact: true })
          : page.getByText('TRF-2610-0415', { exact: true });
        await lastContent.scrollIntoViewIfNeeded();
        await expect(lastContent).toBeInViewport();
        const contentBox = await lastContent.boundingBox();
        const actionBox = await page.getByRole('button', { name: frame.action, exact: true }).boundingBox();
        expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(actionBox!.y);
        await page.screenshot({ path: `.artifacts/screens/${frame.name}-${size.width}-scrolled.png` });
      }
    }
    expect(errors).toEqual([]);
  });
}

test('search finds IDs, routes and normalized plates, and clears empty results', async ({ page }) => {
  await page.goto('/shipments?preview=design');
  await page.getByRole('button', { name: 'Search shipments' }).click();
  const input = page.getByRole('textbox', { name: 'Search by transfer ID, route, or vehicle' });
  for (const query of ['0418', 'biyagama katunayake', 'wp lb4521']) {
    await input.fill(query);
    await expect(page.getByText('TRF-2610-0418', { exact: true })).toBeVisible();
    await expect(page.getByText('TRF-2610-0411', { exact: true })).toHaveCount(0);
  }
  await input.fill('no-such-transfer');
  await expect(page.getByText('No shipments found')).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByText('TRF-2610-0411', { exact: true })).toBeVisible();
});

test('result actions, home, shipments tabs, and scanner navigation', async ({ page }) => {
  await page.goto('/vehicle-released?preview=design');
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/gate$/);
  await page.getByRole('tab', { name: 'Shipments' }).click();
  await expect(page).toHaveURL(/\/shipments$/);
  await expect(page.getByRole('tab', { name: 'Shipments' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Scan', exact: true }).click();
  await expect(page).toHaveURL(/\/scan$/);
  for (const [path, action] of [['/vehicle-released?preview=design', 'Scan next vehicle'], ['/pass-rejected?preview=design', 'Scan again'], ['/sync-queue?preview=offline', 'Keep scanning'], ['/sync-queue?preview=synced', 'Keep scanning']]) {
    await page.goto(path);
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page).toHaveURL(/\/scan$/);
  }
});

test('offline preview retries never remove queued scans', async ({ page }) => {
  await page.goto('/sync-queue?preview=offline');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Retry sync now' }).click();
  await expect(page.getByText('Queued', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Still offline. All pending scans are safely saved on this device.')).toBeVisible();
});

test('live search calls the backend and supervisor fallback is explicit', async ({ page }) => {
  await page.goto('/shipments');
  await page.getByRole('button', { name: 'Search shipments' }).click();
  await page.getByRole('textbox', { name: 'Search by transfer ID, route, or vehicle' }).fill('cp6630');
  await expect(page.getByText('TRF-2610-0411', { exact: true })).toBeVisible();
  await expect(page.getByText('TRF-2610-0418', { exact: true })).toHaveCount(0);
  await page.route('**/api/gate/config', route => route.fulfill({ json: { supervisorPhone: null, sampleData: true } }));
  await page.goto('/pass-rejected?preview=design');
  await page.getByRole('button', { name: 'Call supervisor' }).click();
  await expect(page.getByText(/No supervisor number is configured/)).toBeVisible();
});

test('HTTP contract rejects malformed requests and returns the original acknowledgment', async ({ request }) => {
  const { fresh } = await (await request.post('/api/gate/demo')).json();
  const scan = { id: `http_${Date.now()}`, ...fresh, scannedAt: new Date().toISOString() };
  const headers = { 'Idempotency-Key': scan.id };
  const first = await request.post('/api/gate/scans', { data: scan, headers });
  expect(first.ok()).toBe(true);
  const result = await first.json();
  const duplicate = await request.post('/api/gate/scans', { data: scan, headers });
  expect(await duplicate.json()).toEqual(result);
  const conflict = await request.post('/api/gate/scans', { data: { ...scan, vehicle: 'WP WRONG-1' }, headers });
  expect(conflict.status()).toBe(409);
  const malformed = await request.post('/api/gate/scans', { data: '{invalid json', headers });
  expect(malformed.status()).toBe(400);
});

test('real scanner records a release and rejects reuse with a valid signature', async ({ page, request }) => {
  const response = await request.post('/api/gate/demo');
  expect(response.ok()).toBe(true);
  const { fresh } = await response.json();
  for (const outcome of ['VEHICLE RELEASED', 'PASS REJECTED']) {
    await page.goto('/scan');
    await page.getByRole('textbox', { name: 'Signed pass', exact: true }).fill(fresh.token);
    await page.getByRole('textbox', { name: 'Vehicle plate', exact: true }).fill(fresh.vehicle);
    await page.getByRole('button', { name: 'Verify & release' }).click();
    await expect(page.getByRole('heading', { name: outcome, exact: true })).toBeVisible();
  }
  await expect(page.getByText('Valid', { exact: true })).toBeVisible();
  await expect(page.getByText('Already exited', { exact: true })).toBeVisible();
});

test('real offline queue survives retries, reconnects once and persists acknowledgments', async ({ page, context, request }) => {
  const response = await request.post('/api/gate/demo');
  const { fresh } = await response.json();
  let uploads = 0;
  page.on('request', req => { if (req.url().endsWith('/api/gate/scans') && req.method() === 'POST') uploads++; });
  await page.goto('/scan');
  await expect(page.getByRole('heading', { name: 'Scan Vehicle Pass' })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByText(/Offline scans are saved for verification/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Signed pass', exact: true }).fill(fresh.token);
  await page.getByRole('textbox', { name: 'Vehicle plate', exact: true }).fill(fresh.vehicle);
  await page.getByRole('button', { name: 'Verify & release' }).click();
  await expect(page).toHaveURL(/\/sync-queue$/);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Retry sync now' }).click();
  await expect(page.getByText('Queued', { exact: true })).toHaveCount(1);
  expect(uploads).toBe(0);
  await context.setOffline(false);
  await expect(page.getByRole('heading', { name: 'ALL SCANS SYNCED' })).toBeVisible();
  expect(uploads).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'ALL SCANS SYNCED' })).toBeVisible();
  expect(uploads).toBe(1);
});
