import assert from 'node:assert/strict'
import { createBrowserPage, reset, expectRoute, assertNoErrors } from './helpers.mjs'

const { browser, context, page, errors } = await createBrowserPage()
const nav = (route) => page.locator(`.nav [data-route="${route}"]`)

try {
  await reset(page)
  await page.getByRole('heading', { name: /答案可以外包/ }).waitFor()

  await page.getByRole('button', { name: '开始第一次审议', exact: true }).click()
  await expectRoute(page, '#new', '#new-form')

  await page.getByRole('link', { name: '返回首页' }).click()
  await expectRoute(page, '#home', '.hero')

  await page.getByRole('button', { name: /AI 作业边界/ }).first().click()
  await expectRoute(page, '#new', '#new-form')
  assert.match(await page.locator('textarea[name="question"]').inputValue(), /使用 AI/)

  await nav('home').click()
  await expectRoute(page, '#home', '.hero')

  await page.getByRole('button', { name: '审计一次 AI 使用', exact: true }).click()
  await expectRoute(page, '#ai-audit', '#new-form')
  assert.equal(await page.locator('input[value="aiuse"]').isChecked(), true)

  await nav('history').click()
  await expectRoute(page, '#history', '.page-head')

  await nav('data').click()
  await expectRoute(page, '#data', '.data-grid')

  await nav('models').click()
  await expectRoute(page, '#models', '#ai-settings-form')

  await nav('new').click()
  await expectRoute(page, '#new', '#new-form')

  await nav('models').click()
  await expectRoute(page, '#models', '#ai-settings-form')
  await nav('home').click()
  await expectRoute(page, '#home', '.hero')

  assertNoErrors(errors)
  console.log('Primary navigation click-through passed.')
} finally {
  await context.close()
  await browser.close()
}
