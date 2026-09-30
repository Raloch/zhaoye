# 照夜封魔录（zhaoye）

横版动作 ARPG，灵感来自 Flash 小游戏《灵剑封魔录》。当前进度：**M1 战斗原型**（灰盒训练场）。

## 命令

```bash
pnpm dev         # 开发服务器 http://localhost:5174
pnpm test        # 单元测试（纯逻辑，无需浏览器）
pnpm typecheck   # tsc --noEmit
pnpm check:fix   # Biome 格式化 + lint 自动修复
pnpm build       # typecheck + 生产构建
```

## 目录

```
docs/        设计文档（从 00-overview.md 读起）
concept/     视觉设定集（角色骨骼已移植到 src/render/rig；水墨背景 M2 再移植）
src/core/    纯逻辑：输入、指令识别、招式数据、物理、敌人 AI、命中结算
src/render/  渲染、特效、HUD、调试层；rig/ 是骨骼剪影、招式关键帧、软链（发带、马尾）
src/audio/   WebAudio 合成的占位音效
tests/       指令识别、物理、连段、防御、连击评级、确定性
```

## 训练场操作

| 键 | 作用 |
|---|---|
| A / D | 移动，双击疾跑 |
| K 或空格 | 跳，空中再按二段跳；被击飞时受身；S+K 下平台 |
| J | 攻击，连按出青锋四式，按住蓄力 |
| W+J / S+J | 上挑 / 扫堂（空中 S+J 是坠星） |
| L | 按住格挡，受击前 6 帧内按下是弹反；L+A/D 闪步 |
| U / O | 照夜 / 奥义（剑意满） |
| ←→J ↓→J ↓↑J →→J ↓↓J | 穿云刺、剑气·破月、升龙斩、疾风连斩、镇地剑 |

训练场热键：`1` 灰狼、`2` 狼卫、`3` 木桩、`0` 清空、`R` 重置、`H` 招式表、`M` 静音。

开发工具：
- http://localhost:5174/lab.html 姿势实验室：每招的预备、出招、收势、回站放大排成一张表，调 `src/render/rig/heroPoses.ts` 时对着看。
- http://localhost:5174/?zoom=3 镜头以主角为中心放大 3 倍，看动作细节用。

调试：`F1` 判定框、`F2` 帧数据条、`F3` 慢放、`F4` 暂停、`]` 逐帧、`F5` 输入历史、`F6` 无敌 + 灵力无限、`F9` 存快照、`F10` 读快照。Mac 上 F 键可能要配合 fn，或者直接点画面下方的按钮。

## 分层

和 adder 一样：**`src/core/` 里不许出现 `document`、`window`、`Date.now()`、`Math.random()`。**

- `step(state, input)` 推进一帧（60Hz），确定性：同一个种子 + 同一串输入，结果完全一样（`tests/combat.spec.ts` 里有断言）。
- 随机数状态存在 `GameState.rng` 里，所以 F9 快照能连随机序列一起还原。
- 手感参数在 `src/core/config.ts`，招式帧数和判定框在 `src/core/moves.ts`，敌人在 `src/core/enemies.ts`。调手感只改这三个文件。
- core 通过 `state.events` 告诉表现层这一帧发生了什么（命中、弹反、落地……），渲染和音效只读事件，从不反过来影响逻辑。
- 顿帧只停逻辑：顿帧期间输入照常进历史和缓冲，粒子照常动。

## 视觉设定集

```bash
python3 -m http.server 5180 --directory concept
```

然后访问 http://localhost:5180 。
