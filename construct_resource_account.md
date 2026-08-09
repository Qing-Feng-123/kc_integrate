# 建造资源消耗全栈设想

> **项目**: kc_fullstack / kc_integrate  
> **范围**: 仅记录建造相关（通常建造、大型建造、高速建造），不包含开发、解体、入渠、补给、远征、出击等  
> **更新日期**: 2026-08-09

---

## 一、核心设计原则

1. **脚本无状态**：每条事件独立推送，不维护内存关联状态。刷新/崩溃/重载都不丢数据。
2. **一渠一表**：4 个建造渠各一张流水表，天然串行，无需跨渠关联。
3. **72 小时滑动窗口**：流水表只保留最近 72 小时（东京时间），过期自动删除。
4. **事件驱动归档**：由 `getship` 触发归档，从 `getship` 往回找同渠最近的 `createship`，中间所有 `speedchange` 融为一条归档记录。
5. **隐式消耗硬编码 + 快照校验**：开发资材、喷火消耗在请求体中不可见，脚本硬编码，后端用 `material_snapshot` 交叉验证。

---

## 二、表结构

### 2.1 流水表（4 张）

每张表只保留最近 72 小时的事件，过期自动删除。

```sql
-- build_stream_dock1 ~ build_stream_dock4
CREATE TABLE build_stream_dock1 (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(20) NOT NULL,     -- createship | getship | speedchange | kdock_refresh | material_snapshot
    timestamp TIMESTAMPTZ NOT NULL,

    -- createship 时填充
    fuel INT,
    ammo INT,
    steel INT,
    bauxite INT,
    is_large BOOLEAN DEFAULT FALSE,
    devmat_inferred INT DEFAULT 1,

    -- getship 时填充
    ship_id INT,
    ship_instance_id INT,

    -- speedchange 时填充
    flame_inferred INT DEFAULT 1,

    -- 通用
    material_snapshot INT[],              -- [fuel, ammo, steel, bauxite, flame, bucket, devmat, screw]
    kdock_data JSONB,                   -- kdock_refresh 时填充

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_build_stream_dock1_time ON build_stream_dock1(timestamp);
```

### 2.2 归档表（1 张）

永久保存已完成的建造记录。

```sql
CREATE TABLE build_archive (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    dock_id INT NOT NULL,                -- 1~4

    started_at TIMESTAMPTZ NOT NULL,     -- createship 时间
    completed_at TIMESTAMPTZ NOT NULL, -- getship 时间
    build_type VARCHAR(10),              -- 'normal' | 'large'
    speedup BOOLEAN DEFAULT FALSE,       -- 是否使用高速建造

    -- 投入
    input_fuel INT,
    input_ammo INT,
    input_steel INT,
    input_bauxite INT,
    input_devmat INT,                    -- 隐式开发资材消耗
    input_flame INT,                     -- 若 speedup=true，隐式喷火消耗

    -- 产出
    output_ship_id INT,                  -- 图鉴ID
    output_ship_instance_id INT,         -- 实例ID

    -- 校验
    before_material_snapshot INT[],     -- 建造前 port/material
    after_material_snapshot INT[],      -- 建造后 port/material

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 三、72 小时滑动窗口

### 3.1 为什么选 72 小时

| 场景 | 最大耗时 |
|------|---------|
| 通常建造（大型舰） | ~6 小时 |
| 大型建造 | ~8~12 小时 |
| 玩家延迟取船（睡过头/下线） | +12~24 小时 |
| 极端延迟（周末不玩） | +48 小时 |
| **安全余量** | **72 小时 >> 所有正常场景** |

### 3.2 自动删除策略

```sql
-- 每 X 分钟/小时执行一次
DELETE FROM build_stream_dock1 WHERE timestamp < NOW() - INTERVAL '72 hours';
DELETE FROM build_stream_dock2 WHERE timestamp < NOW() - INTERVAL '72 hours';
DELETE FROM build_stream_dock3 WHERE timestamp < NOW() - INTERVAL '72 hours';
DELETE FROM build_stream_dock4 WHERE timestamp < NOW() - INTERVAL '72 hours';
```

**注意**：归档在 `getship` 写入时**同步完成**，72 小时后流水表里剩下的只有：
- 未完成的 `createship`（进行中或弃坑）
- 孤儿事件（`speedchange`/`getship` 找不到前面的 `createship`）

这些直接删除，无风险。

---

## 四、事件驱动归档机制

### 4.1 触发点

每次 `getship` 事件写入流水表后，**立即触发归档流程**。

### 4.2 归档步骤

**步骤 1**：定位刚写入的 `getship`

```sql
SELECT * FROM build_stream_dockN
WHERE event_type = 'getship'
ORDER BY timestamp DESC LIMIT 1;
```

**步骤 2**：往回找最近的 `createship`（72 小时边界内）

```sql
SELECT * FROM build_stream_dockN
WHERE event_type = 'createship'
  AND timestamp < getship_time
  AND timestamp > getship_time - INTERVAL '72 hours'
ORDER BY timestamp DESC LIMIT 1;
```

**步骤 3**：找中间所有 `speedchange`

```sql
SELECT * FROM build_stream_dockN
WHERE event_type = 'speedchange'
  AND timestamp > createship_time
  AND timestamp < getship_time
ORDER BY timestamp ASC;
```

**步骤 4**：合并写入 `build_archive`

```sql
INSERT INTO build_archive (...)
VALUES (
    dock_id,
    createship.timestamp,           -- started_at
    getship.timestamp,              -- completed_at
    createship.is_large ? 'large' : 'normal',
    speedchange_count > 0,          -- speedup
    createship.fuel,
    createship.ammo,
    createship.steel,
    createship.bauxite,
    createship.devmat_inferred,
    speedchange_records[0]?.flame_inferred,
    getship.ship_id,
    getship.ship_instance_id
);
```

**步骤 5**：删除已归档的流水事件

```sql
DELETE FROM build_stream_dockN
WHERE timestamp >= createship_time
  AND timestamp <= getship_time;
```

### 4.3 核心约束：渠的串行性

舰 C 的每个建造渠**同一时间只能有一个建造任务**。因此对单渠的流水按时间排序后，事件序列天然是：

```
createship → (可选 speedchange) → getship → createship → ...
```

后端只需要**顺序扫描配对**，不需要 Map、不需要请求-响应关联。算法复杂度 O(n)。

---

## 五、脚本端 API 拦截清单

脚本只需要拦截 **5 个 API**，其中 **2 个需要新增「读请求体」能力**。

### 5.1 `api_req_kousyou/createship`

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **读取位置** | **请求体**（form-data） |
| **关键字段** | `api_item1`~`api_item4`（油/弹/钢/铝）、`api_item5`（固定1）、`api_large_flag`（0=通常/1=大建）、`api_kdock_id`（渠ID） |
| **对应 UI** | 工厂 → 选空渠 → 拖入资源 → 点击「建造开始」 |
| **推送内容** | `event_type="createship"`, `dock_id`, `fuel`, `ammo`, `steel`, `bauxite`, `is_large`, `devmat_inferred` |
| **核心作用** | **建造起点**。资源消耗、大建标记、渠归属，全部来自这个请求体。响应里只有渠状态更新，没有投入数据。 |

### 5.2 `api_req_kousyou/getship`

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **读取位置** | 请求体（`api_kdock_id`）+ **响应**（`api_data`） |
| **关键字段** | `api_ship_id`（产出舰娘图鉴ID）、`api_id`（新实例ID） |
| **对应 UI** | 工厂 → 建造完成 → 点击「取得」 |
| **推送内容** | `event_type="getship"`, `dock_id`, `ship_id`, `ship_instance_id` |
| **核心作用** | **归档触发点**。后端收到这条后，立即往回找同渠的 `createship`，把中间所有事件融为一条归档记录。没有这条，建造记录永远无法闭合。 |

### 5.3 `api_req_kousyou/createship_speedchange`

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **读取位置** | **请求体**（`api_kdock_id`、`api_highspeed=1`） |
| **对应 UI** | 工厂 → 点击某渠上的「高速建造」按钮 |
| **推送内容** | `event_type="speedchange"`, `dock_id`, `flame_inferred=1` |
| **核心作用** | 标记「本次建造被加速」。归档时后端把这条夹在 `createship` 和 `getship` 之间，合并为一条记录，并记录喷火消耗。 |

### 5.4 `api_get_member/kdock`

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **读取位置** | **响应**（`api_data[]`） |
| **关键字段** | `api_id`（渠ID）、`api_state`（状态）、`api_created_ship_id`（建造舰图鉴ID）、`api_complete_time`（完成时间戳）、`api_item1`~`api_item5`（投入资源副本） |
| **对应 UI** | 进入工厂界面时自动拉取；母港刷新时也可能触发 |
| **推送内容** | `event_type="kdock_refresh"`, `kdock_data`, `material_snapshot` |
| **核心作用** | **校对/补全**。如果脚本在建造过程中重载，内存无状态，`kdock` 返回的渠状态能让后端知道「渠X 里当前造的是什么、还剩多久」。`api_item1`~`api_item4` 还是投入资源的冗余副本，可与 `createship` 请求体交叉验证。 |

### 5.5 `api_port/port` 中的 `api_material`

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **读取位置** | **响应**（`api_data.api_material`） |
| **关键字段** | `api_material[]`（8 项数组，按 `api_id` 1~8：燃料/弹药/钢材/铝土/喷火/桶/开发资材/螺丝） |
| **对应 UI** | 回母港时**必发** |
| **推送内容** | `event_type="material_snapshot"`, `material_snapshot` |
| **核心作用** | **隐式消耗的校验基准**。`createship` 的开发资材消耗、`speedchange` 的喷火消耗，都是请求体里看不见的硬编码值。`material_snapshot` 让后端能对比「建造前后资源差」，验证硬编码是否准确。 |

---

## 六、隐式消耗处理

### 6.1 关键事实

舰 C 的 POST 请求体是 `application/x-www-form-urlencoded`，**开发资材和喷火的扣减是游戏客户端硬编码**，请求参数里不存在这些字段。

| 动作 | 隐式消耗 | 请求体中是否可见 | 脚本处理方式 |
|------|---------|:--------------:|------------|
| 通常建造 `createship` | 开发资材 -1 | ❌ 不可见 | 硬编码 `devmat_inferred=1` |
| 大型建造 `createship` | 开发资材 -N | ❌ 不可见 | 硬编码 `devmat_inferred=CONFIG.DEVMAT_LARGE_BUILD`（默认 1，可按实际游戏机制调整） |
| 高速建造 `speedchange` | 喷火 -1 | ❌ 不可见 | 硬编码 `flame_inferred=1` |

### 6.2 校验机制

后端收到 `createship`/`speedchange` 时，先使用硬编码值记录。等待后续 `api_port/port` 或 `api_get_member/material` 返回：

- 对比 `material_snapshot[6]`（`api_id=7`，开发资材）的差值
- 对比 `material_snapshot[4]`（`api_id=5`，喷火）的差值
- 如有偏差，用实际差值覆盖硬编码值后修正归档记录

---

## 七、后端聚合逻辑

### 7.1 查询某渠最近 24 小时流水

```sql
SELECT * FROM build_stream_dock1
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp ASC;
```

### 7.2 顺序扫描配对算法

```python
def aggregate_builds(events):  # events 已按时间排序
    builds = []
    i = 0
    while i < len(events):
        if events[i].type == 'createship':
            build = {
                'input': events[i],
                'speedup': None,
                'output': None,
                'status': 'incomplete'
            }
            j = i + 1
            while j < len(events):
                if events[j].type == 'speedchange':
                    build['speedup'] = events[j]
                elif events[j].type == 'getship':
                    build['output'] = events[j]
                    build['status'] = 'complete'
                    break
                j += 1
            builds.append(build)
            i = j if build['status'] == 'complete' else i + 1
        else:
            # 孤儿事件（speedchange/getship 前面没有 createship）
            i += 1
    return builds
```

### 7.3 聚合结果模式

| 事件序列模式 | 聚合结果 |
|------------|---------|
| `createship` → `getship` | 一条完整建造记录（通常建造，未加速） |
| `createship` → `speedchange` → `getship` | 一条完整建造记录（已加速） |
| `createship` → （无后续事件） | **未完成建造**（进行中或弃坑） |
| `speedchange`/`getship` → （前面无 createship） | **孤儿事件**（异常，72h 后删除） |

---

## 八、边界情况处理

### 8.1 跨日建造

```
8/8 23:50 createship（渠1）
8/9 00:05 getship（渠1）
```

**处理**：一渠一表 + 时间范围查询天然跨日，无需特殊逻辑。`getship` 触发归档时，往回找 72h 内的 `createship`，必然能找到。

### 8.2 玩家长时间不取船

```
10:00 createship（渠1）
[玩家下线，次日才上线]
次日 09:00 getship（渠1）
```

**处理**：
- `createship` 和 `getship` 都在 72h 内 → 正常归档
- 如果超过 72h → `createship` 已被删除，`getship` 成为孤儿事件，不归档，72h 后删除

### 8.3 脚本重载导致重复推送

**表现**：同一次建造出现两条时间接近的 `createship`，后面只有一条 `getship`。

**处理**：归档时按**时间最近原则**匹配 `getship` 往回找最近的 `createship`。另一条 `createship` 成为孤儿，72h 后删除。或后端做 5 秒去重（同渠、input 完全相同 → 视为重复）。

### 8.4 孤儿事件

**原因**：`createship` 超过 72h 被删除，或脚本漏推。

**处理**：
- `speedchange`/`getship` 找不到 `createship` → 不归档，留在流水表
- 72h 后自动删除
- 不污染归档表

---

## 九、推送端点清单

| 端点 | 触发事件 | 数据内容 |
|------|---------|---------|
| `kc-ingest-build-event` | `createship` / `getship` / `speedchange` | `event_type`, `dock_id`, `timestamp`, `material_snapshot` + 各事件字段 |
| `kc-ingest-kdock` | `api_get_member/kdock` | `kdock_data`（4渠全量）, `timestamp`, `material_snapshot` |
| `kc-ingest-material` | `api_port/port` 的 `api_material` | `material_snapshot`（8项数组）, `timestamp` |
| `kc-ingest-deck` | `api_get_member/deck` | 舰队编成（原有，不变） |
| `kc-ingest-ship2` | `api_get_member/ship2` | 舰娘状态（原有，不变） |

---

## 十、前端展示建议

| 展示内容 | 数据来源 | 查询方式 |
|---------|---------|---------|
| **历史建造记录**（已完成） | `build_archive` | 直接查，永久保留 |
| **今日/最近建造**（含进行中） | `build_stream_dockN` | `WHERE timestamp > NOW() - INTERVAL '24 hours'` |
| **当前进行中的建造** | `build_stream_dockN` | 24h 内 `createship` 后无 `getship` 的孤儿记录 |
| **渠状态总览** | `build_stream_dockN` + `kdock_refresh` | 最新 `kdock` 数据 |

---

## 十一、脚本端改动清单

| 修改项 | 当前状态 | 需要变成 |
|--------|---------|---------|
| XHR 拦截 | 只读 `responseText` | 增加 `send(body)` 缓存 + form 解析 |
| `handleApiData` | 4 个分支（deck/ship2/ship_deck/port） | 增加 `createship`/`getship`/`speedchange`/`kdock`/`material` 分支 |
| `api_port/port` 处理 | 只取 `api_ship` + `api_deck_port` | 额外提取 `api_material` 全部 8 项 |
| 本地状态 | 无 | **仅增加** `lastMaterialSnapshot`（8项数组） |
| 数据推送 | 2 个端点（deck/ship2） | 新增 `kc-ingest-build-event`、`kc-ingest-kdock`、`kc-ingest-material` |
| 事件关联 | 无 | **不需要**，每条事件独立推送 |
| 隐式消耗 | 无 | 硬编码 `devmat_inferred` / `flame_inferred` |
| UI 日志 | 通用 API 列表 | 精简为建造专用日志（🚢/✅/⚡） |

---

*文档用途：供脚本开发、后端开发、前端展示三方对齐*  
*覆盖范围：舰C建造全栈（通常建造、大型建造、高速建造）*  
*不涉及：开发、解体、入渠、补给、远征、出击、演习、任务*
