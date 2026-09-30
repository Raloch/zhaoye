# 技术方案

沿用 adder 的做法：TypeScript + Vite + Canvas 2D，零运行时依赖，pnpm + Biome + Vitest。

## 铁律（和 adder 一样）

**`src/core/` 里不许出现 `document`、`window`、`Date.now()`、`Math.random()`。**

这条规矩在动作游戏里收益更大：

- 一局 = `种子 + 每帧输入`，能完整回放。**Boss 战回放可以做成回归测试**：改了帧数据后重放一遍，看结果有没有变。
- 连招、指令识别、伤害计算都能在 Node 里直接单测。
- 调试工具（逐帧、慢放、回退）很好做：状态是纯数据，存个快照就能回退。

## 分层

```
src/
├── main.ts               装配层
├── core/                 纯逻辑，60Hz 固定步长
│   ├── types.ts          实体与状态的数据结构
│   ├── rng.ts            种子随机数（复用 adder 的 mulberry32）
│   ├── physics.ts        AABB 与图块碰撞、单向平台
│   ├── combat/
│   │   ├── moves.ts      招式定义（纯数据：帧数据、判定框、取消规则）
│   │   ├── command.ts    指令识别：recognize(history, facing) → move
│   │   ├── hit.ts        命中判定、伤害、受击状态、韧性、连击修正
│   │   └── combo.ts      连击计数、评级、剑意
│   ├── actors/
│   │   ├── player.ts     玩家状态机
│   │   ├── ai/           敌人 AI（状态机 + 攻击令牌）
│   │   └── enemies/      各种敌人的数据和招式
│   ├── level/            关卡加载（ASCII → 图块）、锁屏战、波次、触发器
│   └── game.ts           step(state, input, rng) → state
├── input/                物理按键 → 每帧输入位掩码；按键映射
├── loop/ticker.ts        固定步长累加器（复用 adder）
├── render/
│   ├── rig/              骨骼、姿势插值、软链物理、部件绘制
│   ├── bg/               程序化水墨背景
│   ├── fx/               粒子、剑光、墨溅、冲击帧
│   ├── camera.ts         跟随、锁屏、震动
│   └── hud.ts
├── audio/                WebAudio：合成音效、分层音乐
└── ui/                   菜单、对话、设置（DOM 覆盖层）
```

## 关键设计

### 1. 逻辑帧与渲染帧

- 逻辑固定 60Hz，和帧数据一一对应。
- 渲染跟随显示器刷新率，在两个逻辑帧之间插值位置。
- **顿帧只停逻辑**，粒子、软链继续在渲染层运动。

### 2. 招式是数据

```ts
interface MoveDef {
  id: MoveId
  command: Command            // 例如 ['down', 'fwd', 'attack']
  mpCost: number
  startup: number             // 起手帧数
  active: number              // 判定帧数
  recovery: number            // 收招帧数
  hitboxes: HitboxFrame[]     // 逐帧判定框（相对角色原点）
  damage: number              // 倍率
  onHit: HitEffect            // 硬直、击退、挑空、击倒、弹起……
  cancels: CancelRule[]       // 能取消到哪些招式、在哪个窗口
  motion?: MotionCurve        // 招式自带的位移
  invuln?: [number, number]   // 无敌帧区间
  pose: PoseTrackId           // 对应的骨骼动画
}
```

调手感就是改数据表。调试模式下支持热重载。

### 3. 判定框和动画分离

判定框写在招式数据里，**不从动画推导**。动画只负责表现，逻辑不依赖骨骼姿势。这样 core 不需要知道骨骼的存在，渲染层也能随时替换。调试模式可以把判定框叠加在画面上，方便对齐。

### 4. 输入

- 每个逻辑帧采样一次，变成一个位掩码 `InputFrame`（方向 + 7 个动作键的「按住」和「刚按下」）。
- 输入历史是长度 30 的环形缓冲区，交给指令识别使用。
- 回放就是一个 `InputFrame[]`。

### 5. 实体

不上完整的 ECS，用「按类型分组的数组 + 系统函数」：

```ts
interface GameState {
  frame: number
  player: Player
  enemies: Enemy[]
  projectiles: Projectile[]
  level: LevelState
  combo: ComboState
  camera: CameraState       // 锁屏范围等逻辑信息；震屏属于渲染层
  events: GameEvent[]       // 本帧发生的事：命中、弹反、死亡……给渲染和音频消费
}
```

`events` 是 core 和表现层之间唯一的通道。core 只说「第 1234 帧，(x, y) 处发生了一次重击命中」，渲染层据此放墨溅、震屏，音频层据此放音效。

## 测试

| 测试 | 例子 |
|---|---|
| 指令识别 | `↓` `→` `J` 在 12f 内输入 → 剑气·破月；间隔 13f → 普攻 |
| 取消规则 | 普攻挥空时不能取消成特技 |
| 帧数据 | 青锋·一的第 5 帧没有判定，第 6 帧有 |
| 伤害 | 连击第 20 下起伤害 ×0.8 |
| 物理 | 单向平台能从下方穿上去，S+K 能跳下来 |
| AI | 任意时刻持有攻击令牌的敌人 ≤ 2 |
| 回放 | 录一段打黑鬃的回放，断言结束时 Boss HP = 0、总帧数 = N |

## 调试工具（M1 必做）

没有这些工具就没法调手感，所以放在 M1：

- `F1` 显示判定框（攻击红、受击蓝、推挤绿）
- `F2` 帧数据浮层（当前招式、第几帧、处于起手/判定/收招哪一段）
- `F3` 慢放（0.25× / 0.5×）；`F4` 暂停 + 逐帧
- `F5` 输入历史（类似格斗游戏训练模式）
- `F6` 无敌 / 灵力无限
- `F9` 存状态快照，`F10` 读取快照

## 性能预算

- 目标：中端笔记本稳定 60fps。
- 同屏敌人 ≤ 12，粒子 ≤ 600（对象池）。
- 背景预渲染到离屏画布。
- 每帧尽量零分配，避免 GC 卡顿。

## 存档

- 用 `localStorage`，读写都包 try/catch，读不到就用默认值。
- 内容：章节进度、等级经验、灵石、道具、饰品、悟道、设置、各章最高评级。
- 带版本号，格式变更时做迁移。
