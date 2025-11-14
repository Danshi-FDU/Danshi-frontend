## DanShi

### 本地运行说明

#### 1. 克隆代码库到本地

```bash
git clone https://github.com/Danshi-FDU/Danshi-frontend.git
cd Danshi-frontend/danshi
```



#### 2. 安装依赖

在工程目录 `danshi/` 下安装依赖（包含 Expo、Expo Router、react-native-paper 等）：

```bash
npm install
```



#### 3. 启动服务器

```bash
npm run start
```

或
```bash
npx expo start
```



#### 4. 在模拟器或真机上运行

移动端使用 Expo Go 应用扫描终端中显示的二维码，或在模拟器中运行应用

web端可以直接在浏览器中访问



更多内容可以参考 [Expo Documentation](https://docs.expo.dev/)



#### 5. 有关 Mock 和 API 的说明

参考 `\doc\Architecture\README.md` 和 `\danshi\.env.example`


---

### UI 与主题（Material 3）

- 本项目 UI 已迁移至 Material 3，使用 `react-native-paper@^5`。
- 全局主题通过 `PaperProvider` 提供，定义见 `src/constants/md3_theme.ts`：
	- 颜色来源于 `src/constants/theme.ts` 的 `Colors.light/dark`，映射到 MD3 token（`primary/background/surface/error` 等）。
	- 背景色在应用根与各页面容器中统一使用 `theme.colors.background`。
- 品牌 Appbar：`src/components/md3/appbar.tsx` 暴露 `AppbarHeader`，头部配色取 `Colors.header` 与 `Colors.text`。
- 旧自研 UI 目录 `src/components/ui/` 已移除；若需栅格/瀑布流，使用 `src/components/md3/masonry.tsx`。

常见入口：
- 主题切换上下文：`src/context/theme_context.tsx`（`ThemeModeProvider` / `useTheme()`）。
- 示例页面：`src/screens/*` 现使用 `react-native-paper` 的 `Card/TextInput/Button/List/Appbar` 等组件。

构建与发布（EAS 可选）：
```bash
npm run eas:login
npm run eas:init
npm run build:apk   # Android 预览包
npm run build:aab   # Android 上线包
```

