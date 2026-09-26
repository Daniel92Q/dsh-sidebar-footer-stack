# dsh-sidebar-footer-stack

[English](./README.en.md) | **中文**

把 DeepSeek Harness 侧栏底部的插件卡片**纵向堆叠**、**统一卡片外观**，并支持**拖动换序**。

> DSH 插件（`dsh.client` 浏览器半区 + 空宿主半区）。已在 DSH `0.1.7-rc.2` 桌面版实测。

## 它解决什么问题

侧栏底部的 `sidebar.footer.action` 槽位，是宿主留给插件放「常驻小卡片」的位置（会话费用、记忆入口等）。宿主把该槽位的容器渲染成**一行** `display:flex`，于是装了两个以上插件时，每张卡片各占一半宽度、内容被挤到看不全：

```
未安装本插件                        安装本插件后
┌───────────┬───────────┐          ┌──────────────────────┐
│ 费用卡片   │ 记忆卡片   │          │ 费用卡片              │
│ （被挤窄） │ （被挤窄） │          ├──────────────────────┤
└───────────┴───────────┘          │ 记忆卡片              │
                                   └──────────────────────┘
```

本插件做三件事：

| 能力 | 说明 |
| --- | --- |
| **纵向堆叠** | 槽位内所有条目改为纵向排列、各占满宽；以后新装的插件自动适用，无需再改代码 |
| **统一卡面** | 所有条目套用统一卡片外观：`1px` 边框（`--dsw-alias-border-l1`）+ `12px` 圆角 + `--dsw-alias-bg-layer-1` 底色；**已经自带卡片的条目不会被套上第二层框** |
| **拖动换序** | 按住一张卡片拖到另一张的上半区/下半区松手即可改变顺序；顺序写入 `localStorage`，刷新与重启后保持 |

## 安装

### 方式一：npm

```sh
dsh plugin --profile web add dsh-sidebar-footer-stack
```

### 方式二：GitHub 仓库

```sh
dsh plugin --profile web add github:Daniel92Q/dsh-sidebar-footer-stack
```

### 方式三：本地目录（开发调试）

```sh
git clone https://github.com/Daniel92Q/dsh-sidebar-footer-stack
dsh plugin --profile web add /absolute/path/to/dsh-sidebar-footer-stack
```

把 `web` 换成你自己的 profile 名。**桌面版（Electron）用户请走应用内「设置 → 插件 → 添加插件」**：官方桌面应用独占 `desktop` profile，`dsh plugin --profile desktop` 会被 CLI 明确拒绝。

本插件**不含任何构建脚本**（纯 JS，装完即可用），因此不会被 pnpm 的 `allowBuilds` 拦下。

安装后重启该 profile 的 Harness 进程；从 UI 安装并按提示刷新时，刷新即可。

## 使用

| 操作 | 行为 |
| --- | --- |
| 拖动卡片 | 光标变抓手；拖到目标卡片的**上半区**松手 → 插到它前面，**下半区** → 插到它后面。只有两张卡片时，这两种就是「互换」 |
| 拖动反馈 | 被拖卡片降到 45% 透明度；目标边缘出现 2px 品牌色提示线 |
| 重置顺序 | 再拖回去即可；或清除 `localStorage` 键 `dsh-sidebar-footer-stack.order` |
| 收起侧栏 | 侧栏收成窄轨道时，条目改为居中排列，不套用卡面 |

## 工作原理

三个关键决定，想改它的人值得先看：

1. **选择器只匹配 CSS module 的类名后缀。**
   同一个宿主版本，装进应用（`app.asar`）与 npm 发布副本的类名哈希**不一样**（应用内是 `n_2Q3W_footerActions`，发布副本是 `hHd-Xa_footerActions`）。写死完整类名会**静默零命中**——不报错，也不生效。所以本插件一律用 `[class*="footerActions"]`。

2. **条目不在容器的第一层。**
   宿主渲染器在槽位里放了一层**无 class、尺寸 0×0 的出口包装元素**（`display:contents`），真正的插件条目是**它的子元素**。把边框写在第一层，就会画在那个看不见的元素上，表现为「改了完全没反应」。所以卡面规则写两级：`> *` 与 `> *:not([class]) > *`，并显式清掉那层包装自身的边框与底色。

3. **排序用 flex `order`，不移动 DOM 节点。**
   槽位是 React 渲染的，命令式移动节点会被下一次 re-render 按插件注册顺序原样还原；而 `order` 是 React 不接管的样式，能稳定存活。顺序按「条目身份」存进 `localStorage`——身份取类名，没有类名则取 `data-*` 属性名（例如 `@a9i5k4/dsh-auto-memory` 的按钮是 `data-dam-sidebar-btn`）。

## 兼容性与失败方式

- **实测**：DSH `0.1.7-rc.2`（官方桌面版 Electron 应用）。
- 本插件依赖宿主的两处内部结构：槽位容器类名后缀 `footerActions`，以及「出口包装层 + 条目」的两层 DOM。
- 宿主升级若改了这两处，插件会**静默失效**：不报错，卡片回到宿主原本的横向并排。它不会破坏宿主，也不会影响你的数据。
- 侧栏收起轨道的观感由宿主与各插件的内联样式决定，本插件只保证不覆盖它们的居中布局。

## 排查（诊断上报）

诊断上报默认**关闭**。需要时打开：

```js
localStorage.setItem('dsh-sidebar-footer-stack.debug', '1')   // 然后刷新页面
```

此后浏览器半区会把观测到的 DOM 快照（容器类名、`flex-direction`、每个条目的 class / `order` / 计算后边框 / 尺寸）POST 给宿主半区的一条本地路由，落盘到：

```
~/.dsh/sidebar-footer-stack-probe.ndjson
```

提 issue 时附上这个文件即可（只含 DOM 结构与样式值，**不含任何会话内容**；文件超过 1 MB 后不再追加）。

关闭：`localStorage.removeItem('dsh-sidebar-footer-stack.debug')`。

## 卸载

```sh
dsh plugin --profile <name> remove dsh-sidebar-footer-stack
```

桌面版从应用内「插件」页卸载。卸载后侧栏底部卡片回到宿主原本的横向排列。

## 开发

```sh
git clone https://github.com/Daniel92Q/dsh-sidebar-footer-stack
dsh plugin --profile web add /path/to/clone     # 以 link 方式装进 profile
# 之后改 lib/client.js，刷新页面即生效
```

两个实用事实：

- 宿主给客户端 bundle 的**版本号由文件 `mtime/ctime/size` 派生**，所以「改文件 → URL 变化 → 浏览器自动重新拉取」，不需要重启应用。
- 宿主会**热替换客户端 bundle 而不刷新页面**，因此注入样式必须支持「标签已存在就就地更新 `textContent`」；写成「已存在即 return」会让页面永远沿用旧 CSS，表现为「改了文件毫无反应」。

## 许可

[MIT](./LICENSE)
