const { test, expect, beforeEach, describe } = require('@playwright/test')
const { loginWith, createBlog } = require('./helper')

describe('Blog app', () => {
  beforeEach(async ({ page, request }) => {
    await request.post('/api/testing/reset')
    page.pause()
    await request.post('/api/users', {
        data: {
            username: 'koala',
            name: 'Sezar',
            password: 'correct'
        }
    })
    await request.post('/api/users', {
        data: {
            username: 'adam',
            name: 'Smith',
            password: 'correct'
        }
    })
    await page.goto('/')
  })

  test('Login form is shown', async ({ page }) => {
    await page.getByRole('button', { name: 'login' }).click()
    await expect(page.getByTestId('username')).toBeVisible()
    await expect(page.getByTestId('password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
  })

  describe('Login', () => {
    test('succeeds with correct credentials', async ({ page }) => {
        await loginWith(page, 'koala', 'correct')
        await expect(page.getByText('Sezar logged in')).toBeVisible()
    })

    test('fails with wrong credentials', async ({ page }) => {
        await loginWith(page, 'koala', 'wrong')
        await expect(page.getByText('Invalid username or password')).toBeVisible()
    })
  })

  describe('When logged in', () => {
    const testBlog = { title: 'ADHD', author: 'Music Group', url: 'adhd.com'}

    beforeEach(async ({ page }) => {
        await loginWith(page, 'koala', 'correct')
    })
  
    test('a new blog can be created', async ({ page }) => {
        await createBlog(page, testBlog.title, testBlog.author, testBlog.url )
        await expect(page.getByText(`${testBlog.title} ${testBlog.author}`)).toBeVisible()
    })
    test('blog can be liked', async ({ page }) => {
        await createBlog(page, testBlog.title, testBlog.author, testBlog.url )
        await page.locator('li').getByRole('button', {name: 'view'}).click()
        await page.locator('li').getByRole('button', { name: 'like'}).click()
        await expect(page.getByText('likes: 1')).toBeVisible()
    })
    test('blog can be delete by author', async ({ page }) => {
        page.on('dialog', async (dialog) => {
            console.log(`Dialog message: ${dialog.message()}`);
            await dialog.accept()
        })

        await createBlog(page, testBlog.title, testBlog.author, testBlog.url )
        await page.locator('li').getByRole('button', {name: 'view'}).click()
        await page.getByRole('button', { name: 'remove' }).click()
        
        await expect(page.getByText('ADHD Music Group')).not.toBeVisible()
    })
    
    test("only the user who added the blog sees the blog's delete button", async ({ page }) => {
        await createBlog(page, testBlog.title, testBlog.author, testBlog.url )
        await page.locator('li').getByRole('button', {name: 'view'}).click()
        await expect(page.locator('li').getByRole('button', { name: 'remove'})).toBeVisible()

        await page.getByRole('button', { name: 'logout'}).click()
        await loginWith(page, 'adam', 'correct')
        await expect(page.getByText('Smith logged in')).toBeVisible()
        await expect(page.locator('li').getByRole('button', { name: 'remove'})).not.toBeVisible()
    })

    test('blogs are arranged in the order according to the likes', async ({ page }) => {
        await createBlog(page, 'First Blog', 'First', testBlog.url )
        await createBlog(page, 'Second Blog', 'Second', testBlog.url )
        await createBlog(page, 'Third Blog', 'Third', testBlog.url )

        await page.locator('li').filter({ hasText: 'First Blog First' }).getByRole('button').click()
        await page.getByRole('button', { name: 'like', exact: true }).click()
        await expect(page.getByText('likes: 1')).toBeVisible()
        await page.getByRole('button', { name: 'like', exact: true }).click()
        await expect(page.getByText('likes: 2')).toBeVisible()

        await page.locator('li').filter({ hasText: 'Second Blog Second' }).getByRole('button', { name: 'view' }).click()
        await page.getByRole('button', { name: 'like', exact: true }).click()
        await expect(page.getByText('likes: 1')).toBeVisible()
        await page.getByRole('button', { name: 'like', exact: true }).click()
        await expect(page.getByText('likes: 2')).toBeVisible()
        await page.getByRole('button', { name: 'like', exact: true }).click()
        await expect(page.getByText('likes: 3')).toBeVisible()

        await page.locator('li').filter({ hasText: 'Third Blog Third' }).getByRole('button', { name: 'view' }).click()
        await page.getByRole('button', { name: 'like', exact: true }).click()
        await expect(page.getByText('likes: 1')).toBeVisible()
        await page.getByRole('button', { name: 'hide', exact: true }).click()

        await page.getByRole('button', { name: 'sort by likes', exact: true }).click()
        const listElements = await page.locator('ul > li')
        
        expect(listElements).toHaveCount(3)
        expect(listElements.first()).toHaveText('Second Blog Second view')
        expect(listElements.nth(1)).toHaveText('First Blog First view')
        expect(listElements.nth(2)).toHaveText('Third Blog Third view')
    })


  })
})