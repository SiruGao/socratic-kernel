# 发布在线应用

Socratic Kernel 使用两种部署：

- **GitHub Pages**：免费、纯本地模式、PWA 可安装，不保存模型供应商密钥；
- **Vercel**：同一套前端，加上 `/api` 模型网关，可安全接入大模型。

## GitHub Pages：第一次启用

仓库已经包含自动发布工作流：

```text
.github/workflows/deploy-kernel-pages.yml
```

但 GitHub 要求仓库管理员第一次手动选择发布源：

1. 打开仓库 `SiruGao/socratic-kernel`；
2. 进入 **Settings**；
3. 左侧进入 **Pages**；
4. 在 **Build and deployment** 下，将 **Source** 选择为 **GitHub Actions**；
5. 返回 **Actions**；
6. 打开 **Deploy Socratic Kernel**；
7. 点击 **Run workflow**，选择 `main` 后运行。

部署成功后，公开地址是：

```text
https://sirugao.github.io/socratic-kernel/
```

以后每次代码合并到 `main`，GitHub Actions 都会自动测试、构建并重新发布。

## 让链接显示在仓库右侧

README 中已经有在线应用入口，但 GitHub 仓库右侧的 Website 属于仓库元数据，需要单独填写：

1. 回到仓库首页；
2. 在右侧 **About** 区域点击齿轮图标；
3. Description 填写：

```text
A local-first Socratic inquiry app for protecting human judgment in the age of AI.
```

4. Website 填写：

```text
https://sirugao.github.io/socratic-kernel/
```

5. 勾选 **Use your GitHub Pages website**（如果页面显示此选项）；
6. 保存。

完成后，在线应用链接会显示在仓库首页右侧，也会进入仓库搜索和分享预览的元数据。

## 检查部署失败

进入：

```text
Actions → Deploy Socratic Kernel → 最近一次运行
```

工作流分为两个任务：

1. `build`：语法检查、自动测试、静态构建、上传 Pages artifact；
2. `deploy`：把构建结果发布到 `github-pages` 环境。

常见问题：

- **Pages source 未选择 GitHub Actions**：回到 Settings → Pages 设置；
- **build 失败**：查看 Test 或 Build 步骤的错误；
- **deploy 被等待审批**：打开 `github-pages` environment 并批准部署，或移除不必要的保护规则；
- **旧页面未更新**：等待部署完成后强制刷新，或清理旧 Service Worker 缓存；
- **404**：确认地址包含仓库路径 `/socratic-kernel/`。

## Vercel AI 版本

GitHub Pages 只能运行本地规则引擎。需要启用 OpenAI、Claude、Gemini、DeepSeek、Qwen、Kimi 或 Grok 时，使用 Vercel 部署并配置服务端环境变量。

完整配置见 [`AI_GATEWAY.md`](./AI_GATEWAY.md)。
