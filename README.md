# 真心话大冒险 · 席恩·浪客之心

一个跑在浏览器里的剧情向猜拳 + 真心话大冒险游戏。前端是单 HTML + 原生 JS，后端用 Node.js 调大模型做内容生成与安审。

## 项目结构

```
.
├── server.js              # Node 后端（Express + 调 LLM）
├── report.js              # 报告/摘要生成
├── package.json           # 依赖清单
├── .env                   # 环境变量（API Key 等，私有仓库）
├── PROMPT模板.md          # 大模型 Prompt 模板
├── func.md                # 功能说明
├── 工程规范.md            # 编码规范
└── demo骨架/              # 前端主目录
    ├── index.html         # 游戏主文件
    ├── assets/            # 立绘/UI 资源（36 张 PNG）
    └── 文案安审清单.md    # 文案安审规则
```

## 启动方式

```bash
# 1. 安装依赖
npm install

# 2. 启动后端（默认 3000 端口）
node server.js

# 3. 浏览器打开
open http://localhost:3000
```

## 环境变量

`.env` 文件（私有仓库，已含真实 Key）：

```ini
LLM_API_KEY=sk-xxx
LLM_BASE_URL=https://llm.chudian.site/v1
PORT=3000
```

## 部署

- **后端**：Node.js 服务（不能直接放 GitHub Pages）
- **前端**：`demo骨架/index.html` 单文件，含所有 CSS/JS

## 安审

见 `demo骨架/文案安审清单.md`。所有 LLM 输出会过服务端安审拦截。
