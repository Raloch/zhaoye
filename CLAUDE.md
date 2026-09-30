# 照夜封魔录 · Agent 须知

命令、目录、分层见 [README.md](README.md)，设计文档从 [docs/00-overview.md](docs/00-overview.md) 读起。

## 规矩

- `src/core/` 里不许出现 `document`、`window`、`Date.now()`、`Math.random()`。随机数用 `core/rng.ts` 的 `nextRandom(state)`。
- 手感参数只改 `src/core/config.ts`、`moves.ts`、`enemies.ts`；帧数改了要同步 `docs/03-combat.md` 的招式表和 `tests/player.spec.ts` 的帧数断言。
- 表现层只读 `state.events`，不反过来改逻辑。
- 改完跑 `pnpm typecheck && pnpm test && pnpm check:fix`。

## 验证

### 动作和画面：用 Playwright，别用 Browser 面板截图

Browser 面板被隐藏时截图是空白或错位的。改用 Playwright 无头浏览器：

1. `pnpm dev` 起在 5174 端口，Playwright 打开 `http://localhost:5174/?zoom=2.4`（`?zoom=` 以主角为中心放大镜头，仅开发环境）。
2. 用开发钩子 `window.__zhaoye` 摆好场景、逐帧喂输入。`feed` 会先暂停游戏，所以结果不受真人手速和机器快慢影响：

   ```js
   const g = window.__zhaoye
   g.command('r'); g.command('0')        // 重置、清空敌人（command 接训练场热键）
   g.state.player.x = 200; g.command('3') // 放个木桩
   g.feed([[[], 40]])                     // [按住的键, 帧数]
   g.state.enemies[0].x = 228
   g.feed([[['attack'], 1], [[], 6], [['attack'], 1], [[], 9]])  // 停在想看的那一帧
   ```

3. 对 `#game` 元素截图，保存到 `.playwright-mcp/` 下（Playwright 只允许写 `/Users/lurui/products/games` 之内），再用 Read 看图。

### 音效：看频段分布，不靠耳朵

改了 `src/audio/sfx.ts` 之后，在页面里跑 `await window.__zhaoye.analyzeSfx('hit')`，它离线渲染这个声音并返回各频段能量占比（%）。

- 命中类（`hit`、`crit`）：`<200Hz` 应接近 0，主体在 `2k-5k`。低频一高就又变回了「咚」。
- 重击（`hitHeavy`）：低频约 15% 左右，给厚度但不闷。
- 这只能挡住明显跑偏，好不好听最终要用户试听。

### 姿势：对照姿势实验室

改了 `src/render/rig/heroPoses.ts` 之后打开 `http://localhost:5174/lab.html`，全部招式的「预备 / 出招 / 收势 / 回站」和移动、防御姿势排成一张表。很多姿势继承同一个 `BASE`，改一处可能连带多个招式，一张图能一次看全。
