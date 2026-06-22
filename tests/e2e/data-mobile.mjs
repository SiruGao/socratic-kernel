import assert from 'node:assert/strict'
import { createBrowserPage, reset, expectRoute, assertNoErrors } from './helpers.mjs'

const desktop = await createBrowserPage()
try {
  await reset(desktop.page, '#data')
  await expectRoute(desktop.page, '#data', '.data-grid')

  const [download] = await Promise.all([
    desktop.page.waitForEvent('download'),
    desktop.page.getByRole('button', { name: '导出 JSON', exact: true }).click(),
  ])
  assert.match(download.suggestedFilename(), /\.json$/)

  await desktop.page.locator('#file').setInputFiles({
    name: 'archive.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 2, sessions: [] })),
  })
  await desktop.page.getByText('档案已导入', { exact: true }).waitFor()

  desktop.page.once('dialog', (dialog) => dialog.dismiss())
  await desktop.page.getByRole('button', { name: '永久删除', exact: true }).click()
  await expectRoute(desktop.page, '#data', '.data-grid')
  assertNoErrors(desktop.errors)
} finally {
  await desktop.context.close()
  await desktop.browser.close()
}

const mobile = await createBrowserPage({ width: 390, height: 844 })
try {
  await reset(mobile.page)
  await mobile.page.getByRole('button', { name: '开始一次审议', exact: true }).click()
  await expectRoute(mobile.page, '#new', '#new-form')
  assert.ok(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))

  await mobile.page.locator('.nav [data-route="models"]').click()
  await expectRoute(mobile.page, '#models', '#ai-settings-form')
  assert.ok(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))

  await mobile.page.locator('.nav [data-route="new"]').click()
  await expectRoute(mobile.page, '#new', '#new-form')
  assertNoErrors(mobile.errors)
  console.log('Data controls and mobile navigation passed.')
} finally {
  await mobile.context.close()
  await mobile.browser.close()
}
