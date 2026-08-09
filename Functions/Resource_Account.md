# Resource Account —— 舰娘Collection资源会计系统

> **锚定目标**：决策复盘驱动。解决四个核心问题：
> 1. 资源在哪流失了？
> 2. 通过什么途径获取资源？
> 3. 使用资源后的回报如何？
> 4. 资源主要从何而来？

---

## 一、设计原则

### 1.1 只记录"变动事件"，不记录"状态快照"

传统工具（如KC3改）记录`"14:32燃料=125000"`这样的绝对值快照，导致90%的数据是重复噪音。

本系统只记录：
```
"14:32建造大和，燃料-1500，弹药-1500，钢材-2000，铝土-1000"
```

### 1.2 事件驱动，而非时间驱动

| 策略 | 触发条件 | 数据量 |
|------|---------|--------|
| 时间驱动（KC3改） | 每次返回母港都记录 | 每日20~50条快照 |
| **事件驱动（本系统）** | **资源实际发生变动时** | **每日5~20条变动事件** |

### 1.3 投入产出关联

每一条支出记录尽可能关联到产出结果：
- 建造投入 → 建造产出（出货舰娘）
- 出击消耗 → 战斗产出（掉落/战果）
- 远征时间 → 远征收益

---

## 二、数据架构：两层表 + 归档文件

### 第一层：7天滚动事件层（Decision Events）

保留最近7天的完整事件级数据，用于实时查询和调试。

### 第二层：永久日摘要层（Daily Summaries）

每天凌晨2点（东京时间）聚合前日事件，压缩为日摘要，永久保留。

### 第三层：归档文件（可选）

超期的事件级数据可导出为gzip压缩的JSON Lines，存入Supabase Storage或本地。

---

## 三、表结构设计（直接复用已有项目）

所有表结构均基于 **KC3改 IndexedDB** 和 **航海日誌拡張版 CSV** 的已验证字段，不做重新设计。

### 表1：resource_changes（资源变动事件）

复用KC3改`resource`表字段，但语义从"绝对值"改为"变动量"。

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `id` | BIGSERIAL | KC3改 | 记录ID |
| `time` | TIMESTAMPTZ | KC3改 | 变动发生时间 |
| `fuel` | INTEGER | KC3改 | **变动量**（+收入/-支出） |
| `ammo` | INTEGER | KC3改 | **变动量** |
| `steel` | INTEGER | KC3改 | **变动量** |
| `bauxite` | INTEGER | KC3改 | **变动量** |
| `bucket` | INTEGER | KC3改 | **变动量** |
| `burner` | INTEGER | KC3改 | **变动量** |
| `devmat` | INTEGER | KC3改 | **变动量** |
| `screw` | INTEGER | KC3改 | **变动量** |
| `event_type` | VARCHAR(16) | **新增** | 变动原因枚举 |
| `context_id` | VARCHAR(32) | **新增** | 关联到具体事件表的外键 |

**event_type枚举**：
```
CONSTRUCTION      — 建造
DEVELOPMENT       — 开发
EXPEDITION_RETURN — 远征归来
DISSOLUTION       — 解体回收
SUPPLY            — 舰队补给
REPAIR            — 入渠修理
REPAIR_SPEED      — 高速修复
SORTIE            — 出击消耗
QUEST             — 任务报酬
NATURAL_REGEN     — 自然回复（推算）
```

**索引**：
```sql
CREATE INDEX idx_resource_changes_time ON resource_changes(time);
CREATE INDEX idx_resource_changes_type ON resource_changes(event_type, time);
```

---

### 表2：expeditions（远征记录）

**直接复用KC3改`exped`表结构**。

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `id` | VARCHAR(32) | KC3改 | 记录ID |
| `time` | TIMESTAMPTZ | KC3改 | 归来时间 |
| `mission` | SMALLINT | KC3改 | 远征任务ID |
| `fleet` | SMALLINT | KC3改 | 执行舰队编号 |
| `result` | SMALLINT | KC3改 | 结果（0=失败, 1=成功, 2=大成功） |
| `fuel` | INTEGER | KC3改 | **获得燃料** |
| `ammo` | INTEGER | KC3改 | **获得弹药** |
| `steel` | INTEGER | KC3改 | **获得钢材** |
| `bauxite` | INTEGER | KC3改 | **获得铝土** |
| `bucket` | INTEGER | KC3改 | **获得桶** |
| `burner` | INTEGER | KC3改 | **获得喷火** |
| `devmat` | INTEGER | KC3改 | **获得开发资材** |

**API来源**：`api_req_mission/result`响应

**索引**：
```sql
CREATE INDEX idx_expeditions_time ON expeditions(time);
CREATE INDEX idx_expeditions_mission ON expeditions(mission, time);
```

---

### 表3：developments（开发记录）

**直接复用KC3改`develop`表结构**。

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `id` | VARCHAR(32) | KC3改 | 记录ID |
| `time` | TIMESTAMPTZ | KC3改 | 开发时间 |
| `fuel` | INTEGER | KC3改 | **投入燃料**（支出，记为负值或绝对值） |
| `ammo` | INTEGER | KC3改 | **投入弹药** |
| `steel` | INTEGER | KC3改 | **投入钢材** |
| `bauxite` | INTEGER | KC3改 | **投入铝土** |
| `result` | INTEGER | KC3改 | 出货装备图鉴ID |
| `flagship` | SMALLINT | KC3改 | 秘书舰图鉴ID |
| `hqLv` | SMALLINT | KC3改 | 提督等级 |

**API来源**：
- 投入：`api_req_kousyou/createitem`请求参数
- 产出：`api_req_kousyou/createitem`响应

---

### 表4：constructions（建造记录）

**复用KC3改`develop`表结构，扩展建造特有字段**。

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `id` | VARCHAR(32) | KC3改 | 记录ID |
| `time` | TIMESTAMPTZ | KC3改 | 建造完成时间 |
| `fuel` | INTEGER | KC3改 | **投入燃料** |
| `ammo` | INTEGER | KC3改 | **投入弹药** |
| `steel` | INTEGER | KC3改 | **投入钢材** |
| `bauxite` | INTEGER | KC3改 | **投入铝土** |
| `burner` | SMALLINT | **扩展** | 是否使用喷火（0/1） |
| `is_large` | BOOLEAN | **扩展** | 是否大建 |
| `result_ship` | SMALLINT | **扩展** | 出货舰娘图鉴ID |
| `construction_time` | SMALLINT | **扩展** | 建造所需时间（分钟） |
| `secretary` | SMALLINT | **扩展** | 秘书舰图鉴ID |
| `hqLv` | SMALLINT | KC3改 | 提督等级 |

**API来源**：
- 投入：`api_req_kousyou/createship`请求参数
- 产出：`api_req_kousyou/getship`响应

**投入产出关联**：通过建造渠槽位（KDock slot）+ 时间范围关联。

---

### 表5：dissolutions（解体记录）

**复用航海日誌拡張版`解体・廃棄ログ`结构**。

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `id` | VARCHAR(32) | 航海日誌 | 记录ID |
| `time` | TIMESTAMPTZ | 航海日誌 | 解体时间 |
| `ship_id` | SMALLINT | 航海日誌 | 解体舰娘图鉴ID |
| `fuel` | INTEGER | 航海日誌 | **回收燃料**（收入，正值） |
| `ammo` | INTEGER | 航海日誌 | **回收弹药** |
| `steel` | INTEGER | 航海日誌 | **回收钢材** |
| `bauxite` | INTEGER | 航海日誌 | **回收铝土** |

**API来源**：`api_req_kousyou/destroyship`响应

---

### 表6：supplies_repairs（补给与入渠）

**借鉴KC3改`resource`表 + 航海日誌补给记录**。

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `id` | VARCHAR(32) | **新增** | 记录ID |
| `time` | TIMESTAMPTZ | **新增** | 时间 |
| `type` | VARCHAR(16) | **新增** | SUPPLY / REPAIR / REPAIR_SPEED |
| `fleet` | SMALLINT | **新增** | 补给对象舰队（补给时） |
| `ship_id` | SMALLINT | **新增** | 入渠舰娘（入渠时） |
| `fuel` | INTEGER | **新增** | 消耗燃料 |
| `ammo` | INTEGER | **新增** | 消耗弹药 |
| `steel` | INTEGER | **新增** | 消耗钢材（入渠） |
| `bucket` | SMALLINT | **新增** | 消耗桶（高速修复） |

**API来源**：
- 补给：`api_req_hokyu/charge`响应
- 入渠：`api_req_nyukyo/start`响应
- 高速修复：`api_req_nyukyo/speedchange`响应

---

### 表7：sorties（出击记录）

**直接复用KC3改`sortie`表结构**。

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `id` | VARCHAR(32) | KC3改 | 出击ID（关联键） |
| `time` | TIMESTAMPTZ | KC3改 | 出击时间 |
| `world` | SMALLINT | KC3改 | 海域 |
| `map` | SMALLINT | KC3改 | 地图 |
| `fleet` | JSONB | KC3改 | 出击舰队编成（6舰api_id数组） |
| `combined` | BOOLEAN | KC3改 | 是否联合舰队 |
| `fleet2` | JSONB | KC3改 | 第二舰队编成（联合时） |

**API来源**：`api_req_map/start`响应

---

### 表8：battles（战斗记录）

**直接复用KC3改`battle`表结构**。

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `id` | VARCHAR(32) | KC3改 | 战斗ID |
| `sortie_id` | VARCHAR(32) | KC3改 | **关联出击ID（外键）** |
| `node` | SMALLINT | KC3改 | 节点编号 |
| `time` | TIMESTAMPTZ | KC3改 | 战斗时间 |
| `enemy_id` | INTEGER | KC3改 | 敌舰队ID |
| `enemy_formation` | SMALLINT | KC3改 | 敌阵形 |
| `engagement` | SMALLINT | KC3改 | 交戦形態 |
| `result` | VARCHAR(4) | KC3改 | 战果评级（S/A/B/C/D） |
| `drop` | SMALLINT | KC3改 | 掉落舰娘图鉴ID |
| `mvp` | SMALLINT | KC3改 | MVP位置 |

**API来源**：`api_req_sortie/battleresult`或`api_req_combined_battle/battleresult`响应

---

## 四、日摘要层表结构（复用航海日誌CSV报告书）

### 表9：daily_resource_flow（资源日流水）

**复用航海日誌`資材ログ`结构，扩展收支分解字段**。

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `date` | DATE | 航海日誌 | 日期 |
| `fuel_income` | INTEGER | **聚合** | 当日燃料总收入 |
| `fuel_expense` | INTEGER | **聚合** | 当日燃料总支出（负值） |
| `fuel_net` | INTEGER | **聚合** | 净变化 |
| `ammo_income` | INTEGER | **聚合** | 当日弹药总收入 |
| `ammo_expense` | INTEGER | **聚合** | 当日弹药总支出 |
| `ammo_net` | INTEGER | **聚合** | 净变化 |
| `steel_income` | INTEGER | **聚合** | 当日钢材总收入 |
| `steel_expense` | INTEGER | **聚合** | 当日钢材总支出 |
| `steel_net` | INTEGER | **聚合** | 净变化 |
| `bauxite_income` | INTEGER | **聚合** | 当日铝土总收入 |
| `bauxite_expense` | INTEGER | **聚合** | 当日铝土总支出 |
| `bauxite_net` | INTEGER | **聚合** | 净变化 |
| `income_breakdown` | JSONB | **聚合** | `{expedition: 420, dissolution: 8, quest: 100, natural: 72}` |
| `expense_breakdown` | JSONB | **聚合** | `{construction: 1500, development: 30, sortie: 320, supply: 280, repair: 400}` |

**聚合规则**：每日凌晨2点，从第一层事件表聚合生成。

---

### 表10：daily_production_report（生产日报）

**复用航海日誌`建造・開発・遠征日志`结构**。

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `date` | DATE | 航海日誌 | 日期 |
| `construction_attempts` | SMALLINT | **聚合** | 建造次数 |
| `construction_total_fuel` | INTEGER | **聚合** | 建造总消耗燃料 |
| `construction_ssr_count` | SMALLINT | **聚合** | 出货稀有舰数 |
| `construction_average_cost_per_ssr` | JSONB | **聚合** | 平均每只SSR消耗 |
| `development_attempts` | SMALLINT | **聚合** | 开发次数 |
| `development_total_bauxite` | INTEGER | **聚合** | 开发总消耗铝土 |
| `development_key_item_count` | SMALLINT | **聚合** | 关键装备出货数 |
| `expedition_runs` | SMALLINT | **聚合** | 远征次数 |
| `expedition_total_fuel_return` | INTEGER | **聚合** | 远征总回报燃料 |
| `expedition_efficiency_score` | FLOAT | **聚合** | 收益/小时 |

---

### 表11：daily_sortie_report（出击日报）

**复用航海日誌`海戦・ドロップ報告書`结构**。

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `date` | DATE | 航海日誌 | 日期 |
| `total_sorties` | SMALLINT | **聚合** | 总出击次数 |
| `total_fuel_consumed` | INTEGER | **聚合** | 出击总消耗燃料 |
| `total_ammo_consumed` | INTEGER | **聚合** | 出击总消耗弹药 |
| `total_drops` | SMALLINT | **聚合** | 总掉落数 |
| `key_drops` | JSONB | **聚合** | `{161: 1, 421: 0}`关键舰娘掉落 |
| `s_rate` | FLOAT | **聚合** | S胜次数/总战斗数 |

---

## 五、四个核心问题的查询路径

| 问题 | 查询表/字段 | 粒度 |
|------|-----------|------|
| **资源在哪流失了？** | `daily_resource_flow.expense_breakdown` | 日级：建造/开发/出击/补给/入渠各占多少 |
| | `resource_changes` 按`event_type`过滤 | 事件级：具体到每一次建造、每一次出击 |
| **通过什么途径获取资源？** | `daily_resource_flow.income_breakdown` | 日级：远征/解体/任务/自然回复各占多少 |
| | `expeditions` + `dissolutions` | 事件级：每次远征带回多少、每次解体回收多少 |
| **使用资源后的回报如何？** | `daily_production_report` | 日级：平均每次建造花多少出一只SSR、远征每小时收益 |
| | `constructions`投入 vs `result_ship`产出 | 事件级：这次建造1500油出了大和，值不值？ |
| | `sorties`消耗 vs `battles.drop` | 事件级：这次出击花了320油，掉了什么？ |
| **资源主要从何而来？** | `daily_resource_flow.income_breakdown`长期聚合 | 周/月/活动周期：远征收入占总收入60%，解体占5%... |

---

## 六、投入产出关联设计

### 关联1：建造投入 → 建造产出

- `constructions`表记录投入（时间戳T1）
- `api_req_kousyou/getship`响应记录产出（时间戳T2）
- **关联键**：提督ID + 建造渠槽位（KDock slot）+ 时间范围（T1 ~ T1+建造时间）

### 关联2：出击投入 → 战斗产出

- `sorties.id` → `battles.sortie_id`（**直接复用KC3改外键设计**）
- 消耗：从`sorties.fleet`编成 + 地图ID推算燃料/弹药消耗
- 产出：`battles.drop` + `battles.result`

### 关联3：远征投入 → 远征产出

- `expeditions`表同时包含投入（派遣时间）和产出（归来资源）
- 投入：派遣时间 = `time` - 远征所需时间
- 产出：`fuel`/`ammo`/`steel`/`bauxite`

---

## 七、自然回复处理策略

不单独拦截自然回复（无API通知）。每日聚合时计算**"无法归因的增量"**：

```
natural_regen = 当日净增量 - (远征收入 + 解体收入 + 任务收入 - 建造支出 - 开发支出 - 补给支出 - 入渠支出 - 出击支出)
```

- 若结果 ≈ 72（每小时3点 × 24小时），记为`NATURAL_REGEN`
- 若结果异常，说明有漏记事件或活动奖励

---

## 八、存储估算

| 层级 | 记录数（200天） | 大小 | 位置 |
|------|---------------|------|------|
| 第一层（7天事件级） | ~35,000条 | ~13MB | Supabase DB |
| 第二层（日摘要） | ~200条 | ~1MB | Supabase DB |
| 归档文件（gzip） | — | ~27MB | Supabase Storage |
| **总计** | — | **~41MB** | Free Tier轻松容纳 |

---

## 九、索引来源

| 项目 | 仓库 | 引用内容 |
|------|------|---------|
| KC3改 | github.com/KC3Kai/KC3Kai | IndexedDB表结构（resource/exped/develop/sortie/battle） |
| 航海日誌拡張版 | github.com/nekopanda/logbook | CSV报告书结构（資材ログ/建造・開発・遠征日志/海戦・ドロップ報告書/解体・廃棄ログ） |
| 航海日誌拡張版 | github.com/Nishisonic/logbook | 继续版维护、脚本扩展 |

---

*文档生成时间：2026-08-09*
*锚定目标：决策复盘驱动的资源会计系统*
