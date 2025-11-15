# 项目架构说明（DanShi）

> 最新修改日期：2025-11-15
>

---

## 1. 总览（Overview）

本项目是基于 Expo + React Native（TypeScript）的移动应用。

- 核心分层（自下而上）：
  - Config & Constants（配置与常量）：集中管理环境与常量，避免散落硬编码
  - Infra（基础设施层）：错误模型、HTTP 客户端、认证存储与权限工具
  - Data Sources & Repositories（数据访问层）：统一对外的资源访问接口（API/本地存储/Mock）
  - Services（领域服务层）：业务校验与编排，面向用例而非数据表
  - Presentation（表现层）：Hook、Context、组件（基于 Material 3）、屏幕、导航与主题系统

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
  - `STORAGE_KEYS`（`AUTH_TOKEN`、`REFRESH_TOKEN`、`POSTS` 等）存储键
    - `API_ENDPOINTS`（`/auth/login`、`/auth/register`、`/auth/me`、`/auth/logout` 等，仅 path，base 由 `API_BASE_URL` 提供）接口路径
    - `ROLES`、`ROLE_ORDER` 角色常量
    - `REGEX`（如 email 与 username 校验）正则
      - `REGEX.EMAIL`、`REGEX.USERNAME`（支持邮箱或 3-30 位用户名：字母/数字/下划线/点/短横线）
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
    - 通过检测 `AbortError` 名称处理超时，避免直接依赖浏览器特有的 `DOMException`
- `src/lib/http/http_auth.ts`
  - 鉴权版 HTTP 客户端：
    - 自动在 Header 注入 Authorization（通过 token getter）
    - 用于需要登录态的接口（如 `/auth/me`、`/auth/logout`）
- `src/lib/http/response.ts`
  - 统一 API 响应模型与解包器：
    - `ApiResponse<T>` 为后端返回 `{ code, message, data }`
    - `unwrapApiResponse` 用于抽取 data 与处理非 0 code

  - 使用 AsyncStorage 管理认证令牌：
    - Access Token：`getToken()` / `setToken()` / `clearToken()`，Key 来自 `STORAGE_KEYS.AUTH_TOKEN`
    - Refresh Token：`getRefreshToken()` / `setRefreshToken()` / `clearRefreshToken()`，Key 来自 `STORAGE_KEYS.REFRESH_TOKEN`
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
  - 能力：
    - 登录：接受 `{ email?; username?; password }`，返回 `{ token, user, refreshToken? }`
    - 注册：`RegisterInput` 强制 `name` 必填；返回 `{ token, user, refreshToken? }`
    - 刷新：`refresh(refreshToken)` 对接 `POST /api/v1/auth/refresh`，返回 `{ token, refreshToken? }`
  - Mock 行为：
    - 登录严格校验：identifier 必须匹配当前 Mock 用户（邮箱或用户名其一），密码必须匹配保存的 Mock 密码；否则返回“账号或密码错误”。
    - 注册会更新 Mock 用户的 `email/name` 与 Mock 密码，便于随后用新账号直接登录。
    - 头像模拟：按邮箱（优先）或用户名生成稳定的头像 URL（DiceBear identicon），确保 `avatarUrl` 始终可用。

- `src/repositories/posts_repository.ts`
  - Posts 资源仓储接口，提供 Mock/Api 两种实现，随 `USE_MOCK` 自动切换。
  - 能力（方法）：
    - `list(filters)`：首页/列表检索（支持 postType/shareType/category/canteen/cuisine/flavors/tags/minPrice/maxPrice/sortBy/page/limit）。
    - `get(postId)`：获取详情（访问即计入浏览量，后端负责）。
    - `create(input)`：创建帖子（三种类型：share/seeking/companion）。
    - `update(postId, input)`：更新帖子。
    - `delete(postId)`：删除帖子。
    - `like/unlike(postId)`：点赞/取消点赞。
    - `favorite/unfavorite(postId)`：收藏/取消收藏。
    - `updateCompanionStatus(postId, { status, currentPeople? })`：更新约饭状态（仅 companion）。
  - Api 实现：读操作走未鉴权客户端 `http`，写操作走鉴权客户端 `httpAuth`，统一用 `unwrapApiResponse` 解包 `{ code,message,data }`。
  - Mock 实现：内存存储，支持基础分页与统计字段的本地变更，用于联调与离线演示。


### 2.5 services/

  - `src/services/auth_service.ts`
    - 登录：支持“邮箱或用户名 + 密码”，自动识别 `identifier` 是邮箱或用户名（使用 `REGEX.EMAIL/USERNAME`）；持久化 `token`，若返回 `refreshToken` 也一并持久化
    - 注册：强制 `name` 必填；校验邮箱与密码长度；持久化 `token`，若返回 `refreshToken` 也一并持久化
    - 刷新：`refresh()` 从本地读取 `refreshToken` 调用仓储刷新，成功后更新本地 `token`，若返回新的 `refreshToken` 也更新
    - 登出：同时清理本地 `token` 与 `refreshToken`

- `src/services/posts_service.ts`
  - Posts 用例服务：参数校验与规范化、编排调用仓储；提供：
    - `list(filters)`：清理分页参数、trim 多值筛选；
    - `get(postId)`：ID 校验；
    - `create(input)`：三类帖子分别校验：
      - 通用：`title`/`content` 非空长度、`category`（food/recipe）、`tags ≤ 10`；
      - share：`shareType` 必填、`images` 1~9 张且为 http(s) URL、`price ≥ 0`；
      - seeking：`images` 0~9 张且为 http(s) URL、`budgetRange` 合法且 `min ≤ max`；
      - companion：`images` 0~9 张且为 http(s) URL、`meetingInfo` 人数逻辑校验；
    - `update(postId, input)`：与 `create` 同级别校验；
    - `remove(postId)`：删除；
    - `like/unlike`、`favorite/unfavorite`：交由仓储；
    - `updateCompanionStatus(postId, { status, currentPeople? })`：状态值与人数校验。
  - 说明：Service 输出与后端契约贴合，但表现层保持独立；后续可在此扩展草稿、上传等流程。
> 说明：Service 面向“用例”，保证“从输入到输出”的完整闭环，减少表现层的粘合代码与业务入侵。

### 2.6 context/
- `src/context/auth_context.tsx`
  - 提供全局认证上下文与 `useAuth` Hook：
    - 状态：`userToken`（字符串）、`preview`（从 JWT 提取的 `name/avatarUrl`）、`user`（`/auth/me` 返回的完整用户信息）、`isLoading`。
    - 方法：`signIn(token)`（保存 token → 立即解析并设置 `preview` → 主动等待 `/auth/me` 回填完整 `user`）、`signOut()`、`refreshUser(token?)`（可选指定 token，便于在登录后立即刷新档案）。
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

- 主题与通用：
  - `src/components/themed_text.tsx`、`src/components/themed_view.tsx`
  - `src/components/haptic_tab.tsx`、`src/components/external_link.tsx`
  - `src/components/overlays/bottom_sheet.tsx`：底部弹层（保留，自适应 Material 3 背景色）

- Material 3（react-native-paper）
  - `src/components/md3/appbar.tsx`：品牌 Appbar 包装（`AppbarHeader`），背景取 `Colors.header`、前景取 `Colors.text`；自动处理安全区与居中标题。
  - `src/components/md3/masonry.tsx`：瀑布流布局（响应式列数/间距），作为 UI 通用容器。

- 说明：旧自研 UI 目录 `src/components/ui/` 已移除；屏幕请直接使用 `react-native-paper` 组件（`Card`/`TextInput`/`Button`/`List`/`Appbar` 等）与上面两个包装组件。


### Users（用户信息）

- API：
  - `GET /api/v1/users/:userId` → `UserProfile`（含统计与简介）
  - `PUT /api/v1/users/:userId` → `{ user: UserProfile }`
- Mock 对齐：
  - 登录/注册：严格校验与持久化；头像按 email/用户名生成稳定 URL
  - `getUser/updateUser`：存取本地 Mock store，自动补齐头像
- 前端约束：
  - 服务端模式下，`avatarUrl` 仅支持 http(s)；拖拽得到的 `blob:` 地址仅用于本地预览，不会上送
  
### Posts（帖子）

- API（路径示例）：
  - 列表：`GET /api/v1/posts`（query 见筛选项）
  - 详情：`GET /api/v1/posts/:postId`
  - 创建：`POST /api/v1/posts`
  - 更新：`PUT /api/v1/posts/:postId`
  - 删除：`DELETE /api/v1/posts/:postId`
  - 点赞：`POST /api/v1/posts/:postId/like` / 取消：`DELETE /api/v1/posts/:postId/like`
  - 收藏：`POST /api/v1/posts/:postId/favorite` / 取消：`DELETE /api/v1/posts/:postId/favorite`
  - 更新约饭状态（companion）：`PUT /api/v1/posts/:postId/companion-status`
- 筛选项（列表）：`postType`、`shareType`、`category`、`canteen`、`cuisine`、`flavors[]`、`tags[]`、`minPrice`、`maxPrice`、`sortBy`（latest/hot/trending/price）、`page`、`limit`
- 前端实现：
  - Repositories：读操作使用未鉴权 HTTP 客户端；写操作使用鉴权客户端；统一 `unwrapApiResponse`
  - Services：对输入进行严格校验与规范化（详见 posts_service），仅返回与后端契约匹配的结果结构；
  - Mock：内存数据，支持分页、浏览量自增模拟与 like/favorite 状态切换；
  - 表现层：未耦合，可在后续 Screen/组件中逐步接入。
- `grid.tsx`：网格容器（结合断点切换列数/间距）
- `parallax_screen.tsx`：带视差头部的 Screen 变体
- `responsive_image.tsx`：按父容器/断点自适应的图片组件
  - 新增组件的主题接入：
    - `select.tsx`：选中态/分割线随主题变更
    - `editable.tsx`：头像预览卡与文本颜色走主题
    - `myself_screen.tsx`：头像编辑角标随主题调整透明度
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
- `src/app/index.tsx`：首页路由（根据登录态重定向 `/login` 或 `/explore`，加载期间展示全屏进度）
- `src/app/(auth)/_layout.tsx`：认证分组布局（已登录时自动跳转到探索页）
- `src/app/(tabs)/_layout.tsx`：底部标签页布局（未登录时重定向到登录页）
- `src/app/(tabs)/explore.tsx`、`post.tsx`：Tab 页入口
- `src/app/(tabs)/myself/_layout.tsx`：”我的“分组的嵌套路由栈布局（Stack）
  - 头部采用品牌 `AppbarHeader`，不再使用透明头部策略。
- `src/app/(tabs)/myself/index.tsx`：”我的“首页（路由入口，渲染个人界面 Screen）
- `src/app/(tabs)/myself/settings.tsx`：设置页（通过“我的”右上角进入）
- `src/app/(tabs)/settings.tsx`：兼容保留为 Redirect 到 `/myself/settings`（不在 Tab 上展示）

> 说明：app/ 目录的文件是“路由入口”，通常只做路由与 Screen 绑定，尽量保持薄。
### 2.9 screens/

页面级组件，负责绑定 Service/Context，组织 UI 组件与业务交互：

- `explore_screen.tsx`：探索页（瀑布流展示，列数与间距响应式；最新调整使筛选标签 Chip 间距/样式更紧凑，并补充价格/话题信息展示）
- `login_screen.tsx`：登录页（表单校验与调用 `auth_service`）
- `register_screen.tsx`：注册页（同上）
- `post_screen.tsx`：发帖页（输入校验 + `posts_service`，并已响应式调整文本框高度、间距）
- `post_detail_screen.tsx`：帖子详情页（统一展示话题标签与分享信息，保持与探索页信息一致，并针对分享类帖子增强摘要区块）
- `myself_screen.tsx`：个人中心页（顶部标题 + 右上角设置入口）
- `settings_screen.tsx`：设置页（主题切换、瀑布流高度参数；通过“我的”页进入；使用品牌 Appbar）。

### 2.10 models/

- `src/models/User.ts`
  - 用户对象模型（含 `role`，支持 `super_admin`）
- `src/models/Post.ts`
  - 帖子领域模型与类型集中定义：
    - `Post`（联合：`SharePost | SeekingPost | CompanionPost`）
    - `PostAuthor`（引用 `User` 的子集）与 `PostStats`
    - `PostCreateInput`/`PostCreateResult` 等创建相关类型

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
  - Access Token 存储于 `AuthStorage`（`STORAGE_KEYS.AUTH_TOKEN`）；Refresh Token 存储于 `AuthStorage`（`STORAGE_KEYS.REFRESH_TOKEN`）。
  - 鉴权客户端自动注入 Authorization 头。
- 仓储切换：
  - 由 `USE_MOCK` 控制选择 `MockAuthRepository` 或 `ApiAuthRepository`。
  - 配置来源：`.env` 中 `EXPO_PUBLIC_USE_MOCK=true/false`。

- 登录后体验优化：
  - 立即显示：从 JWT Payload 中解析 `nickname/name` 与 `avatarUrl/avatar`，立刻用于 UI 预览（无需等待网络）。
  - 完整信息：上下文会在后台调用 `/auth/me` 获取完整 `User` 并回填到 `user`，覆盖预览信息。
  - 字段兼容性：昵称兼容 `nickname`/`name`，头像兼容 `avatarUrl`/`avatar`。

- 刷新策略（当前实现）：
  - 提供 `authService.refresh()` 方法；上层可在需要时触发刷新并更新本地令牌。
  - 可选增强：在 `http_auth` 中加入 401 拦截 → 尝试 `refresh()` → 成功后重试原请求（未默认开启，待后端契约确认后再接入）。

---

## 6. Mock / Server 切换（操作指南）

- 在项目根（`danshi/`）创建 `.env` （参考.`env.example`）

---

## 7. 主题与设计系统（Theme + DS）

- `Colors`（light/dark）、`Spacing`、`Fonts`、`TypeScale` 在 `constants/theme.ts` 定义。
- Material 3 主题提供：
  - `src/app/_layout.tsx` 使用 `PaperProvider` 提供全局 MD3 主题。
  - `src/constants/md3_theme.ts` 将 `Colors` 映射到 MD3 token：`primary`、`background`、`surface`、`error`、`on*` 等。
  - 页面根容器与滚动容器统一使用 `theme.colors.background` 作为背景，卡片/浮层使用 `theme.colors.surface`。
- 品牌头部：
  - `src/components/md3/appbar.tsx` 统一 Appbar 的背景（`Colors.header`）与前景（`Colors.text`）。
- 组件规范：
  - 尽量直接使用 `react-native-paper` 组件；仅在需要统一风格/减少重复时增加轻包装。
  - 不在组件内部硬编码颜色，统一走主题（MD3 token 或 `useTheme()`）。

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

- constants（常量与主题）
  - `src/constants/app.ts`：存储键、接口路径、角色、正则、运行时开关（`USE_MOCK`）。
  - `src/constants/breakpoints.ts`：断点与选择器。
  - `src/constants/layout.ts`：布局相关常量（Spacing/Fonts/TypeScale）。
  - `src/constants/theme.ts`：主题系统（颜色/间距/字体/字阶）。
  - `src/constants/selects.ts`：下拉常量（`DEFAULT_HOMETOWN`、`HOMETOWN_OPTIONS`、`findOptionLabel`）。

- lib（基础设施）
  - `src/lib/errors/app_error.ts`：统一错误类型与归一工具。
  - `src/lib/http/client.ts`：未鉴权 HTTP 客户端。
  - `src/lib/http/http_auth.ts`：鉴权 HTTP 客户端（自动注入 Authorization）。
  - `src/lib/http/response.ts`：响应类型与解包器。
  - `src/lib/auth/auth_storage.ts`：token/refreshToken 存取。
  - `src/lib/auth/roles.ts`：角色与权限工具。

- repositories（数据访问）
  - `src/repositories/auth_repository.ts`：认证仓储（Mock/Api）。
  - `src/repositories/posts_repository.ts`：Posts 仓储（Mock/Api；列表/详情/创建/更新/删除/点赞/收藏/状态）。
  - `src/repositories/users_repository.ts`：Users 仓储（Mock/Api；支持 GET/PUT）。

- services（领域服务）
  - `src/services/auth_service.ts`：认证服务（登录/注册/刷新/登出）。
  - `src/services/posts_service.ts`：Posts 服务（校验+列表/详情/创建/更新/删除/点赞/收藏/状态）。
  - `src/services/users_service.ts`：Users 服务（校验与编排；avatarUrl 在 Mock/Server 下不同校验）。

- context（上下文）
  - `src/context/auth_context.tsx`：认证上下文与 Hook。
  - `src/context/waterfall_context.tsx`：瀑布流设置上下文。
  - `src/context/theme_context.tsx`：主题 Provider 与 Hook。

- hooks（响应式与工具）
  - `src/hooks/use_media_query.ts`、`src/hooks/use_responsive.ts`：响应式辅助。

- components（通用组件）
  - overlays：
    - `src/components/overlays/bottom_sheet.tsx`：底部弹窗。
  - md3：
    - `src/components/md3/appbar.tsx`：品牌 Appbar 包装。
    - `src/components/md3/masonry.tsx`：瀑布流容器。
  - 其他：
    - `src/components/parallax_scroll_view.tsx`、`src/components/themed_text.tsx`、`src/components/themed_view.tsx`、`src/components/haptic_tab.tsx`、`src/components/external_link.tsx`。

> 说明：原 `src/components/ui/` 目录已在 Material 3 迁移中移除；页面直接使用 Paper 组件与 md3 包装组件。

- app（路由入口）
  - `src/app/_layout.tsx`（根布局）与 `src/app/(tabs)/_layout.tsx`（Tab 分组）等。
  - `src/app/index.tsx`：依据登录态重定向 `/login` 或 `/explore`，加载时展示过渡。
  - `src/app/(auth)/_layout.tsx`：若已登录则直接跳转探索页。
  - `src/app/(tabs)/_layout.tsx`：未登录访问 Tab 时重定向到登录页。
  - `src/app/(tabs)/myself/_layout.tsx`：“我的”分组 Stack。
  - `src/app/(tabs)/myself/index.tsx` / `settings.tsx`。

- screens（页面）
  - `src/screens/explore_screen.tsx`：探索页；瀑布流卡片与筛选标签收紧间距，补全价格/话题信息展示。
  - `src/screens/post_detail_screen.tsx`：帖子详情；统一话题标签与分享信息呈现，增强分享摘要。
  - `src/screens/login_screen.tsx`、`register_screen.tsx`、`post_screen.tsx`。
  - `src/screens/myself_screen.tsx`：个人中心（点击头像编辑、单一编辑受控）。
  - `src/screens/settings_screen.tsx`：设置页（主题切换/瀑布流参数；头部透明）。

- models & utils
  - `src/models/User.ts`：用户模型。
  - `src/models/Post.ts`：帖子模型与创建类型。
  - `src/utils/index.ts`：工具方法聚合。

---

(完)

