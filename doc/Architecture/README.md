# 项目架构说明（DanShi）

> 最新修改日期：2025-10-29
>

---

## 1. 总览（Overview）

本项目是基于 Expo + React Native（TypeScript）的移动应用。

- 核心分层（自下而上）：
  - Config & Constants（配置与常量）：集中管理环境与常量，避免散落硬编码
  - Infra（基础设施层）：错误模型、HTTP 客户端、认证存储与权限工具
  - Data Sources & Repositories（数据访问层）：统一对外的资源访问接口（API/本地存储/Mock）
  - Services（领域服务层）：业务校验与编排，面向用例而非数据表
  - Presentation（表现层）：Hook、Context、组件、屏幕、导航与主题系统

---

## 2. 目录结构（按功能与分层说明）

以下说明按 `DanShi/src` 下的目录进行，逐一列出用途与文件职责。

### 2.1 config/

- `src/config/index.ts`
  - 集中管理运行时配置项（如 `apiBaseUrl`、`requestTimeoutMs`）
  - 数据来源：由 `src/constants/app.ts` 的 `API_BASE_URL`、`REQUEST_TIMEOUT_MS` 提供，便于单点修改
  - 环境变量映射：`EXPO_PUBLIC_API_URL`、`EXPO_PUBLIC_REQUEST_TIMEOUT_MS`
  - 示例职责：导出 `config.apiBaseUrl`、`config.requestTimeoutMs`，供 HTTP 客户端与仓储使用

### 2.2 constants/

- `src/constants/app.ts`
  - 集中式常量与运行时开关：
    - `USE_MOCK`（切换 Mock/Server）
    - `API_BASE_URL`（服务端 URL）、`REQUEST_TIMEOUT_MS`（请求超时）。
    - `STORAGE_KEYS`（`AUTH_TOKEN`、`POSTS` 等）存储键
    - `API_ENDPOINTS`（`/auth/login`、`/auth/register`、`/auth/me`、`/auth/logout` 等，仅 path，base 由 `API_BASE_URL` 提供）接口路径
    - `ROLES`、`ROLE_ORDER` 角色常量
    - `REGEX`（如 email 校验）正则
  - 环境变量：`EXPO_PUBLIC_USE_MOCK`、`EXPO_PUBLIC_API_URL`、`EXPO_PUBLIC_REQUEST_TIMEOUT_MS`

- `src/constants/breakpoints.ts`
  - 断点定义与工具：
    - `breakpoints`：sm/md/lg/xl 的最小宽度
    - `BREAKPOINT_ORDER`：['base','sm','md','lg','xl']
    - `pickByBreakpoint(current, map)`：根据当前断点选择值，缺省回退至更小断点或 base
  - 用于表现层在不同屏幕宽度下切换列数、间距、最大宽度等。

- `src/constants/layout.ts`
  - 主题设计系统核心：
    - `Spacing`（xs~xxl 间距刻度）
    - `Fonts`（跨平台字体族）
    - `TypeScale`（不同断点下标题/正文字号）
  - 搭配 `context/theme_context.tsx` 提供的 Provider 与 Hook（`ThemeModeProvider` / `useTheme()`），在组件中获取 `colors`、`background` 等主题值。

- `src/constants/theme.ts`
  - 默认主题色设计

### 2.3 lib/

  - 定义 `AppError` 统一错误类型与 `ensureAppError` 正常化工具
- `src/lib/http/client.ts`
  - 基础 HTTP 客户端封装：
    - 统一超时、JSON 解析、错误映射
- `src/lib/http/http_auth.ts`
  - 鉴权版 HTTP 客户端：
    - 自动在 Header 注入 Authorization（通过 token getter）
    - 用于需要登录态的接口（如 `/auth/me`、`/auth/logout`）
- `src/lib/http/response.ts`
  - 统一 API 响应模型与解包器：
    - `ApiResponse<T>` 为后端返回 `{ code, message, data }`
    - `unwrapApiResponse` 用于抽取 data 与处理非 0 code

  - 使用 AsyncStorage 管理认证 token（get/set/clear）
  - Key 来自 `STORAGE_KEYS.AUTH_TOKEN`
- `src/lib/errors/app_error.ts`
  - 统一错误格式
- `src/lib/auth/auth_storage.ts`
  - 负责本地 `token` 的持久化，给出 `getToken()`、`setToken()`、`clearToken()` 方法并聚合到 `AuthStorage()` 中
- `src/lib/auth/roles.ts`
  - 负责判断权限，提供 `hasRoleAtLeast()`、`isAdmin()`、`isSuperAdmin()` 方法
- `src/lib/auth/jwt.ts`
  - 轻量 JWT Payload 解码（Base64url 解码，不校验证签，仅解析 payload）
  - 用途：在登录后立即从 Token 中提取 `name/nickname`、`avatarUrl/avatar` 用于“预览显示”（昵称与头像）

### 2.4 repositories/

- `src/repositories/auth_repository.ts`
  - `AuthRepository` 接口 + 两个实现：
    - `MockAuthRepository`（默认在开发阶段启用）
    - `ApiAuthRepository`（直连服务端，通过 `http/http_auth`）
  - 切换：读取 `constants/app.ts` 的 `USE_MOCK` 一键切换

- `src/repositories/posts_repository.ts`
  - 作为 `posts` 资源的统一对外仓储接口，默认内置 AsyncStorage Mock 数据源，可按需切换至服务端实现。


### 2.5 services/

  - `src/services/auth_service.ts`
    - 登录/注册前进行 email/password 格式校验（用 `REGEX`）
    - 处理返回的 token，调用 `AuthStorage` 持久化

- `src/services/posts_service.ts`

> 说明：Service 面向“用例”，保证“从输入到输出”的完整闭环，减少表现层的粘合代码与业务入侵。

### 2.6 context/
- `src/context/auth_context.tsx`
  - 提供全局认证上下文与 `useAuth` Hook：
    - 状态：`userToken`（字符串）、`preview`（从 JWT 提取的 `name/avatarUrl`）、`user`（`/auth/me` 返回的完整用户信息）、`isLoading`。
    - 方法：`signIn(token)`（保存 token → 立即解析并设置 `preview` → 后台请求 `/auth/me` 回填 `user`）、`signOut()`、`refreshUser()`（手动刷新 `/auth/me`）。
  - 体验：登录后昵称与头像即刻显示，完整资料在后台获取成功后自动覆盖。
- `src/context/waterfall_context.tsx`
  - 提供瀑布流布局参数（最小/最大高度等）与修改方法，供 Explore/瀑布流相关页面共享
- `src/context/theme_context.tsx`
  - 对外提供 Provider 与 Hook）

### 2.7 hooks/

- `src/hooks/use_media_query.ts`
  - 搭配 `pickByBreakpoint` 使用，按断点选择布局参数

- `src/hooks/use_responsive.ts`
  - 补充响应式工具（如组合常用场景）
### 2.8 components/

- `src/components/themed_text.tsx`、`src/components/themed_view.tsx`
  - 与主题系统耦合的文本/容器组件，自动应用配色
- `src/components/parallax_scroll_view.tsx`
  - 视差滚动容器，支持自定义 header 背景色（按 `useTheme()`）
- `src/components/overlays/bottom_sheet.tsx`
  - 底部弹窗容器
- `src/components/haptic_tab.tsx`
- `src/components/external_link.tsx`
  - 外链跳转组件（Web/原生统一处理）
#### 2.8.1 components/ui/

通用 UI 组件库（可复用、响应式友好）：

- `container.tsx`：包裹型容器（控制水平边距与最大宽度）
- `grid.tsx`：网格容器（结合断点切换列数/间距）
- `icon_symbol(.ios).tsx`：平台图标适配
- `parallax_screen.tsx`：带视差头部的 Screen 变体
- `responsive_image.tsx`：按父容器/断点自适应的图片组件
- `screen.tsx`：页面级容器（Scroll/常规两种 variant），处理安全区与背景
- `settings.tsx`：设置列表与项（`SettingsList`、`SettingsItem`）
- `stack.tsx`：纵向/横向栈布局（gap/align/justify）
- `typography.tsx`：排版系统（`H1/H2/H3/Body/Caption` 等，结合 `TypeScale` 与 `Fonts`）

#### 2.8.2 components/overlays/
- `bottom_sheet.tsx`：底部弹窗（BottomSheet）
  - 作用：在页面底部以浮层方式呈现二级操作区或附加内容，支持轻量表单、选项列表等。
  - Props（契约）：
    - `visible: boolean` 是否可见。
    - `onClose: () => void` 关闭回调（遮罩点击与系统返回键触发）。
    - `children: React.ReactNode` 浮层内容。
    - `height?: number` 可选固定高度；缺省为自适应内容高度。
  - 行为：
    - 使用 `Modal` + `Animated.timing` 平滑出现/消失；
    - 点击半透明遮罩会触发 `onClose()`；
    - Android 上通过 `onRequestClose` 响应物理返回键；
    - 浮层顶部带有“把手”视觉，暗示可交互。
  - 主题：
    - 背景色随主题 `card` 颜色；
    - 遮罩为半透明黑；建议页面背景与卡片存在对比以凸显层级。
  - 使用建议：
    - 放置在页面根部（或 Portal）以避免被父容器裁剪；
    - 尽量保持内容简洁，避免在 BottomSheet 内嵌套过深的滚动区；
    - 较复杂的“多段高度/拖拽”需求可在后续通过手势库扩展为 Snap Points 版本。

### 2.9 app/

- `src/app/_layout.tsx`：应用根布局（全局 Provider、主题与路由容器）
- `src/app/index.tsx`：首页路由
- `src/app/(auth)/_layout.tsx`：认证分组布局
- `src/app/(tabs)/_layout.tsx`：底部标签页布局
- `src/app/(tabs)/explore.tsx`、`post.tsx`、`settings.tsx`：Tab 页入口。

> 说明：app/ 目录的文件是“路由入口”，通常只做路由与 Screen 绑定，尽量保持薄。
### 2.9 screens/

页面级组件，负责绑定 Service/Context，组织 UI 组件与业务交互：

- `explore_screen.tsx`：探索页（瀑布流展示，列数与间距响应式）
- `login_screen.tsx`：登录页（表单校验与调用 `auth_service`）
- `register_screen.tsx`：注册页（同上）
- `post_screen.tsx`：发帖页（输入校验 + `posts_service`，并已响应式调整文本框高度、间距）
- `settings_screen.tsx`：设置页（主题切换、瀑布流高度参数；已去除黑线，并使用柔和卡片背景分隔）

### 2.10 models/

- `src/models/User.ts`
  - 用户对象模型（含 `role`，支持 `super_admin`）

### 2.11 utils/

- `src/utils/index.ts`

### 2.12 scripts/

- `scripts/reset-project.js`
  - 删除脚本

### 2.13 assets/

静态图片



## 3. 分层架构详解（职责、依赖与边界）

本章聚焦每一层的“做什么/不做什么”、依赖走向与放置准则，方便在演进中保持清晰边界。

### 3.1 配置与常量层（Config & Constants）

- 职责：集中“可变点”（环境变量、常量、运行时开关）。
- 依赖：仅被下游依赖（Infra/Repositories/Services/Presentation），本层不依赖业务代码。
- 产物：
  - `src/constants/app.ts`：`USE_MOCK`、`API_BASE_URL`、`REQUEST_TIMEOUT_MS`、`STORAGE_KEYS`、`API_ENDPOINTS`、`REGEX`、`ROLES`。
  - `src/config/index.ts`：对外暴露 `apiBaseUrl`、`requestTimeoutMs` 等运行时配置。
- 使用：
  - HTTP 客户端使用 `apiBaseUrl` 与超时时间；
  - Repositories 根据 `USE_MOCK` 选择数据源实现；
  - AuthStorage/Posts 存储统一使用 `STORAGE_KEYS`；
  - 表单校验使用 `REGEX`。
- 边界：不包含 IO/网络逻辑，不持有可变状态。

### 3.2 基础设施层（Infra）

- 职责：提供跨域基础能力，统一错误、网络与认证等通用设施。
- 组成：
  - 错误：`src/lib/errors/app_error.ts`，定义 `AppError` 及归一化工具；
  - HTTP：`src/lib/http/client.ts`（未鉴权）、`src/lib/http/http_auth.ts`（带 Authorization）；
  - 响应：`src/lib/http/response.ts` 提供 `{ code, message, data }` 模型解包 `unwrapApiResponse<T>()`；
  - 认证：`src/lib/auth/auth_storage.ts` 管理 token；
  - 权限：`src/lib/auth/roles.ts` 提供角色判定工具。
- 合同（简要）：
  - HTTP 客户端默认 JSON、超时与错误转译；
  - `http_auth` 通过 token getter 自动注入 `Authorization`；
  - `unwrapApiResponse` 仅在成功状态返回 `data`，否则抛出 `AppError`（细节见第 4 章）。
- 边界：不涉及业务拼装，不直接依赖 UI。

### 3.3 数据访问层（Repositories）

- 职责：以“资源（Resource）”为单位，提供稳定的读写接口；屏蔽数据源（API/本地/Mock）差异。
- 例子：
  - `src/repositories/auth_repository.ts`：`AuthRepository` 接口与 Mock/Api 两种实现，依据 `USE_MOCK` 切换；
  - `src/repositories/posts_repository.ts`：Posts 资源仓储，默认基于 AsyncStorage 的本地实现，可拓展至服务端。
- 边界：不做输入校验/格式化等业务规则；不直接操作 UI/导航；尽量保持幂等与可测试性。

### 3.4 领域服务层（Services）

- 职责：围绕“用例（Use Case）”编排流程、做输入校验、组合多个仓储；对上层暴露业务语义化方法。
- 例子：
  - `src/services/auth_service.ts`：校验 email/password，调用仓储并持久化 token；
  - `src/services/posts_service.ts`：校验与创建 Post（可扩展为草稿/附件等）。
- 边界：不关心 UI 形态/状态管理；不直接做持久化（委托给仓储）。

### 3.5 表现层（Presentation）

- 职责：渲染 UI、处理交互，将事件委托给 Services/Context；组合主题与响应式系统。
- 构成：
  - Context：`src/context/*`（如 `auth_context`、`waterfall_context`、主题 Provider）；
  - Hooks：`src/hooks/*`（媒体查询/响应式等）；
  - Components：`src/components/*`（通用 UI、Overlays、主题包装等）；
  - Routes：`src/app/*`（expo-router 路由入口，绑定到 `src/screens/*`）。
- 依赖：Services（业务调用）、Constants（主题/断点/正则）、少量 Infra（类型/工具）。
- 边界：不直接发 HTTP、不直接访问存储、不编排复杂业务；屏幕尽量“薄”，逻辑沉淀到 Service/Context。



------

## 4. HTTP 与错误处理（统一约定）

- 响应结构：后端返回 `{ code: number; message: string; data: T }`。
- 正常结果：默认 `code === 200`（可按后端调整），使用 `unwrapApiResponse` 直接获取 `data`。
- 异常结果：`code !== 0` 或网络错误、解析错误，均转换为 `AppError`。

---

## 5. 认证与权限（Auth + Roles）

- Token：
  - 存储于 `AuthStorage`，Key 为 `STORAGE_KEYS.AUTH_TOKEN`。
  - 鉴权客户端自动注入 Authorization 头。
- 仓储切换：
  - 由 `USE_MOCK` 控制选择 `MockAuthRepository` 或 `ApiAuthRepository`。
  - 配置来源：`.env` 中 `EXPO_PUBLIC_USE_MOCK=true/false`。

- 登录后体验优化：
  - 立即显示：从 JWT Payload 中解析 `nickname/name` 与 `avatarUrl/avatar`，立刻用于 UI 预览（无需等待网络）。
  - 完整信息：上下文会在后台调用 `/auth/me` 获取完整 `User` 并回填到 `user`，覆盖预览信息。
  - 字段兼容性：昵称兼容 `nickname`/`name`，头像兼容 `avatarUrl`/`avatar`。

---

## 6. Mock / Server 切换（操作指南）

- 在项目根（`danshi/`）创建 `.env` （参考.`env.example`）

---

## 7. 主题与设计系统（Theme + DS）

- `Colors`（light/dark）、`Spacing`、`Fonts`、`TypeScale` 在 `constants/theme.ts` 定义。
- `useTheme()` 提供 `colors`、`background`、`text`、`icon`、`danger`、`card` 等，组件按需解构。
- 组件规范：
  - 按 `variant/size` 组合出一致的视觉语言（如 Button/Input/Card）。
  - 不在组件内部硬编码颜色，统一走主题。

---

## 8. 响应式系统（Responsive）

- 断点：`breakpoints.ts` 中定义 sm/md/lg/xl 与 `BREAKPOINT_ORDER`。
- Hook：`useBreakpoint/useMinWidth/useMaxWidth` 提供当前断点信息。
- 选择器：`pickByBreakpoint(breakpoint, { base, sm?, md?, lg?, xl? })`。
- 屏幕实践：
  - 登录/注册：容器 `maxWidth` 随断点扩展；表单间距和输入高度调优。
  - Explore（瀑布流）：列数与间距随断点变化。
  - Post：输入区高度与页内间距随断点变化。
  - Settings：视觉舒适的卡片式分隔，移除硬分割线，保持响应式留白。

---

## 9. 页面与路由（Screens + expo-router）

- 路由入口统一在 `src/app/`，每个路由文件导向相应 `src/screens/*`。
- 屏幕职责：
  - 绑定服务/上下文，处理用户交互。
  - 使用通用 UI 组件，实现一致的主题与响应式表现。

---

## 10. 数据模型与存储（Models + Storage）

- `models/User.ts` 描述用户实体，便于静态类型检查与角色逻辑。
- AsyncStorage 键统一在 `STORAGE_KEYS`。变更时集中修改，避免 Key 漂移。

---

## 11. 开发约定与风格指南

- 导入路径：优先使用别名 `@/src/...`，减少相对路径层级。
- 命名：
  - 文件：`snake_case.tsx` 或与组件名一致（如 `settings_screen.tsx`）。
  - 组件：`PascalCase`；Hook：`useCamelCase`；常量：`SCREAMING_SNAKE_CASE` 或 `camelCase`（按域约定）。
- 组件职责：
  - 避免在 UI 组件中写具体业务逻辑；业务均在 Service/Context。
- 可测性：
  - 关键 Service 方法建议配最小单元测试；
  - UI 组件在交互复杂时配合测试库编写交互测试。


---

## 12. 目录与文件清单（逐项说明）

> 下列清单以 `DanShi/` 目录为根，逐一说明文件用途，便于溯源。

- 根（DanShi/）
  - `app.json`：Expo 工程配置（名称、图标、平台等）。
  - `eslint.config.js`：ESLint 配置。
  - `expo-env.d.ts`：Expo 相关类型声明扩展。
  - `package.json`：依赖与脚本。
  - `tsconfig.json`：TypeScript 编译选项（含路径别名）。
  - `README.md`：项目说明（通用）。
  - `.gitignore`：忽略文件（含 Expo/原生产物、日志、缓存等）。
  - `scripts/reset-project.js`：项目重置/维护脚本。
  - `assets/images/*`：图标与图片资源。

- `src/config/index.ts`：运行时配置。
- `src/constants/app.ts`：存储键、接口路径、角色、正则。
- `src/constants/breakpoints.ts`：断点与选择器。
- `src/constants/layout.ts`：布局相关常量。
- `src/constants/theme.ts`：主题系统（颜色/间距/字体/字阶）。

- `src/lib/errors/app_error.ts`：统一错误类型与归一工具。
- `src/lib/http/client.ts`：未鉴权 HTTP 客户端。
- `src/lib/http/http_auth.ts`：鉴权 HTTP 客户端。
- `src/lib/http/response.ts`：响应类型与解包器。
- `src/lib/auth/auth_storage.ts`：token 存取。
- `src/lib/auth/roles.ts`：角色与权限工具。

- `src/repositories/auth_repository.ts`：认证仓储（接口 + 多实现）。
- `src/repositories/posts_repository.ts`：Posts 仓储（对接 api/posts）。

- `src/services/auth_service.ts`：认证服务（校验+编排+存储）。
- `src/services/posts_service.ts`：Posts 服务（校验+创建）。

- `src/context/auth_context.tsx`：认证上下文与 Hook。
- `src/context/waterfall_context.tsx`：瀑布流设置上下文。
- `src/context/theme_context.tsx`：主题 Provider 与 Hook。

- `src/hooks/use_media_query.ts`：响应式 Hook。
- `src/hooks/use_responsive.ts`：响应式辅助。

- `src/components/external_link.tsx`：外链组件。
- `src/components/haptic_tab.tsx`：触觉反馈包装。
- `src/components/parallax_scroll_view.tsx`：视差滚动容器。
- `src/components/themed_text.tsx`：主题文本。
- `src/components/themed_view.tsx`：主题容器。
- `src/components/overlays/bottom-sheet.tsx`：底部弹窗。

- `src/components/ui/button.tsx`：按钮。
- `src/components/ui/card.tsx`：卡片容器。
- `src/components/ui/collapsible.tsx`：折叠区。
- `src/components/ui/container.tsx`：容器。
- `src/components/ui/grid.tsx`：网格。
- `src/components/ui/icon_symbol.tsx` / `.ios.tsx`：平台图标。
- `src/components/ui/input.tsx`：输入框。
- `src/components/ui/masonry.tsx`：瀑布流布局。
- `src/components/ui/parallax_screen.tsx`：视差页面容器。
- `src/components/ui/responsive_image.tsx`：响应式图片。
- `src/components/ui/screen.tsx`：页面容器。
- `src/components/ui/settings.tsx`：设置列表与项。
- `src/components/ui/stack.tsx`：栈容器。
- `src/components/ui/typography.tsx`：排版。

- `src/app/_layout.tsx`：根布局。
- `src/app/index.tsx`：首页。
- `src/app/(auth)/_layout.tsx`：认证分组布局。
- `src/app/(auth)/login.tsx`：登录路由入口。
- `src/app/(auth)/register.tsx`：注册路由入口。
- `src/app/(tabs)/_layout.tsx`：Tab 分组布局。
- `src/app/(tabs)/explore.tsx`：Explore 路由入口。
- `src/app/(tabs)/post.tsx`：Post 路由入口。
- `src/app/(tabs)/settings.tsx`：Settings 路由入口。

- `src/screens/explore_screen.tsx`：探索页。
- `src/screens/login_screen.tsx`：登录页。
- `src/screens/register_screen.tsx`：注册页。
- `src/screens/post_screen.tsx`：发帖页。
- `src/screens/settings_screen.tsx`：设置页。

- `src/models/User.ts`：用户模型。
- `src/utils/index.ts`：工具方法聚合。

---

(完)

