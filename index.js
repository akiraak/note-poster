require('dotenv').config();
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { program } = require('commander');

program
  .name('post-note')
  .description('note.com に記事を投稿するCLIツール')
  .version('1.0.0')
  .requiredOption('-t, --title <title>', '記事タイトル')
  .requiredOption('-b, --body <body>', '記事本文')
  .option('-i, --image <path>', 'サムネイル画像のパス')
  .option('--tags <tags>', 'タグ（カンマ区切り）', '')
  .option('-p, --publish', '公開モード（指定しない場合は下書き保存）', false)
  .parse();

async function createDraft(page, title, bodyText, imagePath, isPublish, tags = []) {
  console.log('--- Creating Draft Start ---');
  const openEditorPage = async () => {
    await page.goto('https://note.com/notes/new');
    const titleInput = page.getByPlaceholder('記事タイトル');
    await titleInput.waitFor({ state: 'visible', timeout: 30000 });
  };

  const addThumbnail = async () => {
    // 画像がない、または文字列としての 'null'/'undefined' が来た場合はスキップ
    if (!imagePath || imagePath === 'null' || imagePath === 'undefined') { 
      console.log('Skipping thumbnail.'); 
      return; 
    }
    if (!fs.existsSync(imagePath)) { 
      console.error(`Image not found at: ${imagePath}`); 
      return; 
    }
    
    const addImgBtn = page.getByRole('button', { name: '画像を追加' });
    if (await addImgBtn.isVisible()) {
        await addImgBtn.click();
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.getByText('画像をアップロード').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(imagePath);
        const saveBtn = page.getByRole('button', { name: '保存', exact: true });
        await saveBtn.waitFor();
        await saveBtn.click();
        await page.waitForTimeout(3000);
    }
  };

  const inputTitle = async () => {
    const titleInput = page.getByPlaceholder('記事タイトル');
    await titleInput.click();
    await titleInput.clear();
    await titleInput.pressSequentially(title, { delay: 50 });
  };

  const inputBody = async () => {
    const editor = page.locator('.ProseMirror');
    await editor.click();
    
    // ★長文対策: 入力速度アップ(delay:5) & タイムアウト無効化(timeout:0)
    await editor.pressSequentially(bodyText, { delay: 5, timeout: 0 });

    await page.getByPlaceholder('記事タイトル').click();
  };

  const finalize = async () => {
    await page.waitForTimeout(3000);
    if (isPublish) {
      await page.getByRole('button', { name: '公開に進む' }).click();
      const tagInput = page.getByPlaceholder('ハッシュタグを追加する');
      await tagInput.waitFor();
      if (tags.length > 0) {
        for (const tag of tags) {
          await tagInput.fill(tag);
          await tagInput.press('Enter');
          await page.waitForTimeout(500);
        }
      }
      const postBtn = page.getByRole('button', { name: '投稿する', exact: true });
      await postBtn.click();
      await page.waitForTimeout(5000);
    } else {
      await page.getByRole('button', { name: '下書き保存' }).click();
      await page.waitForTimeout(3000);
    }
  };

  await openEditorPage();
  await addThumbnail();
  await inputTitle();
  await inputBody();
  await finalize();
}

// --- ログイン関数 ---
async function loginToNote(page, email, password) {
  console.log('--- Checking Login Status ---');
  await page.goto('https://note.com/');
  await page.waitForTimeout(1000);
  
  const loginBtn = page.getByRole('link', { name: 'ログイン' });
  if (await loginBtn.isVisible()) {
    await loginBtn.click();
    await page.waitForTimeout(2000);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'ログイン' }).click();
    await page.waitForURL('https://note.com/', { waitUntil: 'domcontentloaded' });
  }
}

// --- メイン処理 ---
(async () => {
  let browser;
  try {
    console.log('--- Launching Browser (Headless) ---');
    browser = await chromium.launch({
      headless: true, 
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ] 
    });

    const context = await browser.newContext({
       userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();

    // 認証情報は環境変数から取得
    const MY_EMAIL = process.env.NOTE_EMAIL;
    const MY_PASS  = process.env.NOTE_PASSWORD;

    // コマンドライン引数から取得
    const opts = program.opts();
    const TITLE = opts.title;
    const BODY = opts.body;
    const IMAGE_PATH = opts.image;
    const IS_PUBLISH_MODE = opts.publish;

    // タグ処理（カンマ区切りを配列に変換し、空白を除去）
    const TAGS = opts.tags.split(',').map(t => t.trim()).filter(t => t);

    await loginToNote(page, MY_EMAIL, MY_PASS);
    
    await createDraft(
      page, 
      TITLE, 
      BODY,
      IMAGE_PATH,
      IS_PUBLISH_MODE,
      TAGS
    );

    console.log('Successfully executed.');

  } catch (e) {
    console.error('Execution failed:', e);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
