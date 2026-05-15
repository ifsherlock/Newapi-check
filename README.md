# New-API Checkin (Modified)

> ⚠️ 本仓库基于 [1L426/Newapi-check](https://github.com/1L426/Newapi-check) 修改，使用 AI (Claude) 辅助完成代码修改。

New-API 多账号自动签到工具，支持定时签到、Cloudflare 绕过、实时进度追踪。

## 修改内容

以下修改由 AI 辅助完成，主要解决了原项目中账号连接测试/登录失败的问题：

### 1. `server/services/api-client.js`

- **修复重定向处理**：将 `redirect: 'manual'` 改为 `redirect: 'follow'`，解决站点有 HTTP→HTTPS 或路径规范化重定向时请求被误判为失败的问题
- **添加 `Referer` 和 `Origin` 请求头**：许多 new-api 站点会校验这两个头，原代码缺失导致请求被拒绝
- **`buildHeaders` 函数签名变更**：新增 `baseUrl` 参数用于生成 Referer/Origin

### 2. `src/components/AddAccountModal.jsx`

- **`New-Api-User` 字段对所有登录模式可见**：原来只有 Session Token 模式才显示该字段，但部分站点在密码登录模式下也需要此头才能正常鉴权

### 3. `docker-compose.yml`

- **添加时区配置**：增加 `TZ=Asia/Shanghai` 环境变量和 `/etc/localtime` 挂载，修复容器内时间不是北京时间的问题

## 原项目功能

- **多账号管理** - 支持添加多个 New-API 站点账号，支持密码登录和 Session Token 两种方式
- **自动签到** - 基于 Cron 表达式的定时签到，支持随机延迟防检测
- **Cloudflare 绕过** - 双层策略：直接 API 签到 + Puppeteer 浏览器兜底（Stealth 模式）
- **实时进度** - 通过 SSE（Server-Sent Events）实时推送批量签到进度
- **数据看板** - 签到统计、余额汇总、14天趋势图、日历热力图
- **数据安全** - AES-256-GCM 加密存储账号密码和 Token
- **导入导出** - 支持 JSON 格式的数据备份与恢复
- **暗色模式** - 支持亮色/暗色主题切换

## 部署方式

### Docker 部署（推荐）

```bash
git clone https://github.com/ifsherlock/Newapi-check.git
cd Newapi-check
docker-compose up -d --build
```

访问 `http://your-server-ip:3211`

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `TZ` | 时区 | `Asia/Shanghai` |
| `ENCRYPT_KEY` | AES 加密密钥，留空自动生成 | - |
| `PORT` | 后端端口 | `3211` |
| `NODE_ENV` | 运行环境 | `production` |

## 致谢

- 原项目：[1L426/Newapi-check](https://github.com/1L426/Newapi-check)
- 代码修改：由 AI (Claude / OpenClaw) 辅助分析问题并生成修复代码

## License

MIT
