# 舰C平板端插件浏览器 PRD 2.0

> 基于 PRD 1.0 的演进方案：从原生 Android App 转向浏览器脚本 + 云端后端 + 独立前端架构
> 适用场景：仅持有 Android 平板、无 PC/Mac 开发环境、需实现数据拦截与跨设备同步
> 版本：2.0 | 日期：2026-08-06

---

## 1. 产品定位

**一句话描述**：在 Android 平板上通过浏览器运行舰C，利用内置脚本引擎拦截游戏数据并推送至云端后端，实现跨设备状态监控与辅助提醒。

**核心优势**：
- **零开发环境**：无需 Android Studio、Gradle 或编译工具链
- **即装即用**：浏览器 + 脚本三步完成部署
- **数据可出舱**：突破浏览器沙箱限制，将游戏数据持久化至云端
- **跨设备展示**：手机/PC 通过独立前端实时查看平板游戏状态

---

## 2. 用户场景

| 场景 | 用户行为 | 期望结果 |
|---|---|---|
| 日常出击 | 打开 X 浏览器进入舰C母港，脚本自动拦截 api_port | 平板大屏游玩，同时数据同步至后端 |
| 远征管理 | 发起远征后切出浏览器回微信 | 后端持续计时，到点后向手机推送提醒 |
| 资源监控 | 定时查看资源变化 | 手机前端展示油弹钢铝曲线与恢复速率 |
| 战斗辅助 | 进入战斗画面 | 后端解析战斗 API，返回胜率预测至平板浮动面板 |
| 跨设备查看 | 不在平板旁时用手机打开前端页 | 实时查看舰队状态、入渠/远征倒计时 |

---

## 3. 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        平板端（Android）                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  X浏览器（内置 Tampermonkey 引擎）                         │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ 舰C游戏页面（DMM / KanColle）                       │  │   │
│  │  │ ┌────────────────────────────────────────────────┐ │  │   │
│  │  │ │ 用户脚本（Userscript）                          │ │  │   │
│  │  │ │ • 拦截 XMLHttpRequest / fetch 响应              │ │  │   │
│  │  │ │ • 解析 api_port / api_req_sortie 等关键 API     │ │  │   │
│  │  │ │ • 页面内浮动面板（显示舰队/资源/计时状态）      │ │  │   │
│  │  │ │ • 向后端 API 发送结构化数据（JSON over HTTPS）  │ │  │   │
│  │  │ └────────────────────────────────────────────────┘ │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                        云端后端（BaaS）                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API 服务（Python Flask / Node.js Express）                │   │
│  │  • POST /api/fleet      ← 接收舰队快照                    │   │
│  │  • POST /api/expedition ← 接收远征状态                    │   │
│  │  • POST /api/battle     ← 接收战斗数据                    │   │
│  │  • GET  /api/query      ← 供前端查询历史                   │   │
│  │  • GET  /api/status     ← 返回当前各舰队概览               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  数据库（SQLite / PostgreSQL）                             │   │
│  │  • fleet_data      舰队快照表                              │   │
│  │  • expedition_log  远征记录表（含 start_time / duration）  │   │
│  │  • resource_log    资源采样表（油/弹/钢/铝 + timestamp）   │   │
│  │  • battle_log      战斗记录表                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  推送网关（可选）Bark / PushPlus / Server 酱               │   │
│  │  • 远征/入渠到点时调用第三方推送 API 通知用户手机           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                        独立前端（任意设备）                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  手机 / PC 浏览器 或 微信小程序                             │   │
│  │  • 轮询 /api/status 获取最新状态                           │   │
│  │  • 展示舰队面板、资源曲线、远征倒计时                       │   │
│  │  • 接收 WebSocket / SSE 实时推送（进阶）                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 技术选型

| 层级 | 选型 | 理由 |
|---|---|---|
| 平板浏览器 | X浏览器（Android） | 内置 Tampermonkey 引擎，无需先装扩展再装脚本；极简无广告；原生适配平板横屏；国内可直接下载 |
| 脚本引擎 | Tampermonkey（内置） | 支持 GM_xmlhttpRequest 跨域、GM_setValue 本地存储、标准油猴语法 |
| UA 伪装 | X浏览器设置 → 桌面版 UA | 绕过 DMM 移动端检测，否则无法进入舰C母港 |
| 后端框架 | Python Flask 或 Node.js Express | 轻量、文档丰富、部署简单、个人免费额度充足 |
| 数据库 | SQLite（初期）→ PostgreSQL（进阶） | SQLite 零配置内嵌，适合个人 MVP；PostgreSQL 适合高并发与复杂查询 |
| 托管平台 | Render / Railway / 腾讯云函数 | 提供免费 Tier，支持自定义域名与 HTTPS |
| 前端展示 | 纯 HTML + JS（初期）→ Vue/React（进阶） | 初期用静态页面即可，部署到 GitHub Pages / Vercel 免费 |
| 推送服务 | Bark / PushPlus / 企业微信机器人 | 免费额度足够个人使用，无需自建推送通道 |

---

## 5. 实现路径（三步走）

### 步骤一：验证浏览器脚本可拦截舰C数据（预计 1–2 小时）

**目标**：确认 X 浏览器能正常打开舰C母港，且用户脚本可成功拦截 api_port 等关键 API。

#### 5.1.1 环境准备
- 在 Android 平板安装 **X浏览器**（酷安 / 官网 APK）
- 进入设置 → 浏览器设置 → 用户代理(UA) → 选择"桌面版"或手动填入 Chrome Windows UA

#### 5.1.2 舰C访问验证
- 地址栏输入 `https://www.dmm.com/my/-/login/`
- 完成 DMM 账号登录，确认可正常进入舰C母港
- 若被拦截，检查 UA 是否生效，必要时在脚本中额外覆盖 `navigator.platform`

#### 5.1.3 安装测试脚本
- 复制阶段一测试脚本（见附录 A）
- X浏览器菜单 → 用户脚本 → 导入脚本 → 粘贴保存
- 或从 GreasyFork 搜索安装兼容脚本

#### 5.1.4 拦截验证
- 进入舰C母港，观察页面顶部是否弹出浮动提示（如"拦截到 API: api_port"）
- 通过 X浏览器开发者工具查看 Console 输出确认拦截成功

#### 验收标准
- [ ] X浏览器可正常加载舰C母港并完成交互
- [ ] 脚本成功拦截 `api_port` 请求并获取响应体
- [ ] 页面内浮动提示正常显示且无报错

---

### 步骤二：搭建最小后端与数据持久化（预计 2–4 小时）

**目标**：建立公网可访问的 API 服务，接收脚本发送的数据并写入数据库。

#### 5.2.1 选择托管平台
- 注册 Render（https://render.com）或 Railway（https://railway.app）
- 绑定 GitHub 账号，用于代码自动部署

#### 5.2.2 后端代码开发
- 使用 Python Flask + SQLite 编写最小 API（见附录 B）
- 核心接口：
  - `POST /api/fleet`：接收舰队快照 JSON
  - `POST /api/expedition`：接收远征状态 JSON
  - `GET  /api/query`：返回最近 N 条记录
- 数据库表结构需包含：id、api_path、data（TEXT/JSON）、created_at

#### 5.2.3 部署与域名
- 将代码推送至 GitHub 仓库
- 在 Render 创建 Web Service，绑定仓库自动部署
- 获得 HTTPS 公网地址（如 `https://kancolle-api.onrender.com`）

#### 5.2.4 脚本联调
- 修改步骤一测试脚本，在拦截到 api_port 时通过 `fetch` 或 `GM_xmlhttpRequest` 将数据 POST 至后端 `/api/fleet`
- 请求体结构：
  ```json
  {
    "apiPath": "api_port/api_port",
    "data": "<api_port 响应 JSON 字符串>"
  }
  ```

#### 5.2.5 数据验证
- 通过浏览器直接访问 `https://你的域名/api/query`，确认数据库已有记录
- 检查数据完整性（JSON 可正常解析、时间戳正确）

#### 验收标准
- [ ] 后端服务公网可访问且返回健康状态
- [ ] 脚本发送数据后，数据库成功写入并可查询
- [ ] 网络异常时脚本不崩溃，具备基础错误处理

---

### 步骤三：独立前端展示与推送提醒（预计 2–3 小时）

**目标**：在手机或 PC 上通过浏览器查看舰C实时状态，并实现远征/入渠到点推送。

#### 5.3.1 前端页面开发
- 编写纯 HTML + CSS + JS 展示页（见附录 C）
- 核心功能：
  - 轮询 `/api/status` 或 `/api/query` 获取最新数据
  - 展示舰队列表、资源数量、远征倒计时
  - 使用 Chart.js 绘制资源变化曲线（进阶）

#### 5.3.2 前端部署
- 将前端代码部署至 GitHub Pages（免费）或 Vercel / Netlify
- 确保前端页面可通过手机浏览器正常访问

#### 5.3.3 跨设备验证
- 在平板上运行舰C并操作（如更换舰队、发起远征）
- 在手机上打开前端页，确认数据同步（允许 5–30 秒延迟）

#### 5.3.4 推送提醒接入（可选但强烈建议）
- 在后端增加计时逻辑：记录远征开始时间与预计完成时间
- 使用系统定时任务（如 APScheduler）或外部 Cron 服务轮询
- 到点前 5 分钟调用 Bark / PushPlus API 向用户手机发送推送
- 推送内容示例："🚢 远征 1 队预计 5 分钟后归来，请准备收取资源"

#### 验收标准
- [ ] 手机浏览器可正常打开前端页并显示数据
- [ ] 平板操作后，前端数据在 30 秒内更新
- [ ] 推送服务成功发送测试通知（如使用 Bark）

---

## 6. 已知限制与风险应对

| 风险 | 影响 | 应对策略 |
|---|---|---|
| **浏览器后台冻结** | 切出 X浏览器后脚本停止运行，数据中断 | 多任务界面锁定 X浏览器降低被杀概率；核心计时逻辑迁移至后端，利用后端持续计算 |
| **网络延迟与中断** | 数据同步有 1–30 秒延迟，弱网环境下可能丢失 | 脚本本地做防抖与队列缓冲；后端接口支持幂等写入 |
| **DMM 反检测升级** | UA 伪装失效，无法登录 | 将 UA、指纹参数脚本化，可随时热更新；关注社区最新绕过方案 |
| **后端免费额度耗尽** | Render/Railway 免费版有休眠或流量限制 | 选用国内云函数（如腾讯云 SCFC）或低价 VPS 作为备选 |
| **数据安全** | 后端 API 暴露公网，可能被恶意刷写 | 增加简单 Token 鉴权（请求头携带固定密钥）；后端做写入频率限制 |
| **舰C API 格式变更** | 解析逻辑失效，数据错误 | 解析层模块化，每个 API 独立处理；异常时记录原始数据便于修复 |

---

## 7. 后续演进路线

| 阶段 | 目标 | 实现方式 |
|---|---|---|
| **V1.0（当前）** | 数据出舱 + 跨设备查看 | 浏览器脚本 + Flask + SQLite + 静态前端 |
| **V1.5** | 实时性提升 | 前端改用 WebSocket / SSE 推送，减少轮询延迟 |
| **V2.0** | 智能化辅助 | 后端引入战斗模拟算法，返回胜率预测与装备建议 |
| **V3.0（远期）** | 原生 App 替代 | 获得 PC 后使用 Android Studio 开发原生客户端，复用现有后端 API |

---

## 8. 附录

### 附录 A：步骤一测试脚本（最小拦截验证）

```javascript
// ==UserScript==
// @name         舰C数据拦截测试
// @match         https://www.dmm.com/*
// @match         https://osapi.dmm.com/*
// @match         https://*.dmm.com/*
// @grant          none
// ==/UserScript==

(function() {
    'use strict';
    console.log('[舰C助手] 脚本已注入');

    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        const xhr = this;
        const origOnReady = xhr.onreadystatechange;
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr._url && xhr._url.includes('/api')) {
                console.log('[舰C助手] 拦截API:', xhr._url);
                showToast('拦截到API: ' + xhr._url.split('/').pop());
            }
            if (origOnReady) origOnReady.apply(this, arguments);
        };
        return origSend.apply(this, arguments);
    };

    function showToast(msg) {
        let toast = document.getElementById('kc-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'kc-toast';
            toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:8px 16px;border-radius:6px;z-index:999999;font-size:13px;';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    }
})();
```

### 附录 B：步骤二最小后端（Flask + SQLite）

```python
from flask import Flask, request, jsonify
import sqlite3
import json

app = Flask(__name__)
conn = sqlite3.connect('kancolle.db', check_same_thread=False)
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS fleet_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_path TEXT,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)''')
conn.commit()

@app.route('/api/fleet', methods=['POST'])
def receive_fleet():
    payload = request.get_json()
    c.execute('INSERT INTO fleet_data (api_path, data) VALUES (?, ?)',
              (payload.get('apiPath', ''), json.dumps(payload.get('data', {}), ensure_ascii=False)))
    conn.commit()
    return jsonify({'status': 'ok', 'id': c.lastrowid})

@app.route('/api/query', methods=['GET'])
def query_data():
    c.execute('SELECT * FROM fleet_data ORDER BY created_at DESC LIMIT 10')
    rows = c.fetchall()
    return jsonify([{'id': r[0], 'api_path': r[1], 'data': r[2], 'time': r[3]} for r in rows])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)
```

### 附录 C：步骤三最小前端（纯 HTML + JS）

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>舰C助手</title>
    <style>
        body { font-family: -apple-system, sans-serif; padding: 20px; background: #1a1a2e; color: #eee; }
        .card { background: #16213e; padding: 15px; border-radius: 10px; margin-bottom: 10px; }
        .time { color: #888; font-size: 12px; }
    </style>
</head>
<body>
    <h1>🚢 舰C状态监控</h1>
    <div id="list">加载中...</div>
    <script>
        async function loadData() {
            const res = await fetch('https://你的后端地址/api/query');
            const data = await res.json();
            document.getElementById('list').innerHTML = data.map(item => `
                <div class="card">
                    <div>API: ${item.api_path}</div>
                    <div class="time">${item.time}</div>
                    <div style="margin-top:5px;font-size:12px;opacity:0.7;">数据长度: ${item.data.length}</div>
                </div>
            `).join('');
        }
        loadData();
        setInterval(loadData, 30000);
    </script>
</body>
</html>
```
