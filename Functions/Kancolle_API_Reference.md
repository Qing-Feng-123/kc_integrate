# 舰娘Collection API 端点与返回数据对照表

> **用途**：供其他 Agent 快速理解舰C API体系，无需重复搜索。  
> **数据来源**：基于航海日誌拡張版、KancolleSniffer、KC3改三个项目的GitHub仓库及社区文档调研。  
> **响应格式通用说明**：所有API返回 `svdata={JSON字符串}`，需先去除 `svdata=` 前缀。JSON根节点为 `api_result`（1=成功）和 `api_data`（实际数据）。部分响应含BOM头。

---

## 一、API 响应通用结构

```
HTTP 200 OK
Content-Type: text/plain (实为JSON)
Body: svdata={"api_result":1,"api_result_msg":"成功","api_data":{...}}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `api_result` | int | 1=成功，其他=失败（触发猫画面） |
| `api_result_msg` | string | 结果消息 |
| `api_data` | object/array | 实际业务数据 |

---

## 二、数据获取类 API（api_get_member/* & api_get_master/*）

### 2.1 用户数据（api_get_member/*）

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_get_member/material` | POST | `api_token`, `api_verno=1` | `api_data[]` = [{`api_id`:1~8, `api_value`:整数}]<br>1=燃料,2=弹药,3=钢材,4=铝土,5=喷火,6=桶,7=开发资材,8=螺丝 | ✅ 資材ログCSV来源 | ❌ 不记录历史 | ✅ IndexedDB `resource`表来源 | ⭐⭐⭐ 核心：当前持有量快照 |
| `/api_get_member/ship` | POST | `api_token`, `api_verno=1` | `api_data[]` = 全舰娘数组，含`api_id`(实例ID),`api_ship_id`(图鉴ID),`api_lv`(等级),`api_exp`(经验),`api_nowhp`/`api_maxhp`(HP),`api_cond`(疲劳),`api_kyouka[]`(火力/雷装/对空/装甲/运/对潜/索敌),`api_slot[]`(装备实例ID数组),`api_onslot[]`(搭载数),`api_sally_area`(贴条) | ✅ 所有艦娘一覧CSV来源 | ✅ 舰娘一览CSV来源 | ✅ 内存实时状态 | ⭐ 仅用于识别舰娘存在 |
| `/api_get_member/ship2` | POST | `api_token`, `api_verno=1`, `api_sort_key`(1~4), `api_sort_order=2` | 同`ship`，但按等级排序 | ✅ 同上 | ❌ | ✅ 同`ship` | ⭐ 同上 |
| `/api_get_member/ship3` | POST | `api_token`, `api_verno=1` | 同`ship`，含更多详情 | ❌ | ❌ | ✅ 详细状态 | ⭐ 同上 |
| `/api_get_member/deck` | POST | `api_token`, `api_verno=1` | `api_data[]` = 舰队数组，含`api_id`(舰队ID),`api_name`(舰队名),`api_ship[]`(6个`api_id`) | ✅ 远征/出击阵容 | ❌ | ✅ 舰队编成 | ⭐⭐ 出击/远征阵容关联 |
| `/api_get_member/deck_port` | POST | `api_token`, `api_verno=1` | 同`deck`，母港显示用 | ✅ 同上 | ❌ | ✅ 同`deck` | ⭐⭐ 同上 |
| `/api_get_member/ndock` | POST | `api_token`, `api_verno=1` | `api_data[]` = 入渠渠数组，含`api_ship_id`(入渠舰`api_id`),`api_complete_time`(完成时间戳),`api_item1`/`api_item2`/`api_item3`(消耗燃料/弹药/钢材) | ✅ 入渠计时器 | ❌ | ✅ 入渠状态 | ⭐⭐ 入渠消耗来源 |
| `/api_get_member/kdock` | POST | `api_token`, `api_verno=1` | `api_data[]` = 建造渠数组，含`api_id`(渠ID),`api_state`(状态),`api_created_ship_id`(建造舰图鉴ID),`api_complete_time`(完成时间),`api_item1`~`api_item5`(投入资源) | ✅ 建造信息 | ❌ | ✅ 建造队列 | ⭐⭐⭐ 建造投入来源 |
| `/api_get_member/basic` | POST | `api_token`, `api_verno=1` | `api_data` = {`api_member_id`, `api_nickname`(提督名), `api_level`(等级), `api_experience`(经验), `api_max_chara`(最大舰娘数), `api_max_slotitem`(最大装备数), `api_fcoin`(家具币), `api_st_win`/`api_st_lose`(出击胜/败), `api_ms_count`/`api_ms_success`(远征次数/成功), `api_pt_win`/`api_pt_lose`(演习胜/败), `api_medals`(甲种勋章)} | ✅ 司令部信息 | ❌ | ✅ 提督信息 | ⭐ 提督等级上下文 |
| `/api_get_member/record` | POST | `api_token`, `api_verno=1` | 同`basic`类似，战绩数据 | ❌ | ❌ | ✅ 战绩记录 | ⭐ 同上 |
| `/api_get_member/questlist` | POST | `api_token`, `api_verno=1`, `api_page_no`(页码) | `api_data` = {`api_count`(总数),`api_page_count`(页数),`api_list[]`(任务数组，含`api_no`(任务ID),`api_category`(类别),`api_type`(类型),`api_state`(状态),`api_progress_flag`(进度))} | ❌ | ❌ | ✅ 任务追踪 | ⭐ 任务报酬关联 |
| `/api_get_member/slotitem` | POST | `api_token`, `api_verno=1` | `api_data[]` = 装备数组，含`api_id`(装备实例ID),`api_slotitem_id`(装备图鉴ID),`api_level`(改修星级) | ❌ | ❌ | ✅ 装备持有 | ⭐ 装备状态 |
| `/api_get_member/useitem` | POST | `api_token`, `api_verno=1` | `api_data[]` = 消耗道具数组 | ❌ | ❌ | ❌ | ⭐ 道具数量 |
| `/api_get_member/furniture` | POST | `api_token`, `api_verno=1` | `api_data[]` = 家具数组 | ❌ | ❌ | ❌ | ⭐ 家具币消耗关联 |
| `/api_get_member/actionlog` | POST | `api_token`, `api_verno=1` | `api_data[]` = 行动日志数组 | ❌ | ❌ | ❌ | ⭐ 日志记录 |
| `/api_get_member/payitem` | POST | `api_token`, `api_verno=1` | `api_data[]` = 课金道具数组 | ❌ | ❌ | ❌ | ⭐ 课金记录 |
| `/api_get_member/practice` | POST | `api_token`, `api_verno=1` | `api_data[]` = 演习对手数组 | ❌ | ❌ | ✅ 演习列表 | ⭐ 演习关联 |
| `/api_get_member/book2` | POST | `api_token`, `api_verno=1`, `api_type`(类别), `api_no`(页码) | `api_data` = 图鉴数据 | ❌ | ❌ | ❌ | ⭐ 图鉴解锁 |

### 2.2 母港综合数据（api_port/port）

> **重要**：2014年4月23日维护后，`api_port/port` 合并了多个 `api_get_member/*` API的数据。返回母港时调用一次即可获得大量数据。  
> 来源：cite🛠web_search:61#2:~:text=/kcsapi/api_port/port – ユーザーデータの塊。母港表示時に取得される。api_get_memberにあったいくつかのAPIをまとめたもの

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_port/port` | POST | `api_token`, `api_verno=1` | `api_data` = {<br>`api_basic`(司令部数据),<br>`api_deck_port`(舰队数据),<br>`api_log`(母港日志),<br>`api_material`(保有资源),<br>`api_ndock`(入渠数据),<br>`api_ship`(保有舰娘,按id排序)<br>} | ✅ 资源/舰队/入渠来源 | ❌ | ✅ 核心数据来源 | ⭐⭐⭐ **核心：一次调用获取资源+舰队+入渠+舰娘** |

### 2.3 主数据（api_get_master/*）

> 主数据为静态配置，通常登录时一次性获取，缓存即可。

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_get_master/ship` | POST | `api_token`, `api_verno=1` | `api_data[]` = 舰娘主数据数组，含`api_id`(图鉴ID),`api_name`(名称),`api_yomi`(读音),`api_stype`(舰种ID),`api_aftershipid`(改造后图鉴ID),`api_afterlv`(改造等级),`api_taik[]`(HP),`api_souk[]`(装甲),`api_houg[]`(火力),`api_raig[]`(雷装),`api_tyku[]`(对空),`api_luck[]`(运),`api_soku`(速力),`api_leng`(射程),`api_slot_num`(搭载槽数),`api_maxeq[]`(最大搭载数) | ✅ 舰娘参数参考 | ❌ | ✅ 舰娘数据库 | ⭐ 舰娘识别 |
| `/api_get_master/slotitem` | POST | `api_token`, `api_verno=1` | `api_data[]` = 装备主数据数组，含`api_id`(图鉴ID),`api_name`(名称),`api_type[]`(类型),`api_houg`(火力),`api_raig`(雷装),`api_baku`(爆装),`api_tyku`(对空),`api_souk`(装甲),`api_houm`(命中),`api_houk`(回避),`api_saku`(索敌),`api_leng`(射程) | ✅ 装备参数 | ❌ | ✅ 装备数据库 | ⭐ 装备识别 |
| `/api_get_master/stype` | POST | `api_token`, `api_verno=1` | `api_data[]` = 舰种数组，含`api_id`(舰种ID),`api_name`(舰种名),`api_sortno`(排序号) | ❌ | ❌ | ✅ 舰种翻译 | ⭐ 舰种分类 |
| `/api_get_master/mission` | POST | `api_token`, `api_verno=1`, `api_maparea_id`(海域ID) | `api_data[]` = 远征主数据数组，含`api_id`(远征ID),`api_name`(名称),`api_details`(详情),`api_time`(所需时间分钟),`api_difficulty`(难度),`api_use_fuel`/`api_use_bull`(消耗油弹),`api_win_item1`/`api_win_item2`(奖励道具),`api_return_flag`(归来标记) | ✅ 远征信息 | ❌ | ✅ 远征数据库 | ⭐⭐ 远征收益基准 |
| `/api_get_master/mapinfo` | POST | `api_token`, `api_verno=1` | `api_data[]` = 地图信息数组，含`api_id`(地图ID),`api_maparea_id`(海域ID),`api_no`(地图编号),`api_name`(名称),`api_level`(等级),`api_opetext`(作战名),`api_infotext`(情报),`api_item`/`api_max_maphp`/`api_required_defeat_count`(血条相关) | ❌ | ❌ | ✅ 地图数据库 | ⭐⭐ 出击地图关联 |
| `/api_get_master/mapcell` | POST | `api_token`, `api_verno=1`, `api_maparea_id`, `api_mapinfo_no` | `api_data[]` = 地图节点数组，含`api_id`(节点ID),`api_no`(节点编号),`api_color_no`(节点颜色),`api_passed`(是否通过) | ❌ | ❌ | ✅ 节点数据库 | ⭐ 节点识别 |
| `/api_get_master/maparea` | POST | `api_token`, `api_verno=1` | `api_data[]` = 海域数组，含`api_id`(海域ID),`api_name`(名称) | ❌ | ❌ | ✅ 海域数据库 | ⭐ 海域识别 |
| `/api_get_master/furniture` | POST | `api_token`, `api_verno=1` | `api_data[]` = 家具主数据 | ❌ | ❌ | ❌ | ⭐ 家具 |
| `/api_get_master/useitem` | POST | `api_token`, `api_verno=1` | `api_data[]` = 消耗道具主数据 | ❌ | ❌ | ❌ | ⭐ 道具 |
| `/api_get_master/payitem` | POST | `api_token`, `api_verno=1` | `api_data[]` = 课金道具主数据 | ❌ | ❌ | ❌ | ⭐ 课金 |

### 2.4 启动数据

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_start2` | POST | `api_token`, `api_verno=1` | 超大JSON，包含所有主数据：`api_mst_ship`(舰娘),`api_mst_slotitem`(装备),`api_mst_stype`(舰种),`api_mst_maparea`(海域),`api_mst_mapinfo`(地图),`api_mst_mission`(远征),`api_mst_useitem`(道具),`api_mst_furniture`(家具),`api_mst_payitem`(课金道具),`api_mst_shipupgrade`(改造条件),`api_mst_item_shop`(道具商店)等 | ❌ | ❌ | ✅ 启动时缓存 | ⭐ 主数据缓存 |

---

## 三、操作请求类 API（api_req_*）

### 3.1 建造/开发/解体（api_req_kousyou/*）

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_req_kousyou/createship` | POST | `api_token`, `api_verno=1`, `api_large_flag`(0/1大建), `api_highspeed`(0/1高速), `api_kdock_id`(渠ID), `api_item1`(燃料), `api_item2`(弹药), `api_item3`(钢材), `api_item4`(铝土), `api_item5`(固定1) | `api_data` = {`api_kdock[]`(建造渠更新数据)} | ✅ 建造日志CSV来源 | ❌ | ✅ 建造记录 | ⭐⭐⭐ **核心：建造投入资源** |
| `/api_req_kousyou/getship` | POST | `api_token`, `api_verno=1`, `api_kdock_id`(渠ID) | `api_data` = {`api_id`(新舰`api_id`),`api_ship_id`(图鉴ID),`api_kdock[]`(建造渠更新)} | ✅ 建造出货记录 | ❌ | ✅ 建造完成 | ⭐⭐⭐ **核心：建造产出舰娘** |
| `/api_req_kousyou/createship_speedchange` | POST | `api_token`, `api_verno=1`, `api_highspeed=1`, `api_kdock_id`(渠ID) | `api_data` = {`api_result`, `api_highspeed`} | ✅ 喷火消耗 | ❌ | ✅ 高速建造 | ⭐⭐ 喷火消耗 |
| `/api_req_kousyou/createitem` | POST | `api_token`, `api_verno=1`, `api_item1`(燃料), `api_item2`(弹药), `api_item3`(钢材), `api_item4`(铝土) | `api_data` = {`api_create_flag`(1=成功),`api_slotitem`(出货装备数据),`api_type3`(装备类型),`api_fdata`(失败数据?)} | ✅ 开发日志CSV来源 | ❌ | ✅ 开发记录 | ⭐⭐⭐ **核心：开发投入与产出** |
| `/api_req_kousyou/destroyship` | POST | `api_token`, `api_verno=1`, `api_ship_id`(解体舰`api_id`) | `api_data` = {`api_material[]`(回收资源数组,[燃料,弹药,钢材,铝土])} | ✅ 解体废弃日志CSV来源 | ❌ | ✅ 解体记录 | ⭐⭐⭐ **核心：解体回收资源** |
| `/api_req_kousyou/destroyitem2` | POST | `api_token`, `api_verno=1`, `api_slotitem_ids`(废弃装备实例ID,逗号分隔) | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ 装备废弃 |
| `/api_req_kousyou/kdock` | POST | `api_token`, `api_verno=1` | `api_data[]` = 建造渠数组 | ❌ | ❌ | ✅ 建造渠刷新 | ⭐ 建造状态 |
| `/api_req_kousyou/open_new_dock` | POST | `api_token`, `api_verno=1` | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ 开渠 |

### 3.2 入渠（api_req_nyukyo/*）

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_req_nyukyo/start` | POST | `api_token`, `api_verno=1`, `api_highspeed`(0/1), `api_ndock_id`(渠ID), `api_ship_id`(入渠舰`api_id`) | `api_data` = {} | ✅ 入渠计时器 | ❌ | ✅ 入渠记录 | ⭐⭐ 入渠消耗 |
| `/api_req_nyukyo/speedchange` | POST | `api_token`, `api_verno=1`, `api_ndock_id`(渠ID) | `api_data` = {} | ✅ 桶消耗 | ❌ | ✅ 高速修复 | ⭐⭐ 桶消耗 |
| `/api_req_nyukyo/open_new_dock` | POST | `api_token`, `api_verno=1` | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ 开渠 |
| `/api_req_nyukyo/getship` | POST | `api_token`, `api_verno=1`, `api_ndock_id`(渠ID) | `api_data` = {} | ❌ | ❌ | ✅ 入渠完成 | ⭐ 入渠完成 |

### 3.3 补给（api_req_hokyu/*）

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_req_hokyu/charge` | POST | `api_token`, `api_verno=1`, `api_id_items`(补给舰`api_id`,逗号分隔), `api_kind`(补给模式:1=燃料+弹药,2=航空机) | `api_data` = {`api_material[]`(补给后资源),`api_ship[]`(补给后舰娘数据)} | ❌ | ❌ | ✅ 补给记录 | ⭐⭐ **核心：补给消耗** |

### 3.4 装备变更（api_req_kaisou/*）

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_req_kaisou/slotset` | POST | `api_token`, `api_verno=1`, `api_id`(舰娘`api_id`), `api_item_id`(装备实例ID,-1=卸下), `api_slot_idx`(槽位0~4) | `api_data` = {} | ❌ | ❌ | ✅ 装备变更 | ⭐ 装备流转 |
| `/api_req_kaisou/slotset_ex` | POST | 同上，扩展槽位 | `api_data` = {} | ❌ | ❌ | ✅ 装备变更 | ⭐ 同上 |
| `/api_req_kaisou/remodeling` | POST | `api_token`, `api_verno=1`, `api_id`(改造舰`api_id`) | `api_data` = {} | ❌ | ❌ | ✅ 改造记录 | ⭐⭐ 改造消耗 |
| `/api_req_kaisou/powerup` | POST | `api_token`, `api_verno=1`, `api_id`(强化舰`api_id`), `api_id_items`(素材舰`api_id`,逗号分隔) | `api_data` = {`api_powerup_flag`(1=成功),`api_ship`(强化后舰娘数据)} | ❌ | ❌ | ✅ 近代化改修 | ⭐ 素材消耗 |

### 3.5 出击/战斗（api_req_sortie/* & api_req_combined_battle/* & api_req_battle_midnight/*）

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_req_map/start` | POST | `api_token`, `api_verno=1`, `api_maparea_id`(海域ID), `api_mapinfo_no`(地图ID), `api_deck_id`(舰队ID), `api_formation_id`(阵形) | `api_data` = {`api_cell_data`(节点数据),`api_rashin_flg`(罗盘?),`api_rashin_id`(罗盘ID),`api_maparea_id`,`api_mapinfo_no`,`api_no`(节点编号),`api_event_id`(事件ID),`api_event_kind`(事件类型),`api_next`(是否有下一个节点),`api_bosscell_no`(Boss节点),`api_bosscomp`(Boss是否击破)} | ✅ 出击记录 | ❌ | ✅ 出击开始 | ⭐⭐ **核心：出击消耗推算** |
| `/api_req_map/next` | POST | `api_token`, `api_verno=1` | 同`start`，进击到下一个节点 | ✅ 进击记录 | ❌ | ✅ 进击 | ⭐⭐ 节点推进 |
| `/api_req_sortie/battle` | POST | `api_token`, `api_verno=1`, `api_formation`(阵形) | `api_data` = 超大JSON，含`api_dock_id`(我方舰队),`api_ship_ke[]`(敌方舰图鉴ID),`api_ship_lv[]`(敌方等级),`api_e_maxhps[]`/`api_e_nowhps[]`(敌方HP),`api_formation`(双方阵形),`api_kouku`(航空战),`api_opening_atack`(开幕雷击),`api_hougeki[]`(炮击战),`api_raigeki`(雷击战),`api_midnight_flg`(是否有夜战) | ❌ | ❌ | ✅ 战斗详细 | ⭐ 战斗过程 |
| `/api_req_sortie/battleresult` | POST | `api_token`, `api_verno=1` | `api_data` = {`api_ship_id[]`(敌方舰图鉴ID),`api_win_rank`(战果S/A/B/C/D),`api_get_exp`(获得经验),`api_mvp`(MVP位置),`api_get_ship_id`(掉落舰图鉴ID),`api_get_ship_exp`(各舰经验),`api_get_exp_lvup`(升级信息),`api_dests`(击沉数),`api_destsf`(旗舰击沉?),`api_quest_name`(海域名),`api_quest_level`(海域等级),`api_enemy_info`(敌方信息),`api_first_clear`(首次通关),`api_mapcell_incentive`(节点奖励),`api_get_eventflag`(活动标记),`api_get_exmap_rate`(活动血条?),`api_get_exmap_useitem_id`(活动道具)} | ✅ 海战掉落报告书CSV来源 | ❌ | ✅ 战斗结果 | ⭐⭐⭐ **核心：战斗结果+掉落** |
| `/api_req_battle_midnight/battle` | POST | `api_token`, `api_verno=1` | `api_data` = 夜战详细数据 | ❌ | ❌ | ✅ 夜战 | ⭐ 夜战过程 |
| `/api_req_battle_midnight/sp_midnight` | POST | `api_token`, `api_verno=1`, `api_formation`(阵形) | `api_data` = 夜战突入数据 | ❌ | ❌ | ✅ 夜战突入 | ⭐ 夜战 |
| `/api_req_sortie/night_to_day` | POST | `api_token`, `api_verno=1`, `api_formation`(阵形) | `api_data` = 昼战移行数据 | ❌ | ❌ | ✅ 夜转昼 | ⭐ 战斗 |
| `/api_req_combined_battle/battle` | POST | `api_token`, `api_verno=1`, `api_formation`(阵形) | `api_data` = 联合舰队战斗数据 | ❌ | ❌ | ✅ 联合舰队战 | ⭐ 联合舰队 |
| `/api_req_combined_battle/battleresult` | POST | `api_token`, `api_verno=1` | `api_data` = 联合舰队战果 | ❌ | ❌ | ✅ 联合舰队结果 | ⭐⭐ 联合舰队掉落 |
| `/api_req_combined_battle/midnight_battle` | POST | `api_token`, `api_verno=1` | `api_data` = 联合舰队夜战 | ❌ | ❌ | ✅ 联合舰队夜战 | ⭐ 联合舰队 |
| `/api_req_combined_battle/sp_midnight` | POST | `api_token`, `api_verno=1`, `api_formation`(阵形) | `api_data` = 联合舰队夜战突入 | ❌ | ❌ | ✅ 联合舰队夜突 | ⭐ 联合舰队 |
| `/api_req_combined_battle/airbattle` | POST | `api_token`, `api_verno=1`, `api_formation`(阵形) | `api_data` = 联合舰队航空战 | ❌ | ❌ | ✅ 联合舰队空战 | ⭐ 联合舰队 |
| `/api_req_combined_battle/ld_airbattle` | POST | `api_token`, `api_verno=1`, `api_formation`(阵形) | `api_data` = 联合舰队基地航空战 | ❌ | ❌ | ✅ 基地航空队 | ⭐ 基地航空 |
| `/api_req_combined_battle/ec_battle` | POST | `api_token`, `api_verno=1`, `api_formation`(阵形) | `api_data` = 联合舰队EC战斗 | ❌ | ❌ | ✅ EC战斗 | ⭐ 联合舰队 |
| `/api_req_combined_battle/ec_midnight_battle` | POST | `api_token`, `api_verno=1` | `api_data` = 联合舰队EC夜战 | ❌ | ❌ | ✅ EC夜战 | ⭐ 联合舰队 |
| `/api_req_combined_battle/ec_night_to_day` | POST | `api_token`, `api_verno=1`, `api_formation`(阵形) | `api_data` = EC夜转昼 | ❌ | ❌ | ✅ EC夜转昼 | ⭐ 联合舰队 |

### 3.6 演习（api_req_practice/*）

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_req_practice/battle` | POST | `api_token`, `api_verno=1`, `api_deck_id`(我方舰队), `api_enemy_id`(对手ID), `api_formation_id`(阵形) | `api_data` = 演习战斗数据 | ❌ | ❌ | ✅ 演习战斗 | ⭐ 演习 |
| `/api_req_practice/midnight_battle` | POST | `api_token`, `api_verno=1`, `api_deck_id`, `api_formation_id`, `api_enemy_id` | `api_data` = 演习夜战数据 | ❌ | ❌ | ✅ 演习夜战 | ⭐ 演习 |
| `/api_req_practice/battle_result` | POST | `api_token`, `api_verno=1` | `api_data` = {`api_ship_id[]`,`api_win_rank`,`api_get_exp`,`api_mvp`,`api_enemy_info`,`api_dests`,`api_destsf`,`api_first_clear`} | ❌ | ❌ | ✅ 演习结果 | ⭐ 演习结果 |

### 3.7 远征（api_req_mission/*）

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_req_mission/start` | POST | `api_token`, `api_verno=1`, `api_mission_id`(远征ID), `api_deck_id`(舰队ID) | `api_data` = {`api_complatetime`(完成时间戳),`api_complatetime_str`(完成时间字符串)} | ✅ 远征开始 | ❌ | ✅ 远征派遣 | ⭐⭐ 远征派遣 |
| `/api_req_mission/result` | POST | `api_token`, `api_verno=1`, `api_deck_id`(舰队ID) | `api_data` = {`api_ship_id[]`(舰队舰娘),`api_clear_result`(0=失败,1=成功,2=大成功),`api_get_exp`(提督经验),`api_member_lv`(提督等级),`api_member_exp`(提督经验),`api_get_ship_exp[]`(各舰经验),`api_get_exp_lvup[]`(升级信息),`api_material[]`([燃料,弹药,钢材,铝土,桶,喷火,开发资材,螺丝]),`api_useitem_flag[]`(道具获得标记)} | ✅ 远征日志CSV来源 | ❌ | ✅ 远征结果 | ⭐⭐⭐ **核心：远征收益** |

### 3.8 任务（api_req_quest/*）

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_req_quest/start` | POST | `api_token`, `api_verno=1`, `api_quest_id`(任务ID) | `api_data` = {} | ❌ | ❌ | ✅ 任务开始 | ⭐ 任务 |
| `/api_req_quest/stop` | POST | `api_token`, `api_verno=1`, `api_quest_id`(任务ID) | `api_data` = {} | ❌ | ❌ | ✅ 任务停止 | ⭐ 任务 |
| `/api_req_quest/clearitemget` | POST | `api_token`, `api_verno=1`, `api_quest_id`(任务ID) | `api_data` = {`api_material[]`(奖励资源),`api_bounus_count`(奖励数),`api_bounus[]`(奖励详情)} | ❌ | ❌ | ✅ 任务报酬 | ⭐⭐ **核心：任务资源奖励** |

### 3.9 舰队编成（api_req_hensei/*）

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_req_hensei/change` | POST | `api_token`, `api_verno=1`, `api_id`(舰队ID), `api_ship_idx`(位置0~5), `api_ship_id`(舰娘`api_id`,-1=移除) | `api_data` = {} | ❌ | ❌ | ✅ 编成变更 | ⭐ 舰队编成 |
| `/api_req_hensei/lock` | POST | `api_token`, `api_verno=1`, `api_ship_id`(舰娘`api_id`) | `api_data` = {} | ❌ | ❌ | ✅ 锁定变更 | ⭐ 锁定状态 |
| `/api_req_hensei/combined` | POST | `api_token`, `api_verno=1`, `api_combined_type`(0=解除,1=水上,2=机动) | `api_data` = {} | ❌ | ❌ | ✅ 联合舰队编成 | ⭐ 联合舰队 |

### 3.10 家具（api_req_furniture/*）

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_req_furniture/buy` | POST | `api_token`, `api_verno=1`, `api_type`(类型), `api_no`(编号) | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ 家具币消耗 |
| `/api_req_furniture/change` | POST | `api_token`, `api_verno=1`, `api_floor`(地板), `api_wallpaper`(壁纸), `api_window`(窗户), `api_wallhanging`(壁挂), `api_shelf`(架子), `api_desk`(桌子) | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ 家具 |

### 3.11 成员相关（api_req_member/*）

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_req_member/getothersdeck` | POST | `api_token`, `api_verno=1`, `api_member_id`(对手用户ID) | `api_data` = {对手舰队数据} | ❌ | ❌ | ✅ 演习对手 | ⭐ 演习 |
| `/api_req_member/updatedeckname` | POST | `api_token`, `api_name`(舰队名), `api_name_id`, `api_deck_id` | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ |
| `/api_req_member/updatecomment` | POST | `api_token`, `api_verno=1`, `api_cmt`(签名), `api_cmt_id` | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ |
| `/api_req_member/update_tutorial_progress` | POST | `api_token`, `api_verno=1`, `api_no`(进度) | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ |
| `/api_req_member/itemuse` | POST | `api_token`, `api_verno=1`, `api_useitem_id`(道具ID) | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ 道具使用 |
| `/api_req_member/itemuse_cond` | POST | `api_token`, `api_verno=1`, `api_deck_id`, `api_useitem_id=54`(间宫) | `api_data` = {} | ✅ 间宫使用 | ❌ | ❌ | ⭐ 间宫消耗 |
| `/api_req_member/payitemuse` | POST | `api_token`, `api_verno=1`, `api_payitem_id` | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ 课金道具 |
| `/api_req_member/get_incentive` | POST | `api_token`, `api_verno=1` | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ 奖励 |

### 3.12 认证/初始化

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_auth_member/logincheck` | POST | `api_token`, `api_verno=1` | `api_data` = {`api_world_id`(服务器ID),`api_nickname`(昵称),`api_count`(?)等} | ❌ | ❌ | ❌ | ⭐ 登录检查 |
| `/api_auth_member/dmmlogin/{viewerInfo.id}/1/{timestamp}` | GET | URL路径参数 | 重定向到游戏 | ❌ | ❌ | ❌ | ⭐ 认证 |
| `/api_req_init/nickname` | POST | `api_token`, `api_verno=1`, `api_nickname`(昵称), `api_nickname_id` | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ 初始化 |
| `/api_req_init/firstship` | POST | `api_token`, `api_verno=1`, `api_ship_id`(初始舰ID) | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ 初始化 |
| `/api_world/get_worldinfo` | POST | `api_verno=1`, `api_dmmuser_id` | `api_data[]` = 服务器数组 | ❌ | ❌ | ❌ | ⭐ 服务器 |
| `/api_world/register` | POST | `api_verno=1`, `api_dmmuser_id`, `api_world_id`, `api_register_id` | `api_data` = {} | ❌ | ❌ | ❌ | ⭐ 服务器注册 |

### 3.13 排名

| 端点 | 方法 | 请求参数 | 返回数据关键字段 | 航海日誌 | KancolleSniffer | KC3改 | 资源会计价值 |
|------|------|---------|-----------------|:--------:|:-------------:|:-----:|:------------:|
| `/api_req_ranking/getlist` | POST | `api_token`, `api_verno=1` | `api_data[]` = 排名数组 | ❌ | ❌ | ❌ | ⭐ 排名 |

---

## 四、三个项目对API的使用差异

| 维度 | 航海日誌拡張版 | KancolleSniffer | KC3改 |
|------|--------------|----------------|------|
| **核心拦截方式** | Java代理中继 | C#代理中继 | Chrome扩展 `chrome.webRequest` |
| **数据持久化** | 本地CSV/dat文件 | 本地CSV文件 | 浏览器IndexedDB |
| **资源记录策略** | 从`api_port/port`和`api_get_member/material`提取绝对值快照，写入`資材ログ.csv` | 从`api_port/port`提取当前值显示，不记录历史 | 从`api_port/port`提取绝对值快照，写入IndexedDB `resource`表 |
| **建造记录策略** | 从`createship`请求参数读取投入，从`getship`响应读取产出，写入`建造・開発・遠征日志.csv` | 不记录 | 从`createship`和`getship`读取，写入IndexedDB |
| **战斗记录策略** | 从`battleresult`读取战果/掉落，写入`海戦・ドロップ報告書.csv`；从`battle`读取详细过程，写入`battlelog/日付.dat` | 不记录历史 | 从`battleresult`读取结果，从`battle`读取详细过程，写入IndexedDB `sortie`+`battle`表 |
| **远征记录策略** | 从`mission/result`读取收益，写入`建造・開発・遠征日志.csv` | 不记录 | 从`mission/result`读取，写入IndexedDB `exped`表 |
| **解体记录策略** | 从`destroyship`响应读取回收资源，写入`解体・廃棄ログ.csv` | 不记录 | 不专门记录 |
| **补给记录策略** | 不专门记录 | 不记录 | 从`hokyu/charge`读取，可能记录 |
| **入渠记录策略** | 从`ndock`读取计时，从`nyukyo/start`读取消耗 | 从`ndock`读取计时显示 | 从`ndock`读取状态 |
| **装备变更策略** | 不专门记录 | 不记录 | 从`kaisou/slotset`读取 |
| **任务策略** | 不专门记录 | 不记录 | 从`questlist`读取，Strategy Room展示 |

---

## 五、对资源会计系统的API拦截优先级

| 优先级 | API端点 | 原因 |
|:------:|---------|------|
| **P0** | `api_req_kousyou/createship` | 建造投入资源 |
| **P0** | `api_req_kousyou/getship` | 建造产出舰娘 |
| **P0** | `api_req_kousyou/createitem` | 开发投入与产出 |
| **P0** | `api_req_kousyou/destroyship` | 解体回收资源 |
| **P0** | `api_req_mission/result` | 远征收益 |
| **P0** | `api_req_hokyu/charge` | 补给消耗 |
| **P0** | `api_req_nyukyo/start` | 入渠消耗 |
| **P0** | `api_req_nyukyo/speedchange` | 高速修复桶消耗 |
| **P0** | `api_req_sortie/battleresult` | 战斗结果与掉落 |
| **P0** | `api_req_combined_battle/battleresult` | 联合舰队战斗结果 |
| **P1** | `api_port/port` | 综合数据（含资源快照） |
| **P1** | `api_get_member/material` | 资源快照（备用） |
| **P1** | `api_req_map/start` | 出击开始（推算消耗） |
| **P1** | `api_req_quest/clearitemget` | 任务资源奖励 |
| **P2** | `api_get_member/ship` / `ship2` / `ship3` | 舰娘状态（上下文） |
| **P2** | `api_get_member/deck` / `deck_port` | 舰队编成（上下文） |
| **P2** | `api_get_member/ndock` | 入渠状态（上下文） |
| **P2** | `api_get_member/kdock` | 建造状态（上下文） |
| **P2** | `api_get_member/basic` | 提督信息（上下文） |
| **P3** | 其他所有API | 低优先级或无关 |

---

## 六、关键API返回数据结构详解

### 6.1 `api_port/port` 返回结构（核心）

```json
{
  "api_result": 1,
  "api_result_msg": "成功",
  "api_data": {
    "api_basic": {
      "api_member_id": 12345,
      "api_nickname": "提督名",
      "api_nickname_id": "12345678",
      "api_active_flag": 1,
      "api_starttime": 1400000000000,
      "api_level": 120,
      "api_rank": 5,
      "api_experience": 9999999,
      "api_fleetname": null,
      "api_comment": "",
      "api_comment_id": "",
      "api_max_chara": 300,
      "api_max_slotitem": 1500,
      "api_max_kagu": 0,
      "api_playtime": 0,
      "api_tutorial": 100,
      "api_furniture": [1,1,1,1,1,1],
      "api_count_deck": 4,
      "api_count_kdock": 4,
      "api_count_ndock": 4,
      "api_fcoin": 5000,
      "api_st_win": 5000,
      "api_st_lose": 200,
      "api_ms_count": 100,
      "api_ms_success": 95,
      "api_pt_win": 500,
      "api_pt_lose": 50,
      "api_pt_challenged": 550,
      "api_pt_challenged_win": 400,
      "api_firstflag": 1,
      "api_tutorial_progress": 100,
      "api_pvp": [0,0],
      "api_medals": 5
    },
    "api_deck_port": [
      {
        "api_id": 1,
        "api_name": "第一艦隊",
        "api_name_id": "1234",
        "api_mission": [0,0,0,0],
        "api_flagship": "0",
        "api_ship": [123,456,789,0,0,0]
      }
    ],
    "api_log": [
      {
        "api_no": 1,
        "api_type": "1",
        "api_state": "0",
        "api_message": "母港に帰還しました"
      }
    ],
    "api_material": [
      {"api_id": 1, "api_value": 125000},
      {"api_id": 2, "api_value": 98000},
      {"api_id": 3, "api_value": 150000},
      {"api_id": 4, "api_value": 82000},
      {"api_id": 5, "api_value": 2450},
      {"api_id": 6, "api_value": 1890},
      {"api_id": 7, "api_value": 3200},
      {"api_id": 8, "api_value": 450}
    ],
    "api_ndock": [
      {
        "api_id": 1,
        "api_state": 1,
        "api_ship_id": 123,
        "api_complete_time": 1234567890000,
        "api_complete_time_str": "2026-08-09 12:34:56",
        "api_item1": 100,
        "api_item2": 50,
        "api_item3": 200
      }
    ],
    "api_ship": [
      {
        "api_id": 123,
        "api_ship_id": 161,
        "api_lv": 45,
        "api_exp": [349951,350000,49],
        "api_nowhp": 96,
        "api_maxhp": 96,
        "api_cond": 49,
        "api_kyouka": [0,0,0,0,0,0,0],
        "api_slot": [456,789,101,0,0],
        "api_onslot": [7,7,7,0,0],
        "api_slot_ex": 0,
        "api_sally_area": 0
      }
    ]
  }
}
```

### 6.2 `api_req_mission/result` 返回结构（远征收益）

```json
{
  "api_result": 1,
  "api_result_msg": "成功",
  "api_data": {
    "api_ship_id": [123,456,789,0,0,0],
    "api_clear_result": 2,
    "api_get_exp": 100,
    "api_member_lv": 120,
    "api_member_exp": 9999999,
    "api_get_ship_exp": [100,100,100,0,0,0],
    "api_get_exp_lvup": [[100,200],[100,200],[100,200],[0,0],[0,0],[0,0]],
    "api_material": [420,0,0,800,0,0,0,0],
    "api_useitem_flag": [0,0]
  }
}
```

### 6.3 `api_req_kousyou/destroyship` 返回结构（解体回收）

```json
{
  "api_result": 1,
  "api_result_msg": "成功",
  "api_data": {
    "api_material": [8,12,24,4]
  }
}
```

### 6.4 `api_req_sortie/battleresult` 返回结构（战斗结果）

```json
{
  "api_result": 1,
  "api_result_msg": "成功",
  "api_data": {
    "api_ship_id": [501,502,503,504,505,506],
    "api_ship_type": "敵主力艦隊",
    "api_win_rank": "S",
    "api_get_exp": 720,
    "api_mvp": 1,
    "api_get_ship_id": 161,
    "api_get_ship_exp": [720,480,480,480,480,480],
    "api_get_exp_lvup": [[349951,350000],[100,200],[100,200],[100,200],[100,200],[100,200]],
    "api_dests": 6,
    "api_destsf": 1,
    "api_quest_name": "鎮守府海域",
    "api_quest_level": 1,
    "api_enemy_info": {
      "api_level": "",
      "api_rank": "",
      "api_deck_name": "敵主力艦隊"
    },
    "api_first_clear": 0,
    "api_mapcell_incentive": 0,
    "api_get_eventflag": 0,
    "api_get_exmap_rate": 0,
    "api_get_exmap_useitem_id": 0
  }
}
```

### 6.5 `api_get_member/material` 返回结构（资源快照）

```json
{
  "api_result": 1,
  "api_result_msg": "成功",
  "api_data": [
    {"api_id": 1, "api_value": 125000},
    {"api_id": 2, "api_value": 98000},
    {"api_id": 3, "api_value": 150000},
    {"api_id": 4, "api_value": 82000},
    {"api_id": 5, "api_value": 2450},
    {"api_id": 6, "api_value": 1890},
    {"api_id": 7, "api_value": 3200},
    {"api_id": 8, "api_value": 450}
  ]
}
```

### 6.6 `api_get_member/ship` 返回结构（舰娘详情）

```json
{
  "api_result": 1,
  "api_result_msg": "成功",
  "api_data": [
    {
      "api_id": 123,
      "api_sortno": 1,
      "api_ship_id": 161,
      "api_lv": 45,
      "api_exp": [349951,350000,49],
      "api_nowhp": 96,
      "api_maxhp": 96,
      "api_soku": 5,
      "api_leng": 4,
      "api_slot": [456,789,101,0,0],
      "api_onslot": [7,7,7,0,0],
      "api_slot_ex": 0,
      "api_kyouka": [0,0,0,0,0,0,0],
      "api_backs": 8,
      "api_fuel": 100,
      "api_bull": 100,
      "api_slotnum": 4,
      "api_ndock_time": 0,
      "api_ndock_item": [0,0,0],
      "api_sally_area": 0,
      "api_sally_flag": 0,
      "api_cond": 49
    }
  ]
}
```

---

## 七、索引来源

| 来源 | URL | 内容 |
|------|-----|------|
| 艦これAPIリスト（完整版） | gist.github.com/84c3f78caa6fff3354fa | cite🛠web_search:60#3 全API端点列表 |
| 艦これAPIを叩く（GitBook） | np-complete.gitbook.io/c86-kancolle-api | cite🛠web_search:60#1 API概览与数据获取说明 |
| 2014/04/23 API变更メモ | cat-ears.net | cite🛠web_search:61#2 `api_port/port`合并说明 |
| kancolle API Gist | gist.github.com/hatashiro/8130073 | cite🛠web_search:60#9 API端点列表 |
| kancolle API Gist (7399829) | gist.github.com/7399829 | cite🛠web_search:60#2 API端点与说明 |
| KC3改 GitHub | github.com/KC3Kai/KC3Kai | cite🛠web_search:36#0 IndexedDB表结构 |
| 航海日誌拡張版（nekopanda） | github.com/nekopanda/logbook | cite🛠web_search:39#0~#3 CSV输出与功能说明 |
| 航海日誌拡張版（Nishisonic） | github.com/Nishisonic/logbook | cite🛠web_search:2#3 继续版维护 |
| KancolleSniffer | github.com/fujieda/KancolleSniffer | cite🛠web_search:37#0 功能说明 |
| KancolleSniffer功能Gist | gist.github.com/fujieda/11164531 | cite🛠web_search:45#8 详细功能列表 |

---

*文档生成时间：2026-08-09*  
*用途：供其他Agent快速理解舰C API体系，无需重复搜索*  
*覆盖端点：~70个*  
*覆盖项目：航海日誌拡張版、KancolleSniffer、KC3改*
