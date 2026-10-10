# AIram 部署与上线指南 (Cloudflare 生产环境与本地开发环境)

> **环境说明**：本项目已严格遵循规范，**仅保留 Cloudflare 全栈生产环境与本地开发环境**，移除了所有其他第三方部署平台。生产环境默认已自动清除所有模拟演示数据，开箱即为高可用纯净状态。

---

## 目录
1. [一、环境准备与凭据获取](#一环境准备与凭据获取)
   - [1. GitHub OAuth App 创建与回调地址配置](#1-github-oauth-app-创建与回调地址配置)
   - [2. GITHUB_TOKEN 获取详细教程 (PAT 细粒度令牌)](#2-github_token-获取详细教程-pat-细粒度令牌)
2. [二、Cloudflare 生产环境部署 (Pages + Functions + D1)](#二cloudflare-生产环境部署-pages--functions--d1)
   - [步骤 1：代码推送至 GitHub 仓库](#步骤-1代码推送至-github-仓库)
   - [步骤 2：在 Cloudflare 控制台创建 D1 数据库](#步骤-2在-cloudflare-控制台创建-d1-数据库)
   - [步骤 3：在 Cloudflare Pages 连接 Git 一键构建](#步骤-3在-cloudflare-pages-连接-git-一键构建)
   - [步骤 4：配置 Cloudflare 环境变量与 D1 绑定](#步骤-4配置-cloudflare-环境变量与-d1-绑定)
3. [三、本地开发环境运行 (Local Dev)](#三本地开发环境运行-local-dev)
4. [四、生产环境「待配置凭据 (环境变量)」排查与即时解决](#四生产环境待配置凭据-环境变量排查与即时解决)
5. [五、系统上线后首位管理员认领与 PWA 原生应用安装](#五系统上线后首位管理员认领与-pwa-原生应用安装)

---

## 一、环境准备与凭据获取

### 1. GitHub OAuth App 创建与回调地址配置

为了启用全站基于 GitHub 的安全身份鉴权（首位登入者自动加冕为系统最高管理员，后续访客可提交开源仓库）：

1. 打开并登录 [GitHub 开发者设置](https://github.com/settings/developers)。
2. 在左侧选择 **OAuth Apps** -> 点击右上角绿色按钮 **New OAuth App**。
3. 填写应用程序信息：
   - **Application name**：`AIram 研发知识中枢`（或自定义）。
   - **Homepage URL**：
     - **Cloudflare 生产环境**：填写您的 Pages 网址，例如 `https://airam.pages.dev`（或您的自定义域名）。
     - **本地开发环境**：填写 `http://localhost:3000`。
   - **Authorization callback URL（极其重要，必须完全匹配）**：
     - **Cloudflare 生产环境**：
       ```text
       https://airam.pages.dev/auth/callback
       ```
       *(若使用自定义域名，形如 `https://your-domain.com/auth/callback`)*
     - **本地开发环境**：
       ```text
       http://localhost:3000/auth/callback
       ```
4. 点击绿色按钮 **Register application** 完成注册。
5. 创建成功后：
   - 复制生成的 **Client ID**（形如 `Ov23li...`）；
   - 点击 **Generate a new client secret** 生成并立即复制保存 **Client Secret**（离开页面后将不再明文显示）。

---

### 2. GITHUB_TOKEN 获取详细教程 (PAT 细粒度令牌)

`GITHUB_TOKEN` 用于突破 GitHub 匿名 API 每小时 60 次的调用限制（授权后升至每小时 5000 次），并用于中枢读取仓库 README 和代码资产。

#### 步骤详解：
1. 登录 GitHub，点击右上角个人头像 -> 选择 **Settings**（设置）。
2. 在左侧菜单滑动到底部，点击 **Developer settings**（开发者设置）。
3. 在左侧导航栏展开 **Personal access tokens**（个人访问令牌），推荐选择 **Fine-grained tokens**（细粒度令牌）或 **Tokens (classic)**。

##### 方式 A：创建 Fine-grained Token（推荐，安全性最高）
1. 点击右上角 **Generate new token**。
2. 设置基本信息：
   - **Token name**：`airam-sync-token`
   - **Expiration**（有效期）：建议选择 `90 days`、`1 year` 或根据需要自定义
   - **Description**：`Token for AIram Edge Knowledge Hub repository sync`
3. **Repository access**（仓库访问权限）：
   - 选择 **Public Repositories (read-only)**（若仅展示公开项目）；
   - 或选择 **All repositories**（若需要中枢管理您的私有仓库）。
4. **Permissions**（权限配置）：
   - 点击展开 **Repository permissions**：
     - **Contents**：选择 `Read-only`（用于读取仓库 README.md 与 package.json）
     - **Metadata**：默认自带 `Read-only`
   - 点击展开 **Account permissions**：
     - **Email addresses**：选择 `Read-only`（可选）
5. 滑动到页面最底部，点击绿色按钮 **Generate token**。
6. 立即复制生成的令牌（格式形如 `github_pat_11A...`），保存妥当。

##### 方式 B：创建 Classic Token（经典令牌，创建最快）
1. 在 Personal access tokens 中选择 **Tokens (classic)** -> 点击 **Generate new token (classic)**。
2. **Note** 填写 `airam-classic-token`。
3. 勾选权限范围（Scopes）：
   - ☑️ `read:user`（读取基本用户资料）
   - ☑️ `user:email`（读取公开邮箱）
   - ☑️ `repo`（读取公开/私有仓库，若只需公开勾选 `public_repo` 即可）
4. 点击底部 **Generate token**，立即复制以 `ghp_` 开头的密钥。

---

## 二、Cloudflare 生产环境部署 (Pages + Functions + D1)

本项目采用 **Cloudflare Pages 全栈边缘架构**，前端由全球边缘 CDN 极速分发，后端 API 由 `/functions` 边缘无服务器函数全自动接管。

### 步骤 1：代码推送至 GitHub 仓库
1. 在 GitHub 创建一个新仓库，命名为 `airam`。
2. 将本项目所有代码推送或上传至该仓库主分支（`main`）。

---

### 步骤 2：在 Cloudflare 控制台创建 D1 数据库
1. 登录 [Cloudflare 控制台 (dash.cloudflare.com)](https://dash.cloudflare.com/)。
2. 在左侧导航栏点击 **Storage & Databases** -> 选择 **D1 SQL Database**。
3. 点击右上角 **Create database** 按钮：
   - **Database name**：输入 `airam-db`
   - 点击 **Create** 保存。
4. **一键执行建表与初始架构**：
   - 在 D1 列表中点击进入 `airam-db`。
   - 切换到 **Console**（控制台）选项卡。
   - 打开本项目根目录下的 `migrations/0001_init.sql`，复制全部 SQL 文本。
   - 粘贴到控制台输入框中，点击右下角 **Execute**（执行）。
   - 页面下方将显示成功创建的全部数据表与索引。

---

### 步骤 3：在 Cloudflare Pages 连接 Git 一键构建
1. 在 Cloudflare 控制台左侧点击 **Workers & Pages** -> 点击 **Create application**。
2. 切换到 **Pages** 选项卡 -> 点击 **Connect to Git**（连接到 Git）。
3. 授权并选中您刚创建的 `airam` 仓库。
4. 在 **Set up builds and deployments** 设置构建：
   - **Project name**：`airam`（系统将自动分配 `airam.pages.dev`）
   - **Production branch**：`main`
   - **Framework preset**：选择 **Vite**
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`

---

### 步骤 4：配置 Cloudflare 环境变量与 D1 绑定

#### 4.1 配置环境变量 (Environment variables)
在当前构建配置页展开 **Environment variables (advanced)**，点击 **Add variable** 添加：

| 变量名 | 必填 | 推荐值 | 说明 |
| :--- | :---: | :--- | :--- |
| `ENVIRONMENT` | 是 | `production` | 标识生产环境（系统将自动清空所有演示数据） |
| `GITHUB_CLIENT_ID` | 是 | 你的 GitHub OAuth App Client ID | 第一步获取的 Client ID |
| `GITHUB_CLIENT_SECRET` | 是 | 你的 GitHub OAuth App Client Secret | 第一步获取的 Client Secret（点击右侧小锁加密保存） |
| `GITHUB_TOKEN` | 否 | 你的 GITHUB_TOKEN (PAT) | 第一步获取的 Personal Access Token |

点击最下方 **Save and Deploy**（保存并部署）。几秒钟内全球构建完成！

#### 4.2 绑定 D1 数据库到 Pages
1. 部署完成后，在 Pages 项目详情页点击顶部 **Settings**（设置）。
2. 在左侧子菜单点击 **Functions**（函数）。
3. 向下滚动找到 **D1 database bindings**（D1 数据库绑定），点击 **Add binding**：
   - **Variable name**：严格填入 `DB`（必须全部大写）
   - **D1 database**：下拉选择刚刚创建的 `airam-db`
4. 点击 **Save** 保存。
5. 点击顶部的 **Deployments** 选项卡，在最新记录右侧点击 `...` -> 选择 **Retry deployment**（重试部署），使数据库绑定与环境变量正式生效！

---

## 三、本地开发环境运行 (Local Dev)

本地开发环境内置轻量 Node/Express 服务与 Vite 实时代理：

1. **安装依赖**：
   ```bash
   npm install
   ```

2. **配置本地环境变量**：
   复制项目根目录下的 `.env.example` 为 `.env`：
   ```bash
   cp .env.example .env
   ```
   填入您的本地凭据：
   ```ini
   PORT=3000
   NODE_ENV=development
   GITHUB_CLIENT_ID=你的开发用ClientId
   GITHUB_CLIENT_SECRET=你的开发用ClientSecret
   GITHUB_TOKEN=你的PAT令牌
   ```

3. **启动开发服务**：
   ```bash
   npm run dev
   ```
   浏览器访问 `http://localhost:3000` 即可开始开发调试。

---

## 四、生产环境「待配置凭据 (环境变量)」排查与即时解决

很多用户在 Cloudflare Pages 配置了环境变量后，依然看到界面提示 `待配置凭据 (环境变量)`，原因及解决方案如下：

### 核心原因：
1. **环境变量未触发重新部署**：在 Cloudflare Pages 后台修改环境变量后，已发布的静态产物与 Functions 缓存不会自动重新加载，必须到 **Deployments** 页面点击 `...` -> **Retry deployment**。
2. **前后端接口解耦**：旧版本若缺少 `/functions` 目录，请求会被 Pages 静态 SPA 兜底拦截导致返回 HTML。本项目已内置原生 `/functions` 边缘函数！

### ⚡ 独家增强：图形界面即时生效方案 (无需等待重部署)
本项目增强了**管理员系统设置界面**：
1. 以管理员身份进入后台（通过 Token 登录或首位绑定）。
2. 在后台导航栏点击「**系统设置**」。
3. 在第一栏「**在线凭据配置表单**」中直接输入您的 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET` 与 `GITHUB_TOKEN`，点击「**保存配置**」。
4. 凭据将**立即在前端与边缘中枢同步生效**，状态瞬间转为绿色「凭据已就绪」，彻底告别「待配置凭据」提示！

---

## 五、系统上线后首位管理员认领与 PWA 原生应用安装

1. **首位管理员加冕**：
   - 首次部署上线后，系统处于开放待认领状态；
   - 点击右上角或前台「进入后台管理」按钮；
   - **第一个通过 GitHub OAuth 授权或 PAT Token 登录的用户，将永久绑定为系统最高管理员**；
   - 后续其他用户登录将自动识别为访客模式。

2. **安装为独立 App (PWA 功能修复说明)**：
   - 本项目已注入完整的 Web App Manifest (`/manifest.webmanifest`) 与 Service Worker 自动更新引擎；
   - **在独立浏览器窗口**：点击导航栏右侧的「**安装 App**」按钮，即可一键唤起系统原生安装对话框；
   - **在嵌入式预览窗口 (Iframe)**：因浏览器安全保护政策禁止 iframe 弹窗，点击按钮将为您提供「在新标签页打开并安装」的一键直达按钮，轻松安装为 Mac / Windows / iOS / Android 桌面原生应用！
