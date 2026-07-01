# BidCapture AI

BidCapture AI 是一套面向招投标信息检索、筛选、去重和通知的自动化监控系统。项目核心围绕“多网站采集 + 关键词规则过滤 + 可选 AI 二次判断 + 多渠道提醒”构建，适用于需要长期跟踪政府采购、能源电力、新能源、供应链平台等公开招采信息的业务场景。

项目同时提供两种运行形态：

- 桌面端：基于 Tkinter 的本地 GUI，适合 Windows 或个人电脑常驻运行。
- 服务器端：后端基于 FastAPI 提供 REST API，前端基于 React + Vite + TypeScript + Semi Design 独立开发和构建，适合 Linux 服务器部署、远程访问和后台运行。

## 功能概览

- 多站点招标信息采集：支持专用爬虫、内置网站配置和用户自定义网站。
- 关键词筛选：支持关注词、排除词、必含词组合过滤。
- AI 智能过滤：可接入 DeepSeek、OpenAI 兼容接口或 Claude 风格接口，对关键词命中的项目进行二次相关性判断。
- 数据去重与持久化：使用 SQLite 保存历史结果，并通过 URL 的 MD5 指纹避免重复通知。
- 多渠道通知：支持邮件、短信、微信 PushPlus / 企业微信、阿里云语音电话。
- 定时监控：桌面端和服务器端均支持周期性自动检索。
- 浏览器模式采集：服务器端可使用 Selenium + Chrome 处理部分反爬或动态渲染页面。
- Web 管理端：PC 端工作台风格，提供监控启动/停止、立即检索、站点配置、联系人配置、日志查看、结果查看等 API 和页面。

## 适用场景

- 企业市场、销售或投标团队需要自动发现相关招标机会。
- 运维人员希望将招采信息检索任务部署为后台服务。
- 业务人员需要通过关键词和 AI 规则减少无关招标信息干扰。
- 团队需要将结果通过邮件、短信、微信或电话及时推送给负责人。

## 项目结构

```text
BidCapture-AI/
├── README.md                    # 项目总说明
├── requirements.txt             # 桌面端 / 核心模块依赖
├── run.py                       # 桌面 GUI 启动入口
├── pack.bat                     # Windows 打包 / 部署辅助脚本
├── frontend/                    # React + Vite + TypeScript 前端工程
│   ├── src/
│   │   ├── api/                 # 请求客户端、接口 endpoints、接口类型
│   │   ├── assets/styles/       # 全局样式
│   │   ├── components/          # 共享 UI、布局和通用组件
│   │   ├── features/monitor/    # 招标监控业务模块
│   │   ├── pages/Home/          # 管理台页面组装层
│   │   ├── pages/Login/         # JWT 登录页面
│   │   ├── types/               # 全局 TypeScript 声明
│   │   ├── utils/               # 纯函数工具
│   │   ├── App.tsx              # SPA 根组件
│   │   └── main.tsx             # React 挂载入口
│   ├── package.json             # 前端依赖与脚本
│   ├── tsconfig.json            # TypeScript 配置
│   └── vite.config.ts           # Vite 开发代理与构建配置
├── src/
│   ├── gui.py                   # Tkinter 桌面端界面
│   ├── monitor_core.py          # 监控核心：爬虫、匹配、存储、通知编排
│   ├── main.py                  # 命令行监控入口
│   ├── ai_guard.py              # AI 二次过滤模块
│   ├── crawler/                 # 各类网站爬虫与通用爬虫
│   ├── matcher/                 # 关键词 / 正则匹配逻辑
│   ├── database/                # SQLite 存储层
│   ├── notifier/                # 邮件、短信、微信、语音通知
│   ├── scheduler/               # APScheduler 定时任务
│   └── utils/                   # 系统托盘、自启动等工具
└── server/
    ├── app.py                   # FastAPI 服务端入口
    ├── static/index.html        # 旧版静态页面兜底
    ├── requirements.txt         # 服务端依赖
    ├── setup.sh                 # Linux 一键部署脚本
    ├── start.sh                 # 服务启动脚本
    ├── stop.sh                  # 服务停止脚本
    ├── bidmonitor.service       # systemd 服务配置
    ├── DEPLOY.md                # 服务器部署说明
    └── README.md                # 服务端专项说明
```

## 技术栈

| 层级 | 技术 / 模块 | 说明 |
| --- | --- | --- |
| 语言 | Python 3.8+ | 桌面端、采集核心、通知模块和服务端均使用 Python 实现 |
| 桌面界面 | Tkinter / ttk | 本地 GUI，包含关键词、站点、联系人、通知、AI、Selenium 等配置入口 |
| Web 服务 | FastAPI | 服务器端 REST API 与 Web 管理页面后端 |
| Web 运行 | Uvicorn | ASGI 服务运行器，默认监听 `0.0.0.0:8080` |
| Web 前端 | React 19 / Vite 7 / TypeScript / Semi Design | 独立前端工程，开发期通过 Vite 代理访问 `/api`，生产期由 FastAPI 托管 `frontend/dist` |
| 数据模型 | Pydantic | 服务端配置请求和响应数据校验 |
| 定时调度 | APScheduler | 桌面端使用 BlockingScheduler，服务端使用 AsyncIOScheduler |
| HTTP 采集 | requests | 普通网页请求、接口调用、通知服务请求 |
| 浏览器采集 | Selenium / Chrome / webdriver-manager | 可选浏览器模式，用于动态页面和反爬场景 |
| HTML 解析 | BeautifulSoup4 / lxml | 页面解析、链接抽取、招标条目解析 |
| 数据存储 | SQLite | 本地文件数据库，保存招标记录、通知状态和去重索引 |
| 匹配算法 | 自定义关键词匹配器 / 正则匹配器 | 支持排除词、必含词、包含词的组合过滤 |
| AI 过滤 | OpenAI 兼容 Chat Completions / DeepSeek / Claude 风格接口 | 对关键词命中的条目做业务相关性判断 |
| 邮件通知 | smtplib / email | 支持 QQ、163、Gmail、Outlook、企业邮箱等 SMTP 配置 |
| 短信通知 | 阿里云短信 API / 腾讯云短信接口预留 | 根据新增数量和来源发送摘要提醒 |
| 微信通知 | PushPlus / 企业微信 Webhook | 推送招标摘要和结果链接 |
| 语音通知 | 阿里云语音服务 | 对关键联系人发起语音电话提醒 |
| 部署 | Shell / systemd | 支持 Linux 后台运行与开机自启动 |

## 核心算法与处理流程

### 1. 站点初始化算法

系统启动后会根据配置生成爬虫实例：

1. 读取启用的网站列表。
2. 优先加载专用爬虫，例如中国采购与招标网等已有爬虫类。
3. 对内置网站中没有专用解析器的平台，使用通用爬虫 `CustomCrawler`。
4. 对用户新增的自定义网站，同样使用通用爬虫。
5. 如果启用 Selenium 浏览器模式，则对通用网站使用 `SeleniumCrawler`，否则使用普通 HTTP 抓取。
6. 如果 Selenium 依赖或 Chrome 环境不可用，系统会回退到普通模式并记录日志。

该设计让项目既能维护少量高质量专用爬虫，也能快速覆盖大量公开网站。

### 2. 页面采集与解析算法

普通 HTTP 爬虫基于 `BaseCrawler` 执行以下流程：

1. 为每次请求随机选择浏览器 User-Agent，并补充常见浏览器请求头。
2. 使用 `requests.Session` 复用连接。
3. 请求失败时使用指数退避重试，默认最多重试 3 次。
4. 自动识别页面编码，并使用 `BeautifulSoup + lxml` 解析 HTML。
5. 对页面内容执行反爬拦截特征检测，例如验证码、访问频繁、Access Denied、403 等。
6. 专用爬虫按网站结构解析标题、链接、发布日期、采购人等字段。
7. 通用爬虫从页面链接中抽取标题长度合理、URL 有效且未重复的链接作为候选条目。

Selenium 爬虫会启动无头 Chrome，等待页面主体加载完成后读取 `page_source`，再复用与通用爬虫类似的链接抽取逻辑。

### 3. 关键词匹配算法

关键词匹配由 `KeywordMatcher` 完成，输入为招标标题和正文内容。当前实现遵循以下顺序：

1. 排除词优先：只要标题或正文包含任一排除词，直接判定为不匹配。
2. 必含词校验：如果配置了必含词，标题或正文需要命中其中至少一个必含词。
3. 关注词命中：标题或正文命中任一关注词，即判定为关键词匹配。
4. 多字段合并：标题和正文分别匹配后合并命中词，并去重输出。
5. 排除覆盖：如果任一字段触发排除词，最终结果仍为不匹配。

示例：

```text
关注词：光伏, 风电, 巡检
必含词：无人机
排除词：航拍, 农业, 消防

标题：某光伏电站无人机巡检服务采购
结果：命中“光伏 / 无人机 / 巡检”，通过关键词过滤

标题：某农业无人机采购项目
结果：命中排除词“农业”，不进入后续通知
```

### 4. AI 二次过滤算法

当 AI 过滤开启后，系统只对已经通过关键词规则的条目调用 `AIGuard`：

1. 将项目标题和正文摘要发送给配置的 AI 接口。
2. 使用系统提示词定义业务范围，例如光伏巡检无人机、风电巡检无人机、红外热斑检测、叶片检测等。
3. 要求模型返回 JSON：

```json
{
  "relevant": true,
  "reason": "与光伏电站无人机巡检服务相关"
}
```

4. `relevant=true` 的条目继续保存和通知。
5. `relevant=false` 的条目会记录过滤理由并跳过。
6. 如果 AI 未启用、未配置 Key、接口异常或网络超时，当前实现采用“保守放行”策略，避免因为 AI 服务不可用而漏掉潜在商机。

### 5. 去重与存储算法

每条招标记录会被标准化为 `BidInfo`：

```text
title         标题
url           原始链接
publish_date  发布日期
source        来源网站
content       正文摘要
purchaser     采购人
```

系统使用 URL 生成 MD5 作为 `unique_id`：

```text
unique_id = MD5(url)
```

SQLite 表中对 `unique_id` 建立唯一索引。保存前先查询是否存在：

- 不存在：写入数据库，标记为未通知。
- 已存在：跳过，不重复提醒。
- 通知成功后：将对应记录标记为已通知。

这种策略实现简单、稳定，适合公开招标链接作为唯一来源的监控场景。

### 6. 通知分发流程

当本轮监控发现新匹配结果后，系统按配置发送通知：

1. 邮件通知：发送 HTML + 纯文本双格式邮件，包含标题、来源、日期和链接。
2. 短信通知：发送新增数量和来源摘要。
3. 微信通知：通过 PushPlus 或企业微信 Webhook 推送摘要和链接。
4. 语音通知：通过阿里云语音服务拨打电话并播报新增数量。
5. 所有通知完成后，将成功处理的记录标记为已通知。

服务器端会从联系人配置中读取不同联系人对应的邮箱、手机号、微信 Token 等信息，实现多人分发。

### 7. 定时调度流程

桌面端：

- GUI 使用独立线程运行监控任务，避免界面卡死。
- 定时器按用户配置的分钟间隔重复执行。
- 用户可随时停止任务，停止信号会传递到爬虫和匹配流程。

服务器端：

- FastAPI 启动后加载 `server/server_config.json`。
- 用户通过 Web 页面或 API 启动监控。
- 后台任务立即执行一次检索。
- 本轮检索结束后，再按配置间隔调度下一次任务。
- `/api/status` 提供运行状态、上次运行时间、下次运行时间、总结果数、今日新增数和当前进度。

## 快速开始：桌面端

### 1. 创建虚拟环境

```bash
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

如需使用浏览器模式，请额外安装：

```bash
pip install selenium webdriver-manager
```

并确保本机已安装 Google Chrome。

### 3. 启动桌面端

```bash
python run.py
```

首次运行后，在界面中配置：

- 关注关键词、排除关键词、必含关键词。
- 启用的网站列表或自定义网站。
- 邮件、短信、微信、语音通知。
- AI 接口地址、模型名和 API Key。
- 监控间隔、开机自启动、托盘最小化等本地选项。

桌面端配置默认保存到：

```text
user_config.json
```

该文件可能包含授权码、API Key、联系人等敏感信息，已在 `.gitignore` 中忽略。

## 快速开始：服务器端

服务器端适合部署到 Linux 主机，默认后端端口为 `8080`。Web 管理端已经改为前后端分离结构：本地开发时分别启动 FastAPI 和 Vite，生产部署时先构建 `frontend/dist`，再由 FastAPI 托管构建产物。

### 1. 安装服务端依赖

```bash
cd server
pip install -r requirements.txt
```

### 2. 安装前端依赖

前端需要 Node.js 20.19+ 或 22.12+。

```bash
cd frontend
npm install
```

### 3. 本地开发

先启动后端：

```bash
cd server
python app.py
```

或使用 Uvicorn：

```bash
python -m uvicorn app:app --host 0.0.0.0 --port 8080
```

再启动前端：

```bash
cd frontend
npm run dev
```

访问：

```text
http://localhost:5173
```

Vite 会把 `/api` 代理到 `http://127.0.0.1:8080`。

### 4. 生产构建与访问

```bash
cd frontend
npm run typecheck
npm run build

cd ../server
python app.py
```

访问：

```text
http://服务器IP:8080
```

当 `frontend/dist/index.html` 存在时，FastAPI 会优先返回 React 构建产物；否则回退到 `server/static/index.html`。

默认 JWT Token 认证：

```text
用户名：admin
密码：123456
```

Web 管理端会先调用 `/api/auth/login` 获取 token，后续接口通过 `Authorization: Bearer <token>` 访问。生产环境部署前应修改 `server/app.py` 中的默认账号密码，并通过 `BIDMONITOR_JWT_SECRET` 设置独立密钥。

### 5. 后台运行

```bash
chmod +x server/start.sh server/stop.sh
./server/start.sh
```

停止服务：

```bash
./server/stop.sh
```

### 6. 一键部署

如使用 `/opt/bidmonitor` 作为服务器安装目录，可参考：

```bash
cd /opt/bidmonitor
chmod +x server/setup.sh
./server/setup.sh
```

更完整的服务器说明见：

- `server/README.md`
- `server/DEPLOY.md`

服务器端配置默认保存到：

```text
server/server_config.json
```

该文件同样包含敏感信息，已在 `.gitignore` 中忽略。

## Web API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/` | Web 管理页面 |
| GET | `/api/status` | 获取运行状态、进度和统计数据 |
| POST | `/api/start` | 启动周期监控 |
| POST | `/api/stop` | 停止周期监控 |
| POST | `/api/run-once` | 立即执行一次检索 |
| GET | `/api/config` | 获取基础配置 |
| POST | `/api/config` | 更新基础配置 |
| POST | `/api/config/full` | 更新完整配置 |
| GET | `/api/sites` | 获取内置网站列表 |
| POST | `/api/sites` | 更新启用网站 |
| GET | `/api/custom-sites` | 获取自定义网站 |
| POST | `/api/custom-sites` | 更新自定义网站 |
| GET | `/api/results` | 获取招标结果 |
| GET | `/api/logs` | 获取运行日志 |
| DELETE | `/api/logs` | 清空运行日志 |
| DELETE | `/api/history` | 清空历史数据 |
| GET | `/api/contacts` | 获取联系人 |
| POST | `/api/contacts` | 更新联系人 |
| POST | `/api/test/email` | 测试邮件通知 |
| POST | `/api/test/sms` | 测试短信通知 |
| POST | `/api/test/wechat` | 测试微信通知 |
| POST | `/api/test/voice` | 测试语音通知 |
| POST | `/api/test/ai` | 测试 AI 接口 |

## 配置说明

### 关键词配置

| 配置项 | 含义 | 示例 |
| --- | --- | --- |
| 关注词 | 命中任意一个即进入候选 | `光伏,风电,巡检` |
| 排除词 | 命中任意一个即排除 | `航拍,农业,消防` |
| 必含词 | 配置后至少命中一个才继续 | `无人机` |

推荐配置思路：

- 关注词用于扩大召回，例如行业、场景、设备、服务关键词。
- 必含词用于保证核心业务相关性，例如必须出现“无人机”。
- 排除词用于移除明显不相关领域，例如航拍、植保、消防、测绘等。
- AI 过滤用于处理规则难以覆盖的语义判断。

### AI 配置

常见配置示例：

```json
{
  "enable": true,
  "base_url": "https://api.deepseek.com/chat/completions",
  "api_key": "your-api-key",
  "model": "deepseek-chat"
}
```

如果使用 OpenAI 兼容服务，`base_url` 应填写完整的 Chat Completions 接口地址。当前代码会直接请求该地址，不会自动追加路径。

### 数据与敏感文件

以下文件不应提交到代码仓库：

```text
user_config.json
server/server_config.json
data/
*.db
*.log
.env
```

这些路径已在 `.gitignore` 中忽略。

## 运行与维护建议

- 首次部署建议先只启用少量站点，确认关键词、通知和 AI 配置正确后再扩大站点范围。
- 服务器端启用 Selenium 前，需要确认 Chrome / Chromium 和 ChromeDriver 可用。
- 对访问频繁或有反爬限制的网站，应适当增大请求间隔。
- 如果短信、语音或 AI 服务异常，优先查看运行日志和对应服务商控制台。
- 如果通知重复，检查 `data/bids.db` 是否被删除或 URL 是否发生变化。
- 如果结果过少，先降低必含词约束，再观察 AI 过滤日志。

## 开发与验证

常用本地检查命令：

```bash
# 检查 Python 文件语法
python -m compileall src server

# 检查前端 TypeScript
cd frontend && npm run typecheck

# 构建前端生产产物
cd frontend && npm run build

# 运行测试（当前仓库依赖中包含 pytest，是否有测试用例取决于后续补充）
pytest
```

调试采集链路时，建议按以下顺序定位：

1. 站点是否启用。
2. 普通 HTTP 或 Selenium 是否能正常抓到页面。
3. 页面是否触发反爬拦截。
4. 解析出的候选链接数量是否合理。
5. 关键词过滤是否过严。
6. AI 是否将结果过滤掉。
7. 数据库中是否已存在相同 URL。
8. 通知配置是否完整。

## 许可说明

当前仓库根目录未包含 `LICENSE` 文件。如需正式开源或对外交付，请补充明确的软件许可文件，并以实际 `LICENSE` 内容为准。
