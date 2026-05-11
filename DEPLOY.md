# 部署给别人测试

推荐用 Vercel，最省事。这个项目已经带好 `vercel.json`、`netlify.toml` 和 Node 版本声明，云端构建时会执行 `npm run build`，输出目录是 `dist`。

## 1. 上传到 GitHub

先在 GitHub 新建一个仓库，仓库名可以叫 `life-board`。然后在 VS Code 终端运行：

```bash
cd /home/codespace/life-board
git init
git add .
git commit -m "Create LifeBoard app"
git branch -M main
git remote add origin https://github.com/你的用户名/life-board.git
git push -u origin main
```

如果你用 GitHub CLI，也可以这样创建私有仓库并推送：

```bash
cd /home/codespace/life-board
git init
git add .
git commit -m "Create LifeBoard app"
gh repo create life-board --private --source . --remote origin --push
```

私有仓库也可以部署到 Vercel，别人只会看到测试网址，不会看到源代码。

## 2. 用 Vercel 发布

1. 打开 `https://vercel.com/new`
2. 登录后选择刚刚上传的 GitHub 仓库 `life-board`
3. Framework Preset 选择 `Vite`
4. 确认配置：
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. 点击 Deploy
6. 部署完成后复制 Vercel 给你的网址，发给别人测试

以后每次你执行：

```bash
git add .
git commit -m "Update app"
git push
```

Vercel 都会自动重新部署。

## 3. 用 Netlify 发布

1. 打开 `https://app.netlify.com/start`
2. 选择 GitHub，并导入仓库 `life-board`
3. 确认配置：
   - Build command: `npm run build`
   - Publish directory: `dist`
4. 点击 Deploy
5. 部署完成后复制 Netlify 给你的网址，发给别人测试

## 测试前检查

本地先跑一次：

```bash
npm test
```

通过后再推送，可以减少云端部署失败的概率。
