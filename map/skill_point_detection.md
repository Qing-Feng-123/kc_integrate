# Skill: 游戏地图点位自动识别

## 概述
从游戏地图 PNG 图像中自动识别各点位（节点）的精确像素坐标，用于后续 SVG 叠加层或路径规划。

## 输入
- 一张游戏地图 PNG 图像（含 RGBA 通道）
- 地图中点位以不同颜色区分（如绿色=起始点、红色=战斗点、青色=资源点）

## 输出
- 各点位的精确像素坐标 `(x, y)`
- 坐标系：左上角为原点 `(0,0)`，X 向右，Y 向下

## 核心步骤

### 1. 颜色阈值分割
根据点位的典型颜色特征，分别提取不同颜色的像素掩码：

| 颜色类型 | R 条件 | G 条件 | B 条件 |
|:---|:---|:---|:---|
| 绿色 | 50 < R < 180 | G > 150 | B < 80 |
| 红色 | R > 150 | G < 120 | B < 120 |
| 青色 | R < 100 | G > 150 | B > 150 |

```python
# 示例：绿色掩码
green_mask = (g > 150) & (r > 50) & (r < 180) & (b < 80) & (g > r + 30)
```

### 2. 连通区域分析（Connected Components）
对每种颜色的掩码进行连通区域标记，分离独立的点位：

```python
from scipy import ndimage
labeled, num = ndimage.label(green_mask)
```

### 3. 面积过滤
排除面积过小的噪声和路线片段，只保留真正的点位：

```python
for i in range(1, num + 1):
    coords = np.argwhere(labeled == i)
    if len(coords) >= 50:  # 面积阈值
        # 保留该区域
```

### 4. 形状过滤（宽高比）
通过宽高比筛选圆形点位，排除箭头等非圆形干扰：

```python
w = xs.max() - xs.min() + 1
h = ys.max() - ys.min() + 1
aspect = min(w, h) / max(w, h)
if aspect >= 0.85:  # 接近圆形
    # 保留
```

### 5. 距离过滤
排除靠近已知点位的区域（如点位旁的箭头、文字标签）：

```python
def min_dist_to_known(x, y, known_points):
    return min(np.sqrt((x-kx)**2 + (y-ky)**2) for kx, ky in known_points)

if min_dist > 40:  # 远离已知点位
    # 保留
```

### 6. 区域合并
对分裂的点位（如被文字遮挡导致分裂为多个区域），按面积加权平均合并中心：

```python
# 对同一颜色的多个候选区域，按面积加权平均中心
total_area = sum(a for _, _, a in candidates)
cx = sum(x * a for x, _, a in candidates) / total_area
cy = sum(y * a for _, y, a in candidates) / total_area
```

### 7. ROI 放大分析（处理复杂点位）
对于被箭头/文字干扰的点位，放大局部区域进行精细分析：

```python
# 提取 ROI
roi = img[y1:y2, x1:x2]

# 空间分割：只取圆点区域（上半部分），排除箭头（下半部分）
dot_only = (roi_g > 220) & (roi_b > 230) & (Y < 16)

# 排除白色像素干扰
white_mask = (roi_r > 250) & (roi_g > 250) & (roi_b > 250)
dot_only[white_mask] = False

# 取核心区域中心
cx = core_xs.mean()
cy = core_ys.mean()
```

## 验证方法
- 在图像上绘制检测到的中心点，目视检查是否与点位发光体中心对齐
- 对比手动标注坐标，计算平均误差（应 < 10 像素）

## 注意事项
- 不同游戏地图的颜色特征可能不同，需根据实际图像调整阈值
- 半透明发光效果可能导致颜色混合，需适当放宽阈值范围
- 箭头、文字标签等干扰物可能与点位同色，需通过形状/位置过滤排除
