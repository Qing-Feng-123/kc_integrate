# Skill: SVG 地图点位与路线交互叠加层

## 概述
在游戏地图图片上方叠加 SVG 层，实现点位和路线的精确对齐、点击交互、高亮显示及智能路径合并。

## 核心对齐原理

### 1. 容器相对定位 + SVG 绝对覆盖
```css
.map-container {
  position: relative;    /* 建立定位上下文 */
  width: 100%;
  max-width: 900px;
}
.map-container svg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;   /* 让鼠标事件穿透到图片 */
}
```

### 2. viewBox 锁定比例
SVG 的 `viewBox` 必须与图片原始像素尺寸一致：
```html
<svg viewBox="0 0 400 240">  <!-- 图片 400×240 像素 -->
  <!-- cx/cy 直接使用像素坐标，无需转换 -->
</svg>
```
当容器缩放时，SVG 自动按比例缩放，点位始终对齐。

### 3. 图片加载方案（推荐 base64 内嵌）
为避免跨域或网络问题导致底图加载失败，推荐将图片转为 base64 直接内嵌到 HTML 中：
```html
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..." alt="游戏地图">
```
> 优点：完全离线可用，无需外部网络请求，不受 GitHub raw 直链访问限制影响。

## 路线设定

### 4. 圆心到圆心
路线起点和终点直接使用点位的圆心坐标，不做缩进：
```html
<line class="route-line" x1="93" y1="114" x2="108" y2="77" />
```

### 5. 箭头绘制
在终点处绘制箭头两翼：
```javascript
angle = Math.atan2(dy-sy, dx-sx);
a1x = dx - arrowLen * Math.cos(angle - 0.45);
a1y = dy - arrowLen * Math.sin(angle - 0.45);
// 同理计算 a2x, a2y
```

### 6. 透明热区扩大判定
在可见路线下方叠加一条完全透明的宽线，用于接收点击事件：
```html
<line class="route-hit"
      stroke="transparent" stroke-width="12"
      fill="none"
      pointer-events="all"
      cursor="pointer"/>
```

## 交互设定

### 7. 点击高亮（Toggle）
点击添加/移除 `.selected` 类，再次点击取消：
```javascript
function toggleRoute(el) {
  const key = el.dataset.from + '→' + el.dataset.to;
  if (selectedRoutes.has(key)) {
    selectedRoutes.delete(key);
    el.classList.remove('selected');
  } else {
    selectedRoutes.add(key);
    el.classList.add('selected');
  }
}
```

### 8. 路线自动点亮两端点位
选中路线时，自动将起点和终点加入选中集合：
```javascript
if (!selectedPoints.has(from)) {
  selectedPoints.add(from);
  fromEl.classList.add('selected');
}
if (!selectedPoints.has(to)) {
  selectedPoints.add(to);
  toEl.classList.add('selected');
}
```

### 9. 【新增】取消路线时自动取消孤立节点高亮
取消某条路线后，检查该路线的起点和终点是否仍被**其他已选路线**使用。若不再被任何路线包含，则自动取消其高亮状态：
```javascript
function isNodeUsedByRoutes(node) {
  for (const key of selectedRoutes) {
    const [f, t] = key.split('→');
    if (f === node || t === node) return true;
  }
  return false;
}

// 在取消路线的逻辑中：
if (!isNodeUsedByRoutes(from)) {
  selectedPoints.delete(from);
  fromEl.classList.remove('selected');
}
if (!isNodeUsedByRoutes(to)) {
  selectedPoints.delete(to);
  toEl.classList.remove('selected');
}
```
> 示例：全选后取消 `Start→B`，若 B 仍被 `B→C` 或 `B→G` 使用，则 B 保持高亮；Start 不再被任何路线使用，自动取消高亮。

### 10. 点击空白不重置
不给容器绑定点击事件，仅点位和路线元素响应点击。

### 11. 重置按钮
独立按钮调用 `resetAll()` 清除所有选中状态：
```javascript
function resetAll() {
  selectedPoints.clear();
  selectedRoutes.clear();
  document.querySelectorAll('.point-group, .route-group')
    .forEach(g => g.classList.remove('selected'));
}
```

## 智能路径合并

### 12. 算法目标
将选中的多条有向边合并为完整路径。首尾相连的边自动拼接；分叉处拆分为多条独立路径。

### 13. 算法步骤
```javascript
function buildPaths() {
  // 1. 解析边
  const edges = [];
  selectedRoutes.forEach(key => {
    const [from, to] = key.split('→');
    edges.push({ from, to });
  });

  // 2. 构建邻接表和入度统计
  const adj = {}, inDeg = {};
  edges.forEach(e => {
    if (!adj[e.from]) adj[e.from] = [];
    adj[e.from].push(e.to);
    inDeg[e.to] = (inDeg[e.to] || 0) + 1;
  });

  // 3. 找出路径起点：入度为 0 的节点
  const starts = new Set();
  edges.forEach(e => {
    if ((inDeg[e.from] || 0) === 0) starts.add(e.from);
  });

  // 4. 从每个起点 DFS 遍历
  const paths = [];
  function follow(node, path, usedEdges) {
    const nexts = adj[node] || [];
    if (nexts.length === 0) {
      paths.push([...path]);
      return;
    }
    nexts.forEach(next => {
      const edgeKey = node + '→' + next;
      if (usedEdges.has(edgeKey)) return; // 避免环
      const newUsed = new Set(usedEdges);
      newUsed.add(edgeKey);
      follow(next, [...path, next], newUsed);
    });
  }
  starts.forEach(s => follow(s, [s], new Set()));

  // 5. 兜底：无起点时从任意边开始
  if (paths.length === 0 && edges.length > 0) {
    follow(edges[0].from, [edges[0].from], new Set());
  }

  return paths;
}
```

### 14. 关键修复
**不要**把入度 ≥ 2 的汇聚点当作起点：
```javascript
// ❌ 错误：汇聚点 H 会被当作起点，产生独立路径
if (ind === 0 || ind >= 2) starts.add(e.from);

// ✅ 正确：只把入度为 0 的节点作为起点
if (ind === 0) starts.add(e.from);
```

## 下方显示面板

### 15. 分区域显示
- **上半区域**：已选点位，黄色标签芯片
- **下半区域**：已选路线，蓝色路径卡片（显示合并后的完整路径）

### 16. 路径卡片渲染
每个路径卡片显示带颜色圆点的节点序列：
```javascript
path.forEach((node, i) => {
  // 节点圆点
  const dot = document.createElement('span');
  dot.style.background = pointColors[node];
  dot.textContent = node;
  item.appendChild(dot);
  // 箭头（最后一个节点不加）
  if (i < path.length - 1) {
    item.appendChild(document.createTextNode('→'));
  }
});
```

## 样式要点

| 元素 | 默认状态 | 选中状态 | Hover 状态 |
|:---|:---|:---|:---|
| 路线可见线 | `stroke: #111` | `stroke: #fbbf24; stroke-width: 3.5` | `stroke: #fbbf24` |
| 路线箭头 | `stroke: #111` | `stroke: #fbbf24` | `stroke: #fbbf24` |
| 点位指示器 | `opacity: 0` | `opacity: 1; stroke-width: 3` | `opacity: 1` |
| 点位标签 | `opacity: 0` | `opacity: 1` | `opacity: 1` |
| 点位热区 | `fill: transparent` | `fill: rgba(251,191,36,0.12)` | `fill: rgba(255,255,255,0.08)` |

## 当前地图路线配置（示例）

```
Start → B
B → C, G
C → F, G
F → A, J
G → H
H → I, L
I → E, K
J → L, M
K → N, L, O
L → M, P
M → P
```

共 20 条有向边，17 个节点（含 Start 罗盘）。
