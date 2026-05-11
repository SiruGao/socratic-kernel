# LifeBoard 生活看板

一个可以直接运行的本地效率应用，包含任务管理、习惯打卡、笔记、统计总览、JSON 导入导出和本地数据保存。

## 功能

- 任务：新增、搜索、按状态/项目筛选、编辑、删除、状态流转、优先级和截止日期
- 习惯：新增、删除、最近 7 天打卡、每周目标、连续天数
- 笔记：新增、搜索、编辑、删除、置顶
- 总览：任务完成率、今日任务、逾期任务、习惯进度、完成分钟统计
- 数据：自动保存到浏览器 LocalStorage，支持导入和导出 JSON

## 在 VS Code 运行

1. 用 VS Code 打开这个文件夹：

   ```bash
   code /home/codespace/life-board
   ```

2. 打开 VS Code 终端：

   ```bash
   Ctrl + `
   ```

3. 安装依赖：

   ```bash
   npm install
   ```

4. 启动开发服务器：

   ```bash
   npm run dev
   ```

5. 在浏览器打开终端里显示的地址，通常是：

   ```text
   http://localhost:5173/
   ```

## 测试和打包

运行 lint 和生产构建检查：

```bash
npm test
```

只打包生产版本：

```bash
npm run build
```

预览生产构建：

```bash
npm run preview
```

## 给别人测试

正式发布推荐用 Vercel 或 Netlify。详细步骤见 [DEPLOY.md](./DEPLOY.md)。
