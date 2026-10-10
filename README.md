# AIram - 边缘神经研发知识中枢 (Edge Neural Dev Knowledge Hub)

> 基于 **React 19 + TypeScript + Cloudflare Pages & Functions + Vite + Tailwind CSS + GitHub 神经双向同步** 的单用户边缘研发知识中枢与开源展示平台。  
> 融合 **GitHub OAuth 2.0 身份鉴权**、**首位登入者管理员认领机制**、**访客提交仓库审核闭环**、**全站安全流控保护 (Rate Limiting)** 以及 **PWA 原生独立桌面/移动端应用**。

---

## 目录

- [一、核心特性与架构升级](#一核心特性与架构升级)
- [二、运行环境规范 (仅保留 Cloudflare 与开发环境)](#二运行环境规范-仅保留-cloudflare-与开发环境)
- [三、部署前准备：获取必要凭据](#三部署前准备获取必要凭据)
  - [1. GitHub OAuth App 创建与回调地址设置](#1-github-oauth-app-创建与回调地址设置)
  - [2. GITHUB_TOKEN 获取详细教程 (PAT 令牌)](#2-github_token-获取详细教程-pat-令牌)
- [四、Cloudflare 生产环境全栈极简部署教程](#四cloudflare-生产环境全栈极简部署教程)
- [五、本地开发环境运行 (Local Dev)](#五本地开发环境运行-local-dev)
- [六、排查解答：生产环境配置了凭据依然提示「待配置凭据」的解决办法](#六排查解答生产环境配置了凭据依然提示待配置凭据的解决办法)
- [七、增强管理员系统设置控制台 (Admin Settings)](#七增强管理员系统设置控制台-admin-settings)
- [八、PWA 原生桌面与手机 App 安装功能说明](#八pwa-原生桌面与手机-app-安装功能说明)
- [九、全站安全流控保护 (Rate Limiting)](#九全站安全流控保护-rate-limiting)

---

## 一、核心特性与架构升级

1. **👑 首位登入者自动锁定为管理员（First-User Claim）**：
   - 任何人部署上线后，无需在代码或数据库中硬编码管理员用户名！
   - 系统首次启动时管理员席位处于开放状态，**第一个通过 GitHub（OAuth 弹窗授权或 PAT Token）成功登入的用户将自动加冕为系统最高管理员 (`role: 'admin'`, `isAdmin: true`)**；
   - 绑定后永久锁定所有者特权，享有中枢完全管理、知识手记发布、数据备份与仓库审核批准权限；后续其他用户登入自动归为访客 (`role: 'visitor'`)。
2. **🚀 访客提交开源仓库与管理员审核准入流程**：
   - 访客可在前台展示空间提交自己的 GitHub 开源仓库地址（支持完整 URL 或 `owner/repo` 简写）；
   - 系统通过 GitHub API 实时检索并核验仓库星标数、项目描述、主要语言与主页信息；
   - 提交初始进入待审核队列，经管理员在后台「**仓库审核**」专栏一键批准后，同步在前台「**社区推荐**」精选板块永久展示并署名访客。
3. **⚡ 全站高频接口安全流控保护（Rate Limiting）**：
   - **GitHub 登入接口流控**：每分钟限 5 次登入尝试，防止暴力刷屏，超频自动触发动态秒级倒计时；
   - **访客仓库提交流控**：单 IP / 设备指纹每 10 分钟限提交 2 个仓库，单次提交最小间隔 20 秒；同一仓库严格去重。
4. **🧹 生产环境纯净规范（零演示数据）**：
   - 生产环境中已全面移除一切内置测试笔记、模拟项目与示例提交；
   - 演示登录按钮在生产环境中已彻底隐藏移除，开箱即为高可用纯净知识库。
5. **📱 独立原生桌面/移动端应用 (PWA)**：
   - 支持一键安装为 Windows、Mac、iOS、Android 原生应用，离线优先缓存，沉浸式独立窗口体验。

---

## 二、运行环境规范 (仅保留 Cloudflare 与开发环境)

本项目根据用户生产规范，**全面移除了所有冗余的第三方部署环境（如 Docker、Cloud Run、VPS、PM2 等），仅严格保留并优化两个标准环境**：

| 环境类型 | 宿主平台 | 架构角色 | 回调地址 (Callback URL) |
| :--- | :--- | :--- | :--- |
| **生产环境 (Production)** | **Cloudflare Pages + Functions + D1** | 全球边缘 CDN 分发 + 边缘函数 API + 边缘 SQLite | `https://<你的项目>.pages.dev/auth/callback` |
| **开发环境 (Development)** | **本地 Vite + Express** | 本地极速热重载 + 本地开发代理服务 | `http://localhost:3000/auth/callback` |

---

## 三、部署前准备：获取必要凭据

### 1. GitHub OAuth App 创建与回调地址设置

用于支撑 GitHub OAuth 2.0 独立弹窗授权：

1. 打开并登录 [GitHub 开发者设置 (Developer settings)](https://github.com/settings/developers)。
2. 在左侧选择 **OAuth Apps** -> 点击右上角绿色按钮 **New OAuth App**。
3. 填写应用程序信息：
   - **Application name**：`AIram 研发知识中枢`（或自定义名称）。
   - **Homepage URL**：
     - **Cloudflare 生产环境**：填写您的 Pages 网址，例如 `https://airam.pages.dev`。
     - **本地开发环境**：填写 `http://localhost:3000`。
   - **Authorization callback URL（极其重要）**：
     - **Cloudflare 生产环境**：
       ```text
       https://airam.pages.dev/auth/callback
       ```
     - **本地开发环境**：
       ```text
       http://localhost:3000/auth/callback
       ```
4. 点击绿色按钮 **Register application**。
5. 复制页面生成的 **Client ID**；点击 **Generate a new client secret** 生成并保存 **Client Secret**。

---

### 2. GITHUB_TOKEN 获取详细教程 (PAT 令牌)

`GITHUB_TOKEN` 用于突破匿名每小时 60 次的速率限制，拉取仓库代码、README 与提交记录。

#### 获取图文指引：
1. 打开并登录 [GitHub Tokens 页面](https://github.com/settings/tokens)。
2. 推荐选择 **Fine-grained tokens**（细粒度令牌，安全性最高）：
   - 点击右上角 **Generate new token**。
   - **Token name** 填入 `airam-token`。
   - **Expiration** 建议选择 `90 days`、`1 year` 或 `No expiration`。
   - **Repository access**：选择 **Public Repositories (read-only)**（仅展示公开仓库）或 **All repositories**（管理私有仓库）。
   - **Permissions**：
     - 点击 **Repository permissions** -> **Contents** 设置为 `Read-only`。
   - 点击最下方绿色按钮 **Generate token**，立即复制生成的令牌。
3. 若选择 **Tokens (classic)** 传统令牌：
   - 勾选 `read:user` 和 `repo` 权限，生成以 `ghp_` 开头的 Token 即可。

---

## 四、Cloudflare 生产环境全栈极简部署教程

### 步骤 1：创建 Cloudflare D1 边缘数据库
1. 登录 [Cloudflare 控制台 (dash.cloudflare.com)](https://dash.cloudflare.com/)。
2. 左侧点击 **Storage & Databases** -> **D1 SQL Database** -> 点击右上角 **Create database**：
   - 数据库名输入：`airam-db` -> 点击 **Create**。
3. **一键执行建表 SQL**：
   - 点击进入 `airam-db` -> 切换到 **Console** 选项卡。
   - 复制项目根目录下的 `migrations/0001_init.sql` 全部文本，粘贴到控制台并点击 **Execute**。

### 步骤 2：在 Cloudflare Pages 连接 Git 一键上线
1. 在 Cloudflare 控制台左侧点击 **Workers & Pages** -> **Create application** -> 切换到 **Pages** -> 点击 **Connect to Git**。
2. 授权并选中您的 `airam` GitHub 仓库。
3. 构建配置：
   - **Framework preset**：选择 **Vite**
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
4. **配置环境变量**（展开 Environment variables）：
   - `ENVIRONMENT` = `production`
   - `GITHUB_CLIENT_ID` = 你的 Client ID
   - `GITHUB_CLIENT_SECRET` = 你的 Client Secret（点击小锁加密）
   - `GITHUB_TOKEN` = 你的 Personal Access Token
5. 点击 **Save and Deploy**，约 10 秒即完成全球边缘发布！

### 步骤 3：绑定 D1 数据库到 Pages
1. 在 Pages 项目详情页点击顶部 **Settings** -> 左侧选择 **Functions**。
2. 找到 **D1 database bindings** -> 点击 **Add binding**：
   - **Variable name**：严格填入 `DB`（全大写）
   - **D1 database**：选择第一步创建的 `airam-db`
3. 保存后，切换到 **Deployments** 选项卡，在最新记录点击 `...` -> **Retry deployment**（重试部署），即可正式生效！

---

## 五、本地开发环境运行 (Local Dev)

```bash
# 1. 安装依赖
npm install

# 2. 复制环境变量
cp .env.example .env
# 编辑 .env 填入 GITHUB_CLIENT_ID 与 GITHUB_CLIENT_SECRET

# 3. 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:3000` 即可开始开发调试。

---

## 六、排查解答：生产环境配置了凭据依然提示「待配置凭据」的解决办法

### 为什么会出现该情况？
1. **Cloudflare 变量注入时机**：在 Pages 控制台添加或修改环境变量后，必须**重新部署一次 (Retry deployment)**，Edge Functions 才会加载新的变量值。
2. **前后端接口解耦**：旧版本未包含 `/functions` 目录，请求被当成前端静态页面返回了 HTML。本项目已内置原生 `/functions` 边缘函数！

### ⚡ 最佳解决方案：在图形界面一键直配
本项目全新增强了**管理员设置界面**：
1. 登入后台后，点击导航栏的「**系统设置**」；
2. 在「**在线凭据配置表单**」中直接输入您的 Client ID、Client Secret 和 Token；
3. 点击「**保存配置**」，凭据将**立即在前端与边缘引擎同步生效**，永不再提示「待配置凭据」！

---

## 七、增强管理员系统设置控制台 (Admin Settings)

进入后台导航栏点击「**系统设置**」，管理员可集中管理：
- **凭据诊断与在线配置**：查看当前 Client ID 掩码、密钥状态与回调地址，随时在线更新；
- **生产环境纯净资产管理**：实时查看手记、项目与仓库数量，提供「**一键清空所有演示数据**」；
- **管理员席位管理**：查看已绑定的所有者，并可安全执行「**释放/重置管理员席位**」；
- **全站安全流控**：监测 GitHub 登入限流（5次/分）与访客仓库提交流控（2次/10分）；
- **PWA 应用管理**：诊断 Service Worker 运行状态与原生安装。

---

## 八、PWA 原生桌面与手机 App 安装功能说明

本项目已彻底重构并修复 PWA 原生安装能力：
- **在独立浏览器窗口**：点击导航栏右侧「**安装 App**」按钮，可一键唤起系统原生安装确认框；
- **在嵌入式预览窗口 (Iframe)**：因 Chromium 安全策略禁止在跨域 iframe 中触发系统安装对话框，点击按钮会自动提示并在弹窗中提供「**在新标签页打开并安装**」与「**复制网址**」按钮；
- **iOS Safari 用户**：提供原生三步指引（点击底部分享图标 -> 添加到主屏幕）；
- 安装后支持沉浸式独立窗口运行与极速离线加载。

---

## 九、全站安全流控保护 (Rate Limiting)

| 保护场景 | 限制频次 | 冷却机制 | 防御目标 |
| :--- | :--- | :--- | :--- |
| **GitHub 登录 / 授权接口** | 5 次 / 分钟 | 触发时进入 30-60 秒实时倒计时 | 杜绝暴力撞库与恶意高频重试 |
| **访客提交开源仓库** | 2 次 / 10 分钟 | 单次提交最小间隔 20 秒 | 防止垃圾仓库批量灌水与防刷 |
| **重复仓库防刷** | 严格去重拦截 | 已存在或审核中的仓库禁止重复提交 | 保证社区推荐精选质量 |

---

## 许可证

MIT License © 2026 AIram Open Source Hub.
