# Socratic Kernel · 内核

> 答案可以外包，判断不能。

Socratic Kernel 是一个本地优先的认知自主权练习工具。它不会替用户作出人生判断，而是要求用户先写下自己的立场，再通过概念澄清、证据检验、可证伪性、最强反方、价值来源、长期后果和责任归属等维度完成一次结构化审议。

## 在线使用

GitHub Pages 启用后，应用发布在：

`https://sirugao.github.io/life-board/`

仓库重命名为 `socratic-kernel` 后，地址将变为：

`https://sirugao.github.io/socratic-kernel/`

## 已实现

- 决策审议
- 观点审查
- 阅读质疑
- 自我反思
- AI 使用审计
- 绝对化表达、外部评价、紧迫性、判断外包和流畅性信任等线索检测
- 逐题苏格拉底式追问
- 最终判断、行动和责任确认
- 长期思考档案与信心变化
- 单条删除、全部删除、JSON 导入导出
- PWA 安装与离线使用
- 无服务端、无登录、无分析 SDK

## 本地运行

这是一个零依赖静态应用。

```bash
python3 -m http.server 4173
```

浏览器打开：

```text
http://localhost:4173
```

## 测试

```bash
node --check app.js
node tests/smoke.mjs
```

## 文件结构

```text
.
├── index.html
├── app.js
├── styles.css
├── icon.svg
├── manifest.webmanifest
├── sw.js
├── docs/
│   ├── PRODUCT.md
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
└── tests/
    └── smoke.mjs
```

## 产品边界

Socratic Kernel 当前不是心理治疗、医疗、法律或财务建议工具，也不声称能够诊断人格或心理状态。认知线索只是需要用户继续核验的假设。

更完整的产品原则见 [`docs/PRODUCT.md`](docs/PRODUCT.md)，技术架构见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)，路线图见 [`docs/ROADMAP.md`](docs/ROADMAP.md)。
