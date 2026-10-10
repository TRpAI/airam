# AIram - 边缘神经知识中枢 (Edge Neural Dev Knowledge Hub)

> 基于 **Cloudflare Pages + Workers + D1 (SQLite) + GitHub 神经双向同步** 的个人研发知识中枢与架构控制台。
> 零运维负担、全球边缘毫秒级响应、FTS5 全文检索引擎、Zero Trust 军工级单用户保护。

---

## 目录

- [一、核心架构与特性](#一核心架构与特性)
- [二、100% 纯控制台图形界面部署指南（推荐，免命令行）](#二100-纯控制台图形界面部署指南推荐免命令行)
  - [第一步：获取 GitHub 细粒度 Token (PAT) 详解](#第一步获取-github-细粒度-token-pat-详解)
  - [第二步：在 GitHub 创建 airam 仓库并推送代码](#第二步在-github-创建-airam-仓库并推送代码)
  - [第三步：在 Cloudflare 创建 D1 数据库并执行迁移](#第三步在-cloudflare-创建-d1-数据库并执行迁移)
  - [第四步：在 Cloudflare Pages 连接 Git 部署全栈应用](#第四步在-cloudflare-pages-连接-git-部署全栈应用)
  - [第五步：在控制台绑定 D1 数据库并使生效](#第五步在控制台绑定-d1-数据库并使生效)
  - [第六步：配置 GitHub Webhook 自动化增量同步](#第六步配置-github-webhook-自动化增量同步)
  - [第七步：配置 Cloudflare Zero Trust 单用户保护 (Access 详解)](#第七步配置-cloudflare-zero-trust-单用户保护-access-详解)
- [三、方案二：Wrangler CLI 本地极客部署](#三方案二wrangler-cli-本地极客部署)
- [四、常见问题与排查指南 (FAQ)](#四常见问题与排查指南-faq)

---

## 一、核心架构与特性

- **前端层 (Frontend)**：React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons，支持 PWA 离线运行。
- **边缘算力层 (Compute)**：Cloudflare Workers / Pages Functions，全网 300+ 边缘节点无冷启动并发。
- **持久化层 (Storage)**：
  - **Cloudflare D1**：分布式边缘 SQL 数据库，支持原生 SQLite FTS5 全文索引。
  - **可选 Cloudflare R2**：海量架构图元及备份持久化。
- **自动同步层 (Sync)**：GitHub Webhook + HMAC-SHA256 签名验签，自动解析仓库代码、Releases 与 Markdown 文档。
- **安全防护层 (Security)**：Cloudflare Zero Trust Access，指定所有者邮箱（`osahermes@gmail.com`）一次性动态验证码 (OTP) 阻断任何未授权访问。

---

## 二、100% 纯控制台图形界面部署指南（推荐，免命令行）

全程只需在 **Cloudflare 控制台** 与 **GitHub 网页端** 操作，无需在本地安装 Node.js、Wrangler 或任何命令行工具。

---

### 第一步：获取 GitHub 细粒度 Token (PAT) 详解

airam 需要读取你的个人代码仓库文档、分支信息及 Release 发布记录。请按照以下步骤生成细粒度安全凭证：

1. 打开 [GitHub](https://github.com/) 并登录，点击右上角个人头像 -> 选择 **Settings**（设置）。
2. 在左侧侧边栏中滑动到底部，点击 **Developer settings**（开发者设置）。
3. 在左侧展开 **Personal access tokens** -> 点击 **Fine-grained tokens**。
4. 点击页面右上角的蓝色按钮 **Generate new token**。
5. 填写 Token 参数：
   - **Token name**：输入 `airam-sync-token`
   - **Expiration**（过期时间）：推荐选择 `90 days`、`Custom` 或 `1 year`
   - **Repository access**（仓库授权范围）：
     - 推荐选择 **Only select repositories**，在下拉框中选择你需要同步的仓库（如 `airam` 或你的主要项目仓库）；如果希望全局同步，可按需选择 *All repositories*。
   - **Permissions (权限详情)**：点击展开 **Repository permissions**：
     - 找到 **Contents**：下拉框选择 **Access: Read-only**（只读权限，用于读取 README 和代码结构）。
     - 此时 **Metadata** 权限会自动联动设为 **Read-only**。
6. 滑动到页面最底部，点击绿色按钮 **Generate token**。
7. **重点提醒**：页面将显示一串以 `github_pat_` 开头的密匙，**立即点击右侧按钮复制并妥善保存**（刷新后将不再显示）。

---

### 第二步：在 GitHub 创建 airam 仓库并推送代码

1. 在 GitHub 页面点击右上角 **「+」-> New repository**。
2. **Repository name** 填写 `airam`。
3. 选择 **Public** 或 **Private**（私有/公开均可，推荐 Private）。
4. 点击 **Create repository**。
5. 将本项目全部源代码推送到该仓库的 `main` 分支。

---

### 第三步：在 Cloudflare 创建 D1 数据库并执行迁移

1. 登录 [Cloudflare 控制台 (dash.cloudflare.com)](https://dash.cloudflare.com/)。
2. 在左侧导航菜单点击 **Storage & Databases**（存储和数据库）-> **D1 SQL Database**。
3. 点击页面右上角蓝色按钮 **Create database**（创建数据库）：
   - **Database name**：填入 `airam-db`
   - 点击 **Create** 保存。
4. **一键执行建表与全文索引初始化**：
   - 在 D1 列表中点击刚刚创建的 `airam-db` 进入详情页。
   - 切换到顶部的 **Console**（控制台）选项卡。
   - 打开本项目中的 `migrations/0001_init.sql`（或者在 airam 前台界面点击「一键复制 SQL」），复制全部 SQL 脚本。
   - 粘贴到 Cloudflare D1 网页 Console 的输入框中。
   - 点击右下角 **Execute**（执行）按钮。
   - 下方将显示建表成功日志，成功创建：`knowledge`、`projects`、`github_repositories`、`tags` 以及 `knowledge_fts` 全文索引虚表与自动同步触发器。

---

### 第四步：在 Cloudflare Pages 连接 Git 部署全栈应用

1. 在 Cloudflare 控制台左侧菜单点击 **Workers & Pages** -> 点击 **Create application** 按钮。
2. 切换到 **Pages** 选项卡 -> 点击 **Connect to Git**（连接到 Git）。
3. 授权 GitHub 并选中你在第二步创建的 `airam` 仓库，点击 **Begin setup**。
4. **配置构建参数 (Build configuration)**：
   - **Project name**: 保持 `airam`
   - **Production branch**: 保持 `main`
   - **Framework preset**: 下拉菜单选择 **Vite**
   - **Build command**: 保持 `npm run build`
   - **Build output directory**: 保持 `dist`
   - **Root directory**: 留空（默认根目录）
5. **在当前页面配置环境变量**：
   - 点击展开 **Environment variables (advanced)**，点击 **Add variable**：
     - **变量 1**：
       - Variable name: `GITHUB_TOKEN`
       - Value: 填入第一步获取的 `github_pat_xxxx`
       - 点击右侧锁图标（**Encrypt** 加密保存）
     - **变量 2**：
       - Variable name: `GITHUB_WEBHOOK_SECRET`
       - Value: 填入自定义的随机通信密钥（例如 `airam_secret_2026`）
       - 点击右侧锁图标（**Encrypt** 加密保存）
6. 点击最下方 **Save and Deploy**（保存并部署）按钮。
7. 云端将自动拉取代码并构建，约 15~30 秒后页面出现绿色勾选 **Success**，并生成初始分配的专属域名：
   `https://airam.pages.dev`。

---

### 第五步：在控制台绑定 D1 数据库并使生效

默认 Pages Functions 尚未挂载数据库连接，需要执行一次控制台绑定：

1. 在 Pages 项目详情页中，点击顶部选项卡 **Settings**（设置）。
2. 在左侧子菜单点击 **Functions**（函数）。
3. 向下滚动找到 **D1 database bindings**（D1 数据库绑定），点击 **Add binding**：
   - **Variable name**：严格填入 `DB`（必须全大写，与系统底层代码 `env.DB` 完全一致）
   - **D1 database**：下拉框选中第三步创建的 `airam-db`
4. 点击 **Save** 保存。
5. **非常关键（激活绑定）**：
   - 切换到 Pages 项目顶部的 **Deployments**（部署）选项卡。
   - 在最新的一次部署记录（带有 Active 标签）右侧点击三个点 `...` -> 选择 **Retry deployment**（重试部署）。
   - 构建重跑完成后，D1 数据库即正式接入生产环境！

---

### 第六步：配置 GitHub Webhook 自动化增量同步

配置后，每次向 GitHub 仓库提交代码或发布 Release 时，GitHub 都会自动通知 airam，增量提取并录入项目索引。

1. 打开你的 GitHub 个人项目仓库页面 -> 点击顶部 **Settings** -> 左侧菜单选择 **Webhooks**。
2. 点击右上角 **Add webhook**：
   - **Payload URL**：填写第四步生成的 Pages 域名加上 `/api/github/webhook`，例如：
     ```text
     https://airam.pages.dev/api/github/webhook
     ```
   - **Content type**：必须下拉选择 `application/json`（请勿保持默认的 x-www-form-urlencoded）。
   - **Secret**：填入第四步环境变量中设置的 `GITHUB_WEBHOOK_SECRET`。
   - **Which events would you like to trigger this webhook?**：
     - 选择 **Let me select individual events**（自定义触发事件）：
     - ☑️ 勾选 **Pushes**（每次提交代码同步 README 与变更）
     - ☑️ 勾选 **Releases**（版本发布自动录入知识库）
3. 保持 **Active** 勾选，点击绿色 **Add webhook** 保存。
4. GitHub 会自动发送一个 Ping 测试请求，若列表图标显示绿色对勾（HTTP 200），说明双向通信已经就绪。

---

### 第七步：配置 Cloudflare Zero Trust 单用户保护 (Access 详解)

为了保障私人研发笔记、架构图与管理面板的绝对私密性，推荐配置 Cloudflare Access 零信任守卫：

#### 1. 进入 Zero Trust 控制台
- 在 Cloudflare 控制台左侧菜单点击 **Zero Trust**。
- 如果首次使用，按提示输入组织域名（如 `airam-org`）并选择免费的 **Free Plan** 即可。

#### 2. 新建自托管应用 (Self-hosted)
- 在 Zero Trust 控制台左侧依次点击 **Access** -> **Applications**。
- 点击右上角 **Add an application**。
- 在应用类型中点击 **Self-hosted**（自托管应用）卡片。

#### 3. 详细参数配置说明（针对用户常遇困惑）
- **Application name**：输入 `airam Edge Protection`。
- **Session Duration**：选择 `24 hours`（或 `7 days`，在此期间同一浏览器免重复登录）。
- **Application domain（域名配置）**：
  > **解答：选择 DNS 还是 Workers？**
  >
  > - **如果你使用的是自定义域名（推荐）**（例如你在 Cloudflare 有域名 `example.com`，想通过 `airam.example.com` 访问）：
  >   - **Subdomain** 输入：`airam`
  >   - **Domain** 下拉选择：`example.com`
  >   - **Path**：留空
  > - **如果你直接使用 Pages 原生免费域名**（`airam.pages.dev`）：
  >   - 直接在域名输入框填入你的完整子域名 `airam.pages.dev` 即可。

#### 4. 配置严格的单用户放行策略 (Policy)
- 点击右上角 **Next** 进入规则配置页：
  - **Policy name**：输入 `Allow Owner Only`
  - **Action**：选择 `Allow`（允许通行）
  - **Configure rules**（配置放行条件）：
    - 在 **Include** 下拉框中：
    - **Selector** 选择：`Emails`
    - **Value** 填入你的唯一管理员邮箱：`osahermes@gmail.com`
- 点击右上角 **Next** -> 点击 **Add application** 保存。

#### 5. ★ 极其重要：放行 Webhook 自动化路由 (Bypass 策略) ★
由于 GitHub 服务器在触发 Webhook 时无法接收邮箱验证码，必须在 Zero Trust 中为 Webhook 路由单独设置放行，否则 GitHub 推送将被 Zero Trust 拦截：

1. 在刚刚建好的 `airam Edge Protection` 应用设置中，点击 **Policies** 标签。
2. 点击 **Add a policy** 添加第二条规则：
   - **Policy name**：输入 `Bypass GitHub Webhook`
   - **Action**：选择 **Bypass**（直接跳过身份验证）
   - **Configure rules**：
     - **Include** -> **Selector** 选择 `Everyone`
   - **Additional settings**（高级匹配过滤）：
     - 勾选或添加 **Path** 规则：
     - **Operator** 选择 `is` 或 `starts with`
     - **Value** 输入：`/api/github/webhook`
3. 保存该策略，并确保该策略在列表中生效。
4. **效果**：任何人访问 `https://airam.pages.dev` 前台和后台都需要向 `osahermes@gmail.com` 接收 6 位邮箱验证码；而来自 GitHub 服务器的 Webhook 能够顺畅直通边缘，由系统的 HMAC-SHA256 算法安全校验！

---

## 三、方案二：Wrangler CLI 本地极客部署

如果你习惯使用本地终端与 CLI 工具：

```bash
# 1. 克隆并安装依赖
git clone https://github.com/TRpAI/devhub.git airam
cd airam
npm install

# 2. 登录 Cloudflare
npx wrangler login

# 3. 创建 D1 数据库并执行迁移
npx wrangler d1 create airam-db
npx wrangler d1 execute airam-db --remote --file=./migrations/0001_init.sql

# 4. 配置安全凭证 Secrets
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_WEBHOOK_SECRET

# 5. 构建与部署 Pages
npm run build
npx wrangler pages deploy dist --project-name=airam
```

---

## 四、常见问题与排查指南 (FAQ)

### Q1: Pages 构建时报错 `Configuration file for Pages projects does not support "triggers" / "queues.consumers"`？
- **原因**：早期全功能 Workers 配置文件包含了后台定时触发器与消费者队列，而 Cloudflare Pages 原生构建器对这部分语法的校验较严格。
- **解决办法**：本项目已精简 `wrangler.toml` 为标准的 Pages 全栈结构（`pages_build_output_dir = "dist"`），直接推送最新代码即可平滑通过构建。

### Q2: 访问页面出现 `D1_ERROR: no such table: knowledge`？
- **原因**：D1 数据库尚未执行迁移 SQL，或 Pages Functions 未绑定 D1。
- **解决办法**：
  1. 确认在 D1 控制台的 **Console** 成功执行过 `migrations/0001_init.sql`。
  2. 确认在 Pages 项目的 **Settings -> Functions -> D1 database bindings** 中绑定了名称为 `DB`（大写）的 `airam-db`。
  3. 确认在绑定后点击了 **Retry deployment**（重试部署）。

### Q3: GitHub Webhook 提示 `401 Unauthorized: Invalid signature`？
- **原因**：GitHub 填写的 Secret 与 Cloudflare 环境变量 `GITHUB_WEBHOOK_SECRET` 不一致。
- **解决办法**：检查两端配置的 Secret 字符串是否完全一致（注意不要有多余空格）。

### Q4: 收到 Cloudflare Zero Trust 拦截页面怎么办？
- 输入绑定的授权邮箱 `osahermes@gmail.com`，点击获取验证码，前往 Gmail 邮箱查收 6 位数字验证码填入即可顺利进入。

### Q5: 登录用的邮箱必须是 GitHub 的账号邮箱吗？
- **完全不需要！两者没有任何绑定关系，任何邮箱都可以**。
- **原因解析**：
  - **Zero Trust (Cloudflare Access)** 的身份验证是在 Cloudflare 边缘独立完成的（通过向你指定的邮箱发送 One-Time PIN 验证码）。
  - **GitHub Token (PAT)** 是程序用来在后台读取/写入 GitHub 仓库代码与文件的机器通信凭证。
  - 因此你在 Zero Trust 策略里填写的邮箱（如 `osahermes@gmail.com`、Outlook 或企业邮箱）**纯粹是用于接收登录 PIN 码**，与你的 GitHub 账号邮箱完全解耦。

---

## License

MIT License © 2026 airam

