# Security Policy

## Supported versions

Socratic Kernel 仍处于早期开发阶段。安全修复只应用于 `main` 分支的最新版本。

| Version | Supported |
| --- | --- |
| `main` / latest deployment | Yes |
| Earlier snapshots | No |

## Reporting a vulnerability

请不要在公开 Issue 中披露能够直接利用的漏洞细节，尤其是涉及以下内容的问题：

- 本地思考档案被未授权读取或导出；
- 删除操作未能真正移除数据；
- 导入文件导致脚本执行或持久化注入；
- Service Worker 缓存污染；
- 部署配置暴露秘密信息；
- 未来模型代理中的提示注入、跨用户数据访问或密钥泄露。

请通过 GitHub 的 **Private vulnerability reporting** 功能提交报告：

`Security → Report a vulnerability`

报告中请包含：

1. 受影响版本或提交；
2. 可复现步骤；
3. 实际影响；
4. 建议修复方式；
5. 是否已经在其他渠道披露。

## Response expectations

维护者将尽力：

- 在 7 天内确认报告；
- 在确认风险后说明修复计划；
- 在修复发布前避免公开可利用细节；
- 在获得报告者同意后给予公开致谢。

## Privacy model

当前版本没有后端，数据默认保存在浏览器 `LocalStorage`。这降低了服务器泄露风险，但不意味着数据已经加密：

- 能访问用户浏览器配置文件的人，可能读取本地数据；
- 浏览器扩展可能拥有读取页面或存储的权限；
- 共享设备上的其他用户可能访问同一浏览器账户；
- 清除浏览器数据可能永久删除未导出的档案。

不要在当前版本中存储密码、API Key、身份证件、医疗记录或其他高敏感秘密。

## Out of scope

以下情况通常不作为安全漏洞处理：

- 用户主动将导出的 JSON 文件交给第三方；
- 浏览器或操作系统本身已被完全控制；
- 仅影响不受支持的旧提交；
- 不包含可利用路径的纯理论问题；
- 社会工程、钓鱼或对项目维护者的骚扰。
