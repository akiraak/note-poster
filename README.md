# note-poster

note.com に記事を投稿するCLIツール

## インストール

```bash
npm install
npx playwright install chromium
```

## 設定

`.env` ファイルを作成し、認証情報を設定：

```
NOTE_EMAIL=your-email@example.com
NOTE_PASSWORD=your-password
```

## 使い方

```bash
node index.js [options]
```

### オプション

| オプション | 短縮形 | 必須 | 説明 |
|-----------|-------|------|------|
| `--title <title>` | `-t` | 必須 | 記事タイトル |
| `--body <body>` | `-b` | 必須 | 記事本文 |
| `--image <path>` | `-i` | 任意 | サムネイル画像のパス |
| `--tags <tags>` | - | 任意 | タグ（カンマ区切り） |
| `--publish` | `-p` | 任意 | 公開モード（未指定時は下書き保存） |
| `--help` | `-h` | - | ヘルプを表示 |
| `--version` | `-V` | - | バージョンを表示 |

### 例

下書き保存：
```bash
node index.js -t "タイトル" -b "本文テキスト"
```

画像・タグ付きで公開：
```bash
node index.js -t "タイトル" -b "本文" -i "./image.png" --tags "タグ1,タグ2" -p
```

## 依存関係

- [playwright](https://playwright.dev/) - ブラウザ自動化
- [commander](https://github.com/tj/commander.js) - CLIオプション解析
- [dotenv](https://github.com/motdotla/dotenv) - 環境変数管理
