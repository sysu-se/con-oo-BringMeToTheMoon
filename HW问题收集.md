## HW 问题收集

列举在 HW 1、HW1.1 过程里，你所遇到的 2\~3 个通过自己学习已经解决的问题，和 2\~3 个尚未解决的问题与挑战

### 已解决

1. 啥是 “初始 givens 不可改” 数独约束
   1. **上下文**：HW1的review说：“作为核心领域对象，`guess(...)` 只做数组存在性判断后直接写值，没有校验数值范围、行列宫冲突，也没有体现“初始 givens 不可改”等典型数独约束。这样 `Sudoku` 实际上退化成二维数组包装器，不符合“领域对象负责业务规则”的建模目标”
   2. **解决手段**：询问AI

2. 为啥会有这个响应式风险
   1. **上下文**：HW1.1的review说：“`Sudoku.getGrid()`、`Sudoku.getFixed()` 和 `Game.getSudoku()` 都返回内部引用。外部代码可以绕过 `guess()`、history 和输入校验直接修改棋盘，这破坏了封装；在 Svelte 场景下还会带来“对象内部已变但 store 未同步”的响应式风险”
   2. **解决手段**：询问CA，CA解释 Svelte 的机制是顶层赋值更新

3. 啥是 “常见 Svelte 惯例”
   1. **上下文**：HW1.1的review说：“自定义 store 组合方式不符合常见 Svelte 惯例：`gameStore.subscribe()` 通过临时订阅子 `store` 读取当前值，再手工拼装对象回调，而不是使用更直接的 derived/readable 或单一 writable 状态。这种写法增加了理解成本，也让 `grid`、`fixed`、`gamePaused` 的一致性依赖手工同步逻辑。”
   2. **解决手段**：询问CA

### 未解决

1. 未接入序列化和反序列化功能到 View 层

   1. **上下文**：`Sudoku.toJSON()` 和 `Sudoku.fromJSON()` 已实现，`App.svelte` 中通过 URL hash (`#sencode`) 读取棋局，但完整游戏状态（包含 Undo/Redo 历史）尚未接入 View 层，无法持久化或分享

   2. **尝试解决手段**：还没时间尝试，DDL 要到了

2. 感觉gameStore的设计过于庞大，不符合“人”的阅读能力

   1. **上下文**：`gameStore`包含了以前`game.js`和`store.js`的所有功能，代码全挤在一起

   2. **尝试解决手段**：询问CA，CA说这样挺好，再改就是细分gamestore了
