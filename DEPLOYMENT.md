# airam 部署与上线指南 (Cloudflare 全栈)

本文档提供将 **airam**（边缘神经研发记忆中枢）部署到 Cloudflare 全球边缘平台的完整指导，**提供 100% 纯控制台图形界面部署（免命令行）** 与 **Wrangler 命令行部署** 两种方案。

---

## 方案一：纯控制台图形界面部署 (★ 推荐，100% 免命令行，浏览器全流程点击完成 ★)

全程只需在 **Cloudflare 控制台** 与 **GitHub 网页端** 操作，无需在本地安装任何命令行工具。

### 第一步：将项目代码托管至 GitHub
1. 打开 [GitHub](https://github.com/) 并登录，点击右上角 **「+」-> New repository**。
2. 仓库名输入 `airam`，选择 **Public** 或 **Private** 均可，点击 **Create repository**。
3. 将本项目代码推送到该仓库（或在网页端直接上传）。

---

### 第二步：在 Cloudflare 图形界面创建 D1 数据库并建表
1. 登录 [Cloudflare 控制台 (dash.cloudflare.com)](https://dash.cloudflare.com/)。
2. 在左侧菜单栏点击 **Storage & Databases**（存储和数据库）-> **D1 SQL Database**。
3. 点击右上角蓝色按钮 **Create database**（创建数据库）：
   - **Database name**：输入 `airam-db`
   - 点击 **Create** 保存。
4. **在网页控制台一键执行建表 SQL**：
   - 在 D1 列表中点击刚刚创建的 `airam-db`。
   - 切换到 **Console**（控制台）选项卡。
   - 打开本项目根目录下的 `migrations/0001_init.sql`，复制全部 SQL 文本。
   - 粘贴到网页的输入框中，点击右下角 **Execute**（执行）按钮。
   - 页面下方将立即显示成功创建的全部数据表：`knowledge`、`projects`、`github_repositories`、`tags` 以及 `knowledge_fts` 全文索引虚表！

---

### 第三步：在 Cloudflare 控制台连接 Git 部署 Pages 应用
1. 在 Cloudflare 控制台左侧菜单点击 **Workers & Pages** -> 点击 **Create application** 按钮。
2. 切换到 **Pages** 选项卡 -> 点击 **Connect to Git**（连接到 Git）。
3. 授权并选中你在第一步创建的 `airam` GitHub 仓库。
4. 在 **Set up builds and deployments**（设置构建和部署）界面：
   - **Project name**: 填入 `airam`
   - **Production branch**: 保持 `main`
   - **Framework preset**: 下拉菜单选择 **Vite**
   - **Build command**: 保持 `npm run build`
   - **Build output directory**: 保持 `dist`
5. **在当前页面直接配置环境变量**：
   - 点击展开 **Environment variables (advanced)**，点击 **Add variable**：
     - 变量名：`GITHUB_TOKEN`，值：填入你的 GitHub 细粒度 Token（仅需 Contents/Metadata 读权限），点击右侧锁图标（Encrypt 加密保存）
     - 变量名：`GITHUB_WEBHOOK_SECRET`，值：填入自定义的签名密钥（如 `my_secret_2026`），点击锁图标加密保存
6. 点击最下方 **Save and Deploy**（保存并部署）按钮！
   - Cloudflare 云端将在几秒钟内自动构建，完成后页面会显示绿色的 **Success**，并生成你的访问网址：
     `https://airam.pages.dev`（前台展示空间已立即可用！）。

---

### 第四步：在控制台图形界面绑定 D1 数据库到 Pages
1. 在 Pages 项目详情页中，点击顶部选项卡 **Settings**（设置）。
2. 在左侧子菜单点击 **Functions**（函数）。
3. 向下滚动找到 **D1 database bindings**（D1 数据库绑定），点击 **Add binding**：
   - **Variable name**：严格填入 `DB`（大写）
   - **D1 database**：下拉框选中第二步创建的 `airam-db`
4. 点击 **Save** 保存。
5. 点击顶部的 **Deployments**（部署）选项卡，在最新的一次部署记录右侧点击三个点 `...` -> 选择 **Retry deployment**（重试部署），使数据库绑定立即生效。

---

### 第五步（可选）：配置 Queue 队列与 R2 存储桶（纯图形界面）
- **Queue 异步削峰队列（推荐）**：
  - 点击左侧菜单 **Queues** -> **Create queue** -> 输入 `github-sync-queue` -> 点击 **Create**。
  - 在 Pages 项目的 **Settings** -> **Functions** -> **Queue Producers** 绑定 `GITHUB_SYNC_QUEUE`。
- **R2 对象存储（★ 可选项 Optional ★）**：
  - 若仅存 Markdown 笔记与代码元数据，**无需创建 R2**（纯 D1 极简形态运行）。
  - 若需存放大型架构截图：点击左侧 **R2** -> **Create bucket** -> 输入 `airam-assets` -> 点击 **Create**。

---

### 第六步：在 GitHub 网页界面配置 Webhook 实现实时代码同步
1. 打开你的 GitHub 个人项目仓库页面 -> 点击顶部 **Settings** -> 左侧菜单选择 **Webhooks**。
2. 点击右上角 **Add webhook**：
   - **Payload URL**：填写第三步 Pages 项目生成的网址加上 `/api/github/webhook`，例如：
     `https://airam.pages.dev/api/github/webhook`
   - **Content type**：下拉选择 `application/json`
   - **Secret**：填入第三步设置的 `GITHUB_WEBHOOK_SECRET`
   - **Trigger events**：选择 **Let me select individual events**，勾选：
     - ☑️ **Pushes** (代码提交)
     - ☑️ **Releases** (版本发布)
3. 点击 **Add webhook** 保存！以后每次推送代码，GitHub 会自动推送更新通知到 Cloudflare，系统自动执行 HMAC 验签并增量同步 README 到知识库。

---

### 第七步：在图形界面配置 Zero Trust 单用户访问保护 (Cloudflare Access 详解)
airam 已内置身份鉴权守卫。若希望在网络边缘阻断未经授权的访客接触后台：
1. 在 Cloudflare 控制台左侧点击 **Zero Trust** -> **Access** -> **Applications**。
2. 点击 **Add an application** -> 选择 **Self-hosted**（自托管应用）：
   - **Application name**：输入 `airam Edge Protection`
   - **Session Duration**：选择 `24 hours`（或 `7 days`）
   - **Application domain（域名配置）**：
     - 若使用自定义域名：Subdomain 填 `airam`，Domain 下拉选你的域名（如 `example.com`），Path 留空
     - 若使用 Pages 原生域名：在域名输入框填入完整分配的 `airam.pages.dev`
3. 点击 **Next** 配置策略：
   - **Policy name**：输入 `Allow Owner Only`
   - **Action**：选择 `Allow`
   - **Configure rules**：
     - **Include** -> **Selector** 选择 `Emails`
     - **Value** 填入你的唯一管理员邮箱：`trpai_bot@outlook.com`
4. **★ 关键步骤：放行 GitHub Webhook 自动化接口 (Bypass 策略)**：
   - 在已创建应用的 **Policies** 列表中，点击 **Add a policy**：
     - **Policy name**：`Bypass Webhook`
     - **Action**：选择 `Bypass`（跳过认证）
     - **Configure rules**：Include -> Selector 选择 `Everyone`
     - **Additional settings**：添加 Path 规则，匹配 `/api/github/webhook`
5. 保存生效！全部流程均在网页点击完成，零命令行负担。任何人访问前后台需邮箱验证码，而 GitHub Webhook 请求直通验证。

---

## 方案二：Wrangler 命令行部署 (适合偏好终端的开发者)

若开发者喜欢本地终端命令行，可使用标准 Wrangler：
```bash
# 1. 安装与登录
npm install -g wrangler && wrangler login

# 2. 创建数据库并初始化
wrangler d1 create airam-db
wrangler d1 execute airam-db --remote --file=./migrations/0001_init.sql

# 3. 设置密钥
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_WEBHOOK_SECRET

# 4. 部署
wrangler deploy
npm run build && wrangler pages deploy dist --project-name=airam
```
