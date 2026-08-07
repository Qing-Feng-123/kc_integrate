# kc_integrate 本地访问地址汇总

> 本文档记录 Tampermonkey 脚本在平板 Edge 浏览器上的访问地址及使用方法。

---

## 一、脚本安装地址

### 最新版（v1.2）
```
https://www.tampermonkey.net/script_installation.php#url=https://fastly.jsdelivr.net/gh/Qing-Feng-123/kc_integrate@main/kc_grabber.user.js
```

### 旧版（v1.0 / v1.1）
```
https://www.tampermonkey.net/script_installation.php#url=https://fastly.jsdelivr.net/gh/Qing-Feng-123/kc_integrate@main/test.user.js
```

---

## 二、使用方法

### Step 1：安装 Tampermonkey 扩展
1. 平板 Edge 浏览器 → 地址栏输入 `edge://extensions/`
2. 进入 Microsoft Edge 加载项商店
3. 搜索"篡改猴"（Tampermonkey）并安装

### Step 2：安装脚本
1. 复制上面的"最新版"安装地址
2. 在平板 Edge 地址栏粘贴并访问
3. Tampermonkey 会弹出"即将重新安装用户脚本"对话框
4. 点击"**重新安装**"按钮
5. 安装完成

### Step 3：验证脚本运行
1. 访问 `https://www.dmm.com`
2. 观察页面**右下角**是否出现黑色带绿框的调试面板
3. 面板标题显示 `🐵 舰C拦截测试 v1.2` = 安装成功

---

## 三、更新脚本

当脚本有新版本时，**直接使用同一个安装地址重新访问**，Tampermonkey 会自动覆盖旧版本。

> 注意：jsDelivr CDN 缓存刷新可能需要 5-30 分钟。如果更新后仍显示旧版，请等待后再试。

---

## 四、删除脚本

在 Android Edge 上，Tampermonkey 的脚本管理面板（Dashboard）无法直接访问。删除脚本的唯一方式是：

**卸载整个 Tampermonkey 扩展**
1. `edge://extensions/` → 找到"篡改猴"
2. 点击右侧三个点 ⋮ → 选择"卸载"
3. 重新安装 Tampermonkey（需要时再装脚本）

---

## 五、技术说明

### 为什么安装地址能工作？
- `tampermonkey.net/script_installation.php` 是 Tampermonkey 官方提供的中转页
- `#url=` 后面的脚本地址由扩展读取，浏览器不会将其发送给服务器
- 扩展下载脚本后，自动跳转到安装确认对话框

### 为什么 Dashboard 打不开？
- Android Edge 禁止直接访问 `extension://` 协议地址
- Tampermonkey 未在官网提供跳转到 Dashboard 的入口
- 因此无法查看、编辑或删除已安装的脚本

---

## 六、相关仓库文件

| 文件 | 说明 |
|---|---|
| `kc_grabber.user.js` | 最新测试脚本（v1.2） |
| `test.user.js` | 旧版测试脚本（v1.0 / v1.1） |
| `grab_restrict.md` | 舰C数据拦截安全设计原则 |
| `local.md` | 本文档 |

---

> 最后更新：2026-08-07
> 维护者：Qing-Feng
