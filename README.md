# 旦食前端 (Danshi Frontend)

旦食是一个校园美食分享与互动平台的前端应用，基于 Expo 与 React Native 构建，支持移动端与 Web 端多端运行。

## 📋 目录

- [技术栈](#技术栈)
- [项目架构](#项目架构)
- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [分发与发布](#分发与发布)
- [开发指南](#开发指南)
- [相关文档](#相关文档)

## 🛠 技术栈

- **框架**: Expo + React Native
- **语言**: TypeScript
- **路由**: Expo Router
- **UI**: react-native-paper（Material 3）
- **状态/上下文**: React Context
- **网络层**: 统一 HTTP 客户端 + 鉴权客户端
- **存储**: AsyncStorage（Token/缓存）

## 🏗 项目架构

前端采用“分层 + 目录模块化”组织方式，核心分层自下而上如下：

- **Config & Constants**：配置与常量集中管理
- **Infra**：错误模型、HTTP 客户端、认证存储与权限工具
- **Repositories**：数据访问层，屏蔽 API/Mock/本地差异
- **Services**：用例服务层，输入校验与业务编排
- **Presentation**：Hooks / Context / Components / Screens / Routes

目录结构（节选）：

```
danshi/
├── src/
│   ├── app/                # 路由入口（Expo Router）
│   ├── screens/            # 页面级组件（绑定 Service/Context）
│   ├── components/         # 通用组件与 MD3 包装
│   ├── context/            # 全局状态与上下文
│   ├── hooks/              # 响应式与媒体查询
│   ├── services/           # 用例服务（校验/编排）
│   ├── repositories/       # 资源仓储（API/Mock/本地）
│   ├── lib/                # Infra：HTTP/Auth/Error
│   ├── models/             # 领域模型定义
│   ├── constants/          # 常量与开关
│   └── config/             # 运行时配置
├── assets/                 # 静态资源
└── app.json                # Expo 配置
```

### 架构说明

- **Config & Constants**: `src/config/`、`src/constants/` 统一配置与开关（如 `USE_MOCK`、`API_BASE_URL`）
- **Infra**: `src/lib/`（HTTP 客户端、鉴权、错误模型、JWT 解析）
- **Repositories**: `src/repositories/` 提供资源级接口（Mock/Api 自动切换）
- **Services**: `src/services/` 用例级校验与流程编排
- **Presentation**: `src/app/` 路由入口、`src/screens/` 页面、`src/components/` 组件、`src/context/` 全局状态

## ✨ 功能特性

- 用户注册/登录与鉴权
- 帖子浏览、详情、创建与互动（点赞/收藏）
- 搜索、通知、关注与个人中心
- 主题切换与响应式布局
- Mock/Server 一键切换（`USE_MOCK`）（本地 Mock 已废弃）

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 pnpm
- 已安装 Expo Go（移动端调试）

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/Danshi-FDU/Danshi-frontend.git
cd Danshi-frontend/danshi
```

2. **安装依赖**

```bash
npm install
```

3. **启动开发服务**

```bash
npm run start
```

或

```bash
npx expo start
```

4. **运行应用**

- **移动端**: 使用 Expo Go 扫描二维码
- **模拟器**: 选择 iOS/Android 模拟器运行
- **Web 端**: 在浏览器中访问 Expo Web

## ⚙️ 环境配置

1. **环境变量**

请参考 [danshi/.env.example](danshi/.env.example) 创建本地 `.env` 文件，重点配置：

- `EXPO_PUBLIC_API_URL`：后端 API 基地址
- `EXPO_PUBLIC_REQUEST_TIMEOUT_MS`：请求超时时间
- `EXPO_PUBLIC_USE_MOCK`：Mock 开关（true/false）

2. **Mock 与接口说明**

Mock/Server 切换与接口契约说明详见 [doc/Architecture/README.md](doc/Architecture/README.md)。

## 📦 分发与发布

本项目使用 Expo/EAS 进行多端分发。以下为常见发布流程：

### 应用标识与版本

- **应用名**：DanShi
- **slug**：DanShi
- **版本**：0.3.0
- **iOS Bundle ID**：com.exdoubled.danshi
- **Android Package**：com.exdoubled.DanShi
- **Web 输出**：static
- **EAS Project ID**：-----eas-project-id-----

如需修改发布信息，请同步更新 [danshi/app.json](danshi/app.json) 与相关分发流程。

### 1. 预览分发

适用于测试与产品验收，无需上架：

```bash
# 生成测试包（Android/iOS）
eas build -p android --profile preview
eas build -p ios --profile preview
```

构建完成后可在 EAS Dashboard 下载安装包或通过邀请分发。

### 2. 生产发布

```bash
# 生成生产包
eas build -p android --profile production
eas build -p ios --profile production
```

如需上架，可使用：

```bash
eas submit -p android --profile production
eas submit -p ios --profile production
```

#### iOS TestFlight 发布流程

本项目 iOS 生产构建在 [danshi/eas.json](danshi/eas.json) 中使用 `production` profile（`distribution=store`）。

**前置条件**

- 用于签名的 Apple ID 必须在 https://developer.apple.com/account 中属于某个 **Team**，且该 Team 具有 **付费 Apple Developer Program** 会员资格。
  - 仅能登录 https://appstoreconnect.apple.com 并不代表有 Developer Portal Team。
- `ios.bundleIdentifier` 必须与 App Store Connect 中创建的 App 的 Bundle ID 一致。
- App Store Connect 需要有足够权限（例如“App 管理”通常足够进行 TestFlight 配置）。

**步骤 A：构建 ipa（生成可用于 TestFlight 的构建产物）**

在 `Danshi-frontend/danshi` 目录执行：

```bash
npm install
npm run eas:login
npm run build:ios:testflight
```

构建完成后，终端会输出 EAS 构建链接；可以在 EAS Dashboard 查看构建状态与产物。

**步骤 B：提交到 TestFlight（上传到 App Store Connect）**

推荐使用 App Store Connect API Key（更稳定，避免 Apple ID 2FA 交互问题）：

1) 打开 App Store Connect → Users and Access → Keys
2) 创建一个 API Key（角色建议 `App Manager` 或更高）
3) 下载 `.p8`（只会提供一次），记下 `Key ID` 和 `Issuer ID`

然后在终端提交：

```bash
npm run submit:ios:testflight
```

首次提交会进入交互式配置（可选择使用 API Key 或 Apple ID）；按提示完成后会开始上传。

**步骤 C：在 App Store Connect 发放 TestFlight 安装**

1) App Store Connect → 你的 App → TestFlight
2) 等待构建从 `Processing` 变为可用（苹果需要处理一段时间）
3) 选择测试范围：
   - Internal Testing：团队内部人员，通常最快
   - External Testing：外部测试，需要添加测试员，且首次可能需要 Beta App Review
4) 选择“公开链接（Public Link）”或邀请指定测试员

**常见问题排查**

- `Authentication with Apple Developer Portal failed! You have no team associated...`
  - 处理：确认 https://developer.apple.com/account 的 Membership 为 Active，且能看到 Team。
  - 如果你只有 App Store Connect 权限：让 Account Holder 在 Developer Portal 把你加入 Team（并授予证书/描述文件相关权限）。
- Bundle ID 不匹配/找不到 App
  - 处理：检查 `danshi/app.json` 的 `expo.ios.bundleIdentifier` 与 App Store Connect 中的 Bundle ID 是否一致。
- External Testing 卡住
  - 处理：先走 Internal Testing；外部测试按 App Store Connect 提示补齐合规信息并提交 Beta App Review。

### 3. Web 分发

```bash
npx expo export --platform web
```

生成的静态文件位于 dist/，可部署到任意静态托管服务。

## 🧭 开发指南

- 统一使用 `services` 与 `repositories` 进行业务与接口拆分
- 新页面优先使用 Expo Router 的文件路由约定
- 组件样式优先使用主题与常量，避免硬编码
- 读操作走未鉴权 HTTP 客户端，写操作走鉴权客户端

## 📚 相关文档

- [doc/Architecture/README.md](doc/Architecture/README.md)
- [Expo Documentation](https://docs.expo.dev/)
