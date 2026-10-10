# AIram - 边缘神经研发知识中枢 (Edge Neural Dev Knowledge Hub)

> 基于 **React 19 + TypeScript + Express + Vite + Tailwind CSS + GitHub 神经双向同步** 的个人研发知识中枢与开源展示平台。  
> 融合 **GitHub OAuth 2.0 身份鉴权**、**首位登入者管理员认领机制**、**访客提交仓库审核闭环** 以及 **全站安全流控保护 (Rate Limiting)**。

---

## 目录

- [一、改造后系统核心特性](#一改造后系统核心特性)
- [二、部署前准备：创建 GitHub OAuth App 详解](#二部署前准备创建-github-oauth-app-详解)
- [三、环境变量配置清单](#三环境变量配置清单)
- [四、生产环境部署指南（全场景覆盖）](#四生产环境部署指南全场景覆盖)
  - [方案 A：Docker / 容器云极简部署 (推荐：Cloud Run, Railway, Zeabur, Render)](#方案-adocker--容器云极简部署-推荐cloud-run-railway-zeabur-render)
  - [方案 B：Linux VPS / 云服务器独立部署 (Node.js + PM2)](#方案-blinux-vps--云服务器独立部署-nodejs--pm2)
  - [方案 C：Cloudflare Pages + D1 边缘无服务器部署](#方案-ccloudflare-pages--d1-边缘无服务器部署)
  - [方案 D：本地开发与快速试运行](#方案-d本地开发与快速试运行)
- [五、系统上线后初始化与操作指引](#五系统上线后初始化与操作指引)
  - [1. 首位管理员开箱认领 (First-User Claim)](#1-首位管理员开箱认领-first-user-claim)
  - [2. 访客提交开源仓库与流控体验](#2-访客提交开源仓库与流控体验)
  - [3. 管理员审核准入与前台联动展示](#3-管理员审核准入与前台联动展示)
  - [4. 管理员席位重置机制 (Reset Admin)](#4-管理员席位重置机制-reset-admin)
- [六、安全流控与防御策略 (Rate Limiting)](#六安全流控与防御策略-rate-limiting)
- [七、常见问题排查 (FAQ)](#七常见问题排查-faq)

---

## 一、改造后系统核心特性

1. **👑 首位登入者自动锁定为管理员（First-User Claim）**：
   - 任何人部署上线后，无需在数据库或代码中硬编码管理员账号！
   - 系统首次启动时管理员席位处于开放状态，**第一个通过 GitHub（OAuth 弹窗授权、PAT Token 或演示登入）成功登入的用户将自动加冕为系统最高管理员 (`role: 'admin'`, `isAdmin: true`)**；
   - 绑定后永久锁定，享有中枢完全管理、知识发布、数据备份与仓库审核批准权限；后续其他用户登入自动归为访客 (`role: 'visitor'`)。
2. **🚀 访客提交开源仓库与管理员审核准入流程**：
   - 访客可提交自己的 GitHub 开源仓库地址（支持完整 URL 如 `https://github.com/facebook/react` 或简写 `facebook/react`）；
   - 系统通过 GitHub API 实时检索并核验仓库星标数、项目描述、主要语言与主页信息；
   - 提交初始进入待审核队列，经管理员在后台「**仓库审核**」专栏一键批准后，同步在前台「**社区推荐**」精选板块永久展示并署名访客。
3. **⚡ 全站高频接口安全流控保护（Rate Limiting）**：
   - **GitHub 登入接口流控**：滑动窗口每分钟限 5 次登入尝试，防止密码爆破与频繁刷新，触发时提供动态秒级倒计时；
   - **访客仓库提交流控**：单 IP / 访客每 10 分钟限提交 3 个仓库，且两次提交间隔至少 20 秒；同一仓库禁止重复提交。
4. **🎨 纯净前后台分离架构**：
   - 前台展示空间：面向公众开放浏览精选项目、知识手记与社区推荐仓库；
   - 后台管理中枢：纯净极简，导航栏紧随研发知识中枢核心卡片下方，支持移动端横滑与常驻固定页脚。

---

## 二、部署前准备：创建 GitHub OAuth App 详解

为了启用 GitHub 弹窗快捷登录与访客鉴权，需在 GitHub 创建一个 OAuth 应用程序：

1. 打开并登录 [GitHub](https://github.com/)，点击右上角头像 -> 选择 **Settings**（设置）。
2. 在左侧菜单滑动到底部，点击 **Developer settings**（开发者设置）。
3. 在左侧选择 **OAuth Apps** -> 点击右上角绿色按钮 **New OAuth App**（或 **Register a new application**）。
4. 按要求填写以下参数：
   - **Application name**：填写 `AIram 研发知识中枢`（或自定义名称）。
   - **Homepage URL**：填写您的应用公网域名，例如：
     ```text
     https://your-domain.com
     ```
     *(本地测试可填 `http://localhost:3000`)*
   - **Application description**：选填，如 `AIram Edge Knowledge Hub`。
   - **Authorization callback URL（极其重要）**：填入您的域名加上 `/auth/callback`，例如：
     ```text
     https://your-domain.com/auth/callback
     ```
     *(如果在 AI Studio 预览环境，使用服务分配的完整 URL 加 `/auth/callback`)*
5. 点击绿色按钮 **Register application** 完成创建。
6. 创建成功后：
   - 复制页面展示的 **Client ID**；
   - 点击 **Generate a new client secret** 生成密钥，并立即**复制保存 Client Secret**（注意：离开页面后密钥将不再完整显示）。

---

## 三、环境变量配置清单

在您的服务器、容器或部署平台中配置以下环境变量：

| 环境变量名 | 必填 | 默认值 | 说明与示例 |
| :--- | :---: | :---: | :--- |
| `PORT` | 否 | `3000` | 服务端监听的 HTTP 端口 |
| `NODE_ENV` | 否 | `production` | 生产环境标识（加载编译好的静态资源与前端页面） |
| `APP_URL` | 是 | - | 应用的公网访问完整 URL，例如 `https://airam.yourdomain.com`，用于生成精准 OAuth 重定向 |
| `GITHUB_CLIENT_ID` | 是 | - | 第二步获取的 GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | 是 | - | 第二步获取的 GitHub OAuth App Client Secret |
| `GITHUB_TOKEN` | 否 | - | 可选的 GitHub 细粒度 Token (PAT)，用于增加调用 GitHub API 的速率上限 |

> **数据持久化说明**：  
> 系统管理员身份与审核数据保存在根目录下的 `.data/` 文件夹中（`.data/admin_system.json` 与 `.data/submissions.json`）。在容器或云平台部署时，**请将 `.data` 目录挂载为持久化卷 (Persistent Volume)**，以确保容器重启或重新部署时管理员身份与提交数据不丢失。

---

## 四、生产环境部署指南（全场景覆盖）

### 方案 A：Docker / 容器云极简部署 (推荐：Cloud Run, Railway, Zeabur, Render)

#### 1. 编写 Dockerfile（项目已支持标准 Node.js 镜像）

在项目根目录下创建 `Dockerfile`：

```dockerfile
# 采用轻量 Node.js LTS 镜像
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 运行镜像
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.data ./.data

# 暴露端口
EXPOSE 3000

# 启动全栈应用
CMD ["npx", "tsx", "server.ts"]
```

#### 2. 本地构建并运行 Docker 容器

```bash
# 1. 构建镜像
docker build -t airam-hub .

# 2. 启动容器（挂载 .data 目录持久化数据）
docker run -d \
  --name airam \
  -p 3000:3000 \
  -v $(pwd)/.data:/app/.data \
  -e APP_URL="https://your-domain.com" \
  -e GITHUB_CLIENT_ID="your_github_client_id" \
  -e GITHUB_CLIENT_SECRET="your_github_client_secret" \
  airam-hub
```

#### 3. 部署到平台（Railway / Zeabur / Render / Cloud Run）
1. 将代码推送到 GitHub 私有或公开仓库；
2. 在对应云平台（如 Railway 或 Render）新建项目，连接 GitHub 仓库；
3. 构建命令填入：`npm run build`；启动命令填入：`npm start`；
4. 在平台的 **Environment Variables** 设置页填入 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`APP_URL`；
5. 在平台挂载卷设置中将 `/app/.data` 挂载为持久卷；
6. 部署完成后即可通过平台分配的域名或自定义域名访问！

---

### 方案 B：Linux VPS / 云服务器独立部署 (Node.js + PM2)

#### 1. 服务器环境准备
确保服务器已安装 `Node.js >= 18` 与 `git`：
```bash
node -v
npm -v
npm install -g pm2
```

#### 2. 拉取代码与安装依赖
```bash
git clone https://github.com/your-username/airam.git /var/www/airam
cd /var/www/airam
npm install
```

#### 3. 配置生产环境变量
在 `/var/www/airam` 目录下新建 `.env` 文件：
```bash
PORT=3000
NODE_ENV=production
APP_URL=https://airam.yourdomain.com
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

#### 4. 构建与使用 PM2 守护进程启动
```bash
# 构建前端静态产物
npm run build

# 启动 PM2 守护进程
pm2 start "npx tsx server.ts" --name "airam-hub"

# 设置开机自启
pm2 save
pm2 startup
```

#### 5. Nginx 反向代理配置（支持 HTTPS）
在 `/etc/nginx/conf.d/airam.conf` 中配置反向代理：
```nginx
server {
    listen 80;
    server_name airam.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name airam.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/airam.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/airam.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
执行 `nginx -t && systemctl reload nginx` 即可上线！

---

### 方案 C：Cloudflare Pages + D1 边缘无服务器部署

若希望完全托管在 Cloudflare 边缘端：

1. **创建 D1 数据库**：
   在 Cloudflare 控制台 -> **D1 SQL Database** -> 新建 `airam-db`，在 Console 中执行 `migrations/0001_init.sql` 初始化数据表与全文索引。
2. **连接 Pages 部署**：
   在 **Workers & Pages** -> **Create application** -> **Pages** -> 连接 GitHub 仓库。
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. **绑定环境变量与 D1**：
   - 在 Settings -> Environment variables 填入 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`APP_URL`；
   - 在 Settings -> Functions -> D1 database bindings 绑定变量名为 `DB` 的 `airam-db`；
   - 点击 **Retry deployment** 使边缘绑定生效。

---

### 方案 D：本地开发与快速试运行

1. 克隆代码并安装依赖：
   ```bash
   git clone <repo-url>
   cd airam
   npm install
   ```
2. 复制环境变量模板：
   ```bash
   cp .env.example .env
   ```
   并在 `.env` 中填写您的 `GITHUB_CLIENT_ID` 与 `GITHUB_CLIENT_SECRET`。
3. 启动本地全栈服务：
   ```bash
   npm run dev
   ```
4. 浏览器打开 `http://localhost:3000` 即可体验！

---

## 五、系统上线后初始化与操作指引

### 1. 首位管理员开箱认领 (First-User Claim)
1. 访问部署好的站点，点击右下角页脚「**切换至管理后台**」；
2. 登录卡片将醒目提示：**👑 首位管理员席位开放中**；
3. 点击 **「使用 GitHub 账号授权登录」**（或使用您的 GitHub Personal Access Token / 演示身份）；
4. 授权成功后，系统自动将该账号绑定为系统唯一最高管理员 (`role: 'admin'`)，并在控制台顶部展示绿标 `管理员: @your_login`。

### 2. 访客提交开源仓库与流控体验
1. 任何访客进入前台展示页，点击顶部或社区推荐栏中的「**🚀 提交开源仓库**」按钮；
2. 输入待推荐的 GitHub 仓库地址（例如 `facebook/react` 或 `https://github.com/vuejs/core`）；
3. 系统实时联动 GitHub API 获取该项目的 Stars、语言与描述并呈现卡片预览；
4. 填写推荐心声并提交，状态自动标记为 `⏳ 待审核`；
5. 若短时间内连续高频提交，系统流控机制生效，前端呈现友好倒计时冷却保护。

### 3. 管理员审核准入与前台联动展示
1. 管理员登录进入后台管理，点击导航栏的「**仓库审核**」专栏（未审核数量显示角标提醒，如 `仓库审核 (2)`）；
2. 管理员可切换筛选：全部、待审核、已准入展示、已驳回；
3. 点击「**批准展示**」后，该仓库立即在服务端转为 `approved` 状态，并实时呈现在前台公共展示空间的「**社区共建与访客推荐开源**」精选流中，带署名认证标识。

### 4. 管理员席位重置机制 (Reset Admin)
若管理员需要转让管理席位或重新绑定新账号，只需向服务器发送重置请求：
```bash
curl -X POST https://your-domain.com/api/auth/reset-admin \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'
```
响应成功后管理员席位重新开放，下一个登入的 GitHub 用户即可重新认领加冕。

---

## 六、安全流控与防御策略 (Rate Limiting)

系统在服务端基于滑动窗口算法内置了针对高敏接口的双重限流引擎：

| 流控维度 | 限制策略 | 超限响应 | 前端交互表现 |
| :--- | :--- | :--- | :--- |
| **GitHub 登入接口**<br>(`/api/auth/*`) | 单 IP 每 60 秒最多允许 **5 次** 请求，每次间隔需大于 1 秒 | HTTP 429 `{ rateLimited: true, retryAfter: X }` | 登录按钮自动切换为「登录冷却保护中 (Xs)」，禁用点击并显示黄色安全告警条 |
| **访客仓库提交**<br>(`POST /api/submissions`) | 单 IP / 访客每 10 分钟最多允许 **3 次** 提交，每次间隔需大于 20 秒 | HTTP 429 `{ rateLimited: true, retryAfter: X }` | 提交弹窗中展示剩余冷却倒计时，提交按钮禁用直到冷却倒计时归零 |
| **重复仓库去重** | 检查全库所有条目 | HTTP 409 拒绝重复提交 | 提示「该仓库已在审核队列中或已在前台展示，无需重复提交」 |

---

## 七、常见问题排查 (FAQ)

### Q1: 点击 GitHub 登录弹窗提示 `redirect_uri_mismatch`？
- **排查**：在 GitHub OAuth App 设置中填写的 **Authorization callback URL** 必须与线上环境完全一致。请确保填写的是 `https://你的域名/auth/callback`，注意 `https` 协议与末尾路径无多余空格。

### Q2: 提示 `未配置 GITHUB_CLIENT_SECRET`？
- **排查**：检查服务器环境变量是否正确注入了 `GITHUB_CLIENT_SECRET`。若使用 Docker 部署，请确保在 `docker run` 时传入 `-e GITHUB_CLIENT_SECRET=xxx` 或在 `.env` 中正确配置。

### Q3: 访客提交仓库时提示 `在 GitHub 上未找到公开仓库`？
- **排查**：请确认仓库地址拼写是否正确，且该仓库在 GitHub 上为公开仓库（Public Repository）。私有仓库或拼写错误的仓库将被系统安全过滤。

### Q4: 容器重启后之前绑定的管理员身份或提交数据丢失？
- **排查**：因为数据默认存放在容器内的 `./data` 文件夹。请在 Docker 启动命令中添加目录映射参数：`-v /宿主机持久路径:/app/.data`。

---

## License

MIT License © 2026 AIram Knowledge OS
