# 阶段一：项目启动与环境确认 — 详细实现步骤

> 目标：确定技术栈能跑通，搭出空壳项目。预计耗时 1-2 天。

---

## 步骤 1：Android Studio 环境检查与项目创建（2-3 小时）

### 做什么
1. 打开 Android Studio，进入 **Help → About**，确认版本不低于 **Hedgehog (2023.1.1)**。版本过低可能导致 Compose 模板缺失或 AGP 不兼容。
2. 进入 **SDK Manager**，确认已安装：
   - **Android SDK Platform 26**（minSdk 用）
   - **Android SDK Platform 34 或 35**（targetSdk/compileSdk 用）
   - **Android SDK Build-Tools**（对应 compileSdk 版本）
   - **Android Emulator + Intel x86 Emulator Accelerator (HAXM)**（如果用模拟器调试）
3. 新建项目：**File → New → New Project → Empty Compose Activity**。
4. 配置向导：
   - **Name**：你的 App 名称（如 `KancolleTablet`）
   - **Package name**：反向域名风格（如 `com.qingfeng.kancolletablet`）
   - **Save location**：本地工作目录
   - **Minimum SDK**：**API 26: Android 8.0 (Oreo)**
   - **Build configuration language**：**Kotlin DSL (build.gradle.kts)**

### 为什么
- `Empty Compose Activity` 模板自带 Jetpack Compose 基础结构和 Material3 主题，省去手动配置。
- minSdk 26 覆盖了绝大多数现役平板（2017 年后设备），同时避开了 25 以下 WebView 的诸多兼容性问题。
- Kotlin DSL 是官方推荐，类型安全、IDE 补全更好。

### 验收标准
- [ ] 项目创建成功，无报错。
- [ ] 左侧 Project 视图能看到标准目录结构（`app/src/main/java`、`res`、`AndroidManifest.xml` 等）。
- [ ] `build.gradle.kts` (Module: app) 中 `compileSdk` 和 `targetSdk` 已自动设为 34 或 35。

### 常见坑
- **坑 1**：如果 Android Studio 版本太老，可能没有 "Empty Compose Activity" 模板。解决：升级到最新稳定版，或手动选 "Empty Activity" 再自行添加 Compose 依赖。
- **坑 2**：minSdk 选太低（如 21）会导致 Compose 某些 API 不可用，且 WebView 行为差异大。解决：严格按 PRD 选 26。
- **坑 3**：项目路径含中文或空格，可能导致 Gradle 同步异常。解决：路径全英文、无空格。

---

## 步骤 2：Gradle 与核心依赖配置（2-3 小时）

### 做什么
1. 打开 `gradle/libs.versions.toml`（或直接在 `build.gradle.kts` 中），确认以下依赖已引入或手动添加：
   - **Compose BOM**（统一管理 Compose 版本）
   - **lifecycle-viewmodel-compose**（ViewModel 支持）
   - **lifecycle-runtime-compose**（Flow 收集支持）
   - **room-runtime + room-compiler + room-ktx**（数据持久化）
   - **datastore-preferences**（键值配置存储）
   - **kotlinx-coroutines-android**（协程）
2. 点击 **Sync Now**，等待 Gradle 同步完成。
3. 同步后检查 **Build → Make Project (Ctrl+F9)** 是否能编译通过。

### 为什么
- Compose BOM 避免手动管理十几个 Compose 库的版本号，减少冲突。
- Room + DataStore 是 PRD 明确选定的数据层，提前引入确保后续阶段不用回头改配置。
- 协程是 Kotlin 异步编程的核心，WebView 回调、网络请求、数据库操作都需要它。

### 验收标准
- [ ] Gradle 同步成功，底部状态栏无红色错误。
- [ ] `Make Project` 编译通过，生成 APK 无报错。
- [ ] 在 `External Libraries` 中能看到上述依赖已正确解析。

### 常见坑
- **坑 1**：Room 的 KAPT/KSP 编译器未配置，导致 `@Entity` 等注解无法生成代码。解决：确认 `plugins` 块中已应用 `kotlin-kapt` 或 `com.google.devtools.ksp`，且 Room 依赖的 `kapt`/`ksp` 行已添加。
- **坑 2**：Compose BOM 版本与 Kotlin 版本不兼容。解决：查看 [Compose 与 Kotlin 兼容性表](https://developer.android.com/jetpack/androidx/releases/compose-kotlin)，确保两者匹配。
- **坑 3**：Gradle 同步时提示 "Could not resolve"。解决：检查网络代理、Maven 仓库配置（`google()` 和 `mavenCentral()` 必须在 `repositories` 中）。

---

## 步骤 3：权限与清单文件配置（30 分钟）

### 做什么
1. 打开 `app/src/main/AndroidManifest.xml`。
2. 在 `<manifest>` 根标签内添加：
   - `INTERNET` 权限（WebView 联网必需）
   - `SYSTEM_ALERT_WINDOW` 权限（为阶段 3 的悬浮窗/覆盖层预留）
3. 在 `<application>` 标签内检查/调整：
   - `android:allowBackup="true"`（方便用户换机时保留配置）
   - `android:usesCleartextTraffic="true"`（舰C 部分资源可能走 HTTP，需允许明文传输）
   - `android:hardwareAccelerated="true"`（WebView 渲染必需硬件加速）
4. 确认 `MainActivity` 的 `android:exported="true"` 且带有 `MAIN/LAUNCHER` 的 intent-filter。

### 为什么
- `INTERNET` 是最基础权限，没有它 WebView 一片空白。
- `SYSTEM_ALERT_WINDOW` 虽然阶段 1 用不到，但阶段 3 的窗口管理系统需要它，提前声明避免后期忘记。
- `usesCleartextTraffic` 在 Android 9+ 默认禁止 HTTP，舰C 的某些旧资源或统计接口可能未升级 HTTPS，需要放行。
- 硬件加速对 WebView 的 Canvas 渲染和 CSS 动画至关重要，关闭会导致严重卡顿。

### 验收标准
- [ ] `AndroidManifest.xml` 无语法错误（XML 标签闭合正确）。
- [ ] 编译通过。
- [ ] 用 **Analyze → Inspect Code** 扫描，无 "Missing permissions" 警告。

### 常见坑
- **坑 1**：`usesCleartextTraffic` 写在 `<application>` 外。解决：它必须是 `<application>` 的属性。
- **坑 2**：忘记 `SYSTEM_ALERT_WINDOW` 是特殊权限，仅在清单声明不够，运行时还需弹窗申请。解决：阶段 1 只需声明，阶段 3 再处理运行时申请逻辑。

---

## 步骤 4：Compose 基础验证 — "Hello World" 跑通（1-2 小时）

### 做什么
1. 打开 `MainActivity.kt`，确认 `setContent` 块内使用的是 Compose 函数（如 `MyApplicationTheme { Surface { ... } }`）。
2. 在 `Surface` 内放一个最简单的 `Text("舰C平板端 — 环境验证")`。
3. 连接真机或启动模拟器（建议创建一个 **Tablet 类虚拟设备**，如 Pixel Tablet API 34）。
4. 点击 **Run (Shift+F10)**，等待安装并启动。
5. 观察设备屏幕，确认文字正常显示。
6. 旋转设备（横屏/竖屏），确认界面不崩溃、文字位置合理。

### 为什么
- 这是整个项目的"冒烟测试"。如果这一步跑不通，说明环境有问题，必须在此阶段解决，不能带到后续阶段。
- 使用 Tablet 模拟器可以提前暴露大屏适配问题（如 Compose 默认布局在 10 寸屏上的显示效果）。

### 验收标准
- [ ] App 在设备上成功安装并启动。
- [ ] 屏幕中央（或默认位置）显示 "舰C平板端 — 环境验证"。
- [ ] 横竖屏切换 3 次以上，无崩溃、无闪退、无布局错乱。
- [ ] Logcat 无 FATAL EXCEPTION 或 Compose 相关错误。

### 常见坑
- **坑 1**：模拟器启动失败，提示 HAXM 未安装。解决：进入 SDK Manager → SDK Tools，安装 Intel HAXM（Windows）或确认已启用 Hypervisor.Framework（macOS）。
- **坑 2**：真机调试时提示 "Installation did not succeed"。解决：检查 USB 调试是否开启、是否授权当前电脑、是否安装对应厂商驱动。
- **坑 3**：Compose 预览（Preview）能显示，但真机运行崩溃。解决：Preview 和真机运行是两套渲染路径，以真机为准。检查 `setContent` 是否在 `onCreate` 中正确调用。

---

## 步骤 5：平板设备适配初探 — 为大屏做准备（1-2 小时）

### 做什么
1. 在 `res/values/` 目录下，确认已有 `themes.xml` 和 `colors.xml`。
2. 新建资源目录：
   - `res/values-sw600dp/`（7 寸以上平板）
   - `res/values-sw720dp/`（10 寸以上平板）
3. 在 `values-sw600dp/dimens.xml` 中定义一些基础尺寸（如 `game_padding`、`window_title_height`），先随便填值，占位即可。
4. 在 `MainActivity` 的 Compose 代码中，用 `LocalConfiguration.current.screenWidthDp` 读取当前屏幕宽度，打印到 Logcat，确认在不同模拟器上读数正确。
5. 如果手边有真机，重复步骤 4，记录真机的 `screenWidthDp` 和 `screenHeightDp`。

### 为什么
- 舰C 是横屏游戏，平板屏幕尺寸差异大（8 寸到 13 寸），提前建立 `sw<N>dp` 资源目录，后续阶段可以直接往里面填适配值，不用回头重构。
- 记录目标真机的实际 dp 尺寸，为阶段 3 的窗口百分比坐标系统提供基准数据。

### 验收标准
- [ ] `res/values-sw600dp/` 和 `res/values-sw720dp/` 目录已创建。
- [ ] `dimens.xml` 文件已创建，无编译错误。
- [ ] Logcat 能正确打印当前设备的 `screenWidthDp` 和 `screenHeightDp`。

### 常见坑
- **坑 1**：`sw600dp` 目录在手机上不生效，误以为配置错误。解决：`sw<N>dp` 只在屏幕最小边 ≥ N dp 时生效，手机通常不触发，这是正常行为。
- **坑 2**：Compose 中读取 `Configuration` 时使用了过时的 API。解决：使用 `androidx.compose.ui.platform.LocalConfiguration`，不要用 `Resources.getSystem().configuration`。

---

## 步骤 6：版本控制初始化与第一次提交（30 分钟）

### 做什么
1. 在项目根目录初始化 Git（如果 Android Studio 未自动做）：
   - 检查 `.gitignore` 是否已包含 `/.idea`、`/build`、`*.iml`、`local.properties` 等。
   - 如果没有，从 Android 官方模板复制一份标准 `.gitignore`。
2. 执行第一次提交：
   - 添加所有文件到暂存区。
   - 提交信息：`init: create empty compose project with core dependencies`
3. （可选）如果远程仓库已存在，关联并推送。

### 为什么
- 阶段 1 结束时的代码是"最干净的状态"，后续每个阶段都可以在此基础上分支或回滚。
- 标准的 `.gitignore` 避免把 IDE 配置、构建产物、本地密钥推送到仓库。

### 验收标准
- [ ] `git status` 显示工作区干净（无未跟踪的重要文件，也无已修改未提交的文件）。
- [ ] `git log` 能看到第一条提交记录。
- [ ] `.gitignore` 中已排除 `local.properties` 和 `build/` 目录。

### 常见坑
- **坑 1**：把 `local.properties`（含本地 SDK 路径）推到了仓库。解决：立即从仓库删除，并在 `.gitignore` 中补加。
- **坑 2**：`.idea` 目录被提交，导致团队协作时冲突。解决：确保 `.gitignore` 包含 `/.idea`，并 `git rm -r --cached .idea` 后重新提交。

---

## 阶段一总验收清单

全部步骤完成后，对照以下清单确认阶段一达标：

| 检查项 | 状态 |
|---|---|
| 项目能在 Android Studio 中正常打开，Gradle 同步无报错 | ☐ |
| `Make Project` 编译通过 | ☐ |
| 真机/平板模拟器能安装并运行 App | ☐ |
| 屏幕显示自定义文本，横竖屏切换不崩溃 | ☐ |
| `AndroidManifest.xml` 已声明 INTERNET 和 SYSTEM_ALERT_WINDOW | ☐ |
| 核心依赖（Compose、ViewModel、Room、DataStore、Coroutines）已引入并解析成功 | ☐ |
| 已创建 sw600dp / sw720dp 资源目录 | ☐ |
| Git 已初始化，第一次提交完成，.gitignore 配置正确 | ☐ |

**全部打勾后，阶段一结束，可以进入阶段二。**

---

## 阶段一 → 阶段二的衔接建议

阶段一结束时，你的项目应该处于这样一个状态：
- 打开 Android Studio，点击 Run，5 秒内能在设备上看到你的 App 启动。
- 代码仓库有一个干净的初始提交。
- 所有依赖已经就位，后续阶段只需要写业务逻辑，不用再碰 Gradle。

进入阶段二之前，建议做一件事：**确认你的目标平板（或主要调试模拟器）能正常访问 DMM 网站**。用设备自带的浏览器打开 `https://www.dmm.com/my/-/login/`，确认能加载页面。如果自带浏览器都被 DMM 拦截，说明你的网络环境或设备指纹有问题，需要提前解决，否则阶段二的 WebView 配置再完美也白搭。
