# Sudoku/Game 领域对象设计文档

## 一、核心问题回答

### 1. Sudoku / Game 的职责边界是什么？

#### Sudoku（数独棋盘）

**职责**：管理 9x9 棋盘的状态和基本操作

| 职责 | 具体实现 |
|------|----------|
| 持有棋盘数据 | `#grid` 私有属性，9x9 二维数组 |
| 持有固定掩码 | `#fixed` 私有属性，区分题目数字和用户输入 |
| 用户操作 | `guess(move)` - 在非固定格子执行操作 |
| 深拷贝 | `clone()` - 显式深拷贝，保证独立性 |
| 序列化 | `toJSON()` - 输出 grid 和 fixed |
| 反序列化 | `fromJSON()` - 从 JSON 恢复 |
| 外表化 | `toString()` - 美观的调试输出 |

**边界**：Sudoku 只关心棋盘状态本身，不关心游戏历史、胜负判定等。

#### Game（游戏会话）

**职责**：管理游戏会话，包括状态管理和历史操作

| 职责 | 具体实现 |
|------|----------|
| 持有当前状态 | `#currentSudoku` - 当前 Sudoku 实例 |
| 管理 Undo 历史 | `#undoStack` - 存储之前的 Sudoku 快照 |
| 管理 Redo 历史 | `#redoStack` - 存储被撤销的状态 |
| 执行操作 | `guess(move)` - 保存快照后执行操作 |
| 撤销/重做 | `undo()` / `redo()` - 栈操作 |
| 查询能力 | `canUndo()` / `canRedo()` |
| 获取状态 | `getSudoku()` - 返回当前 Sudoku |
| 序列化 | `toJSON()` - 保存完整游戏状态 |

**边界**：Game 关注游戏流程，不直接操作棋盘格子，而是委托给 Sudoku。

---

### 2. Move 是值对象还是实体对象？为什么？

**Move 是值对象。**

**理由**：

1. **无唯一标识**：Move 只有 `row`、`col`、`value` 三个属性，没有唯一 ID
2. **不可变**：Move 创建后不会被修改
3. **相等性基于值**：两个 Move 如果 row/col/value 相同，它们等价
4. **轻量级**：不需要生命周期管理，只是操作信息的载体

```js
// Move 的相等性示例
const move1 = new Move({ row: 0, col: 1, value: 5 });
const move2 = new Move({ row: 0, col: 1, value: 5 });
// move1 和 move2 在语义上等价
```

---

### 3. History 中存储的是什么？为什么？

**存储 Sudoku 快照。**

#### 原因分析

| 方案 | 优点 | 缺点 |
|------|------|------|
| 存储 Move | 内存最优 | 需要逆操作逻辑，Undo/Redo 复杂 |
| **存储快照** | **实现简单，行为可靠** | 内存稍多（9x9 棋盘很小）|
| 存储 Diff | 平衡方案 | 实现复杂度中等 |

**选择快照的理由**：

1. **实现简单**：直接 clone() 当前 Sudoku，undo 时直接恢复
2. **行为可靠**：不会出现"逆操作计算错误"的情况
3. **内存可控**：9x9 = 81 个数字，每次快照约 1KB，极小
4. **符合测试要求**：测试用例明确要求存储快照

```js
// 历史存储示意
guess(move) {
  this.#undoStack.push(this.#currentSudoku.clone());  // 保存快照
  this.#currentSudoku.guess(move);                    // 执行操作
  this.#redoStack = [];                                // 清空 redo
}

undo() {
  this.#redoStack.push(this.#currentSudoku.clone());
  this.#currentSudoku = this.#undoStack.pop();        // 直接恢复快照
}
```

---

### 4. 复制策略是什么？哪些地方需要深拷贝？

#### 复制策略

| 场景 | 策略 | 原因 |
|------|------|------|
| Sudoku 构造时 | 深拷贝 input | 防御性拷贝，防止外部修改内部数据 |
| Sudoku.clone() | 深拷贝 grid 和 fixed | 保证克隆实例完全独立 |
| Game 保存快照 | 调用 sudoku.clone() | 存储完整独立的历史状态 |
| getGrid() 返回 | **返回引用** | 调用者需要时显式 clone() |

#### 必须深拷贝的地方

1. **Sudoku 构造函数** - 防止外部数组被修改
2. **Sudoku.clone()** - 保证克隆体独立
3. **Sudoku.toJSON()** - 序列化时返回副本
4. **Game.guess() / undo() / redo()** - 保存快照时调用 clone()

#### 浅拷贝会导致的问题

```js
// 错误示例：浅拷贝导致的问题
const original = new Sudoku(grid);
const shallowCopy = original;  // 引用赋值

shallowCopy.guess({ row: 0, col: 0, value: 5 });
// original 的数据也被修改了！

// 正确做法
const deepCopy = original.clone();
deepCopy.guess({ row: 0, col: 0, value: 5 });
// original 不受影响
```

---

### 5. 序列化/反序列化设计是什么？

#### Sudoku 序列化

```js
// toJSON() 输出格式
{
  grid: number[][],    // 当前完整局面
  fixed: boolean[][]    // 固定掩码
}

// fromJSON() 恢复
Sudoku.fromJSON(json) → new Sudoku({ grid, fixed })
```

#### Game 序列化

```js
// toJSON() 输出格式
{
  currentSudoku: { grid, fixed },
  undoStack: [{ grid, fixed }, ...],
  redoStack: [{ grid, fixed }, ...]
}

// fromJSON() 恢复
Game.fromJSON(json) → new Game({ sudoku: Sudoku.fromJSON(...) })
```

#### 设计要点

1. **完整状态保存**：Game 序列化包含 undo/redo 栈，可完全恢复
2. **统一格式**：使用 `{ grid, fixed }` 格式，便于扩展
3. **工厂函数**：通过 `createSudokuFromJSON` / `createGameFromJSON` 创建

---

### 6. 外表化接口是什么？为什么这样设计？

#### toString()

```js
// 输出示例
╔═══════╤═══════╤═══════╗
║ 5 3 · │ · 7 · │ · · · ║
║ 6 · · │ 1 9 5 │ · · · ║
║ · 9 8 │ · · · │ · 6 · ║
╟───────┼───────┼───────╢
║ 8 · · │ · 6 · │ · · 3 ║
...
╚═══════╧═══════╧═══════╝
```

**设计理由**：
- 复用 `@sudoku/sudoku.js` 的美化格式
- 便于调试，快速了解棋盘状态
- 美观易读，符合项目风格

#### toJSON()

**设计理由**：
- 提供可序列化的数据结构
- 支持保存/恢复功能
- 便于网络传输或本地存储

---

## 二、设计思路

### 1. 分层架构

```
┌─────────────────────────────────────────┐
│           UI Layer (Svelte)             │
│   Board.svelte, Controls, Keyboard       │
└─────────────────┬───────────────────────┘
                  │ 事件转发
                  ▼
┌─────────────────────────────────────────┐
│         Domain Layer (我们实现的)         │
│                                         │
│  ┌─────────┐    ┌─────────┐    ┌─────┐  │
│  │  Move   │    │ Sudoku  │    │Game │  │
│  │(ValueObj)│   │ (State) │    │(Ctrl)│  │
│  └─────────┘    └─────────┘    └─────┘  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│        Infrastructure Layer             │
│     @sudoku/stores, Svelte Store       │
└─────────────────────────────────────────┘
```

### 2. 对象职责划分

```
┌─────────────────────────────────────────────────────┐
│  Move - 值对象                                       │
│  - 封装操作信息 {row, col, value}                    │
│  - 不可变，无生命周期                                │
│  - 提供 toJSON() 序列化                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Sudoku - 状态对象                                    │
│  - 持有 #grid (#fixed)                               │
│  - 提供 guess() 操作                                  │
│  - 提供 clone() 深拷贝                               │
│  - 提供序列化/外表化                                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Game - 控制器                                        │
│  - 持有 #currentSudoku (#undoStack #redoStack)      │
│  - 提供 guess() undo() redo()                        │
│  - 管理历史，记录快照                                 │
│  - 提供 canUndo() canRedo()                          │
└─────────────────────────────────────────────────────┘
```

### 3. 不可变 vs 可变设计决策

**最终选择**：可变 Sudoku + 快照存储

**原因**：
- 测试用例期望 `guess()` 直接修改实例
- 不可变设计会导致 Game 的调用方式变得复杂
- 9x9 棋盘很小，可变设计性能无问题
- 通过 `clone()` 显式深拷贝保证快照正确性

---

## 三、额外功能实现

### 1. 固定格子掩码 (#fixed)

#### 设计动机

现有 UI 需要区分"题目给的数字"和"用户填入的数字"，以便：
- 固定数字用不同颜色显示
- 固定数字不允许用户修改

#### 实现方式

```js
class Sudoku {
  #grid;    // 当前完整局面
  #fixed;   // 固定掩码 boolean[][]

  constructor(input) {
    if (input && input.grid && input.fixed) {
      // 完整格式
      this.#grid = input.grid.map(row => [...row]);
      this.#fixed = input.fixed.map(row => [...row]);
    } else {
      // 简化格式：> 0 的视为固定
      this.#grid = input.map(row => [...row]);
      this.#fixed = this.#grid.map(row => row.map(v => v !== 0));
    }
  }

  guess(move) {
    if (this.#fixed[move.row][move.col]) {
      return;  // 固定格子无法修改
    }
    this.#grid[move.row][move.col] = move.value;
  }

  getFixed() { return this.#fixed; }
  isFixedAt(row, col) { return this.#fixed[row][col]; }
}
```

#### UI 使用示例

```js
const sudoku = game.getSudoku();
const grid = sudoku.getGrid();
const fixed = sudoku.getFixed();

// 渲染时判断
for (let y = 0; y < 9; y++) {
  for (let x = 0; x < 9; x++) {
    const value = grid[y][x];
    const isFixed = fixed[y][x];
    // isFixed === true → 显示为固定数字
    // isFixed === false → 显示为用户输入
  }
}
```

### 2. 美观的外表化表示 (toString)

复用 `@sudoku/sudoku.js` 的 `printSudoku` 美化格式：

```js
toString() {
  let out = '╔═══════╤═══════╤═══════╗\n';
  
  for (let row = 0; row < 9; row++) {
    if (row !== 0 && row % 3 === 0) {
      out += '╟───────┼───────┼───────╢\n';
    }
    for (let col = 0; col < 9; col++) {
      if (col === 0) out += '║ ';
      else if (col % 3 === 0) out += '│ ';
      out += (this.#grid[row][col] === 0 ? '·' : this.#grid[row][col]) + ' ';
      if (col === 8) out += '║';
    }
    out += '\n';
  }
  
  out += '╚═══════╧═══════╧═══════╝';
  return out;
}
```

---

## 四、文件结构

```
src/domain/
├── index.js      # 统一导出
├── Move.js       # 值对象
├── Sudoku.js     # 棋盘领域对象
└── Game.js       # 游戏会话领域对象
```

### 导出接口

```js
// index.js
export { Sudoku, createSudoku, createSudokuFromJSON } from './Sudoku.js';
export { Game, createGame, createGameFromJSON } from './Game.js';
export { Move } from './Move.js';
```

---

## 五、课堂讨论准备答案

### Q1: 除了 Sudoku 和 Game，是否还应该有其它对象？

**应该有 Move。**

理由：
- Move 封装了"一次操作"的信息，是领域中的重要概念
- 它让 guess() 接口更清晰：`guess(move)` vs `guess(row, col, value)`
- 虽然简单，但承担了"值对象"的职责

### Q2: 为什么 Move 不是核心领域对象？

1. **无状态**：Move 没有私有数据，不管理任何状态
2. **无行为**：只有数据容器，提供 toJSON() 方便序列化
3. **无生命周期**：不需要创建/销毁管理
4. **可替换**：可以用普通对象 `{row, col, value}` 替代

### Q3: Undo/Redo 更接近"存 move"还是"存 snapshot"？

**存 snapshot（快照）**。

我们的实现中：
- `#undoStack` 存储 `Sudoku` 克隆
- 每次 `guess()` 调用 `sudoku.clone()` 保存完整状态
- `undo()` 直接从栈中恢复整个 Sudoku

### Q4: 设计中最容易出错的地方是什么？

**深拷贝的时机和范围**。

容易出错的地方：
1. `clone()` 时忘记深拷贝 `#fixed`
2. `toJSON()` 时返回了引用而非副本
3. 构造函数时没有防御性拷贝

我们通过统一使用 `map(row => [...row])` 模式避免了这些问题。

### Q5: 如果继续增加"提示"或"探索模式"，现在的设计够用吗？

**基本够用，但需要扩展**。

| 功能 | 当前支持 | 需要扩展 |
|------|----------|----------|
| 提示 | ❌ | 需要 Sudoku 提供 `solve()` 或 `getHint()` |
| 探索模式 | ❌ | Game 需要支持分支历史树（当前是线性）|
| 多局游戏 | ❌ | 需要 GameManager 管理多个 Game 实例 |

**建议扩展方向**：
1. Sudoku 增加 `validate()` 方法验证当前局面
2. Sudoku 增加 `getCandidates()` 获取候选数字
3. Game 增加分支历史支持

---

## 六、总结

### 设计原则

1. **职责单一**：每个对象只做一件事
2. **显式优于隐式**：clone() 显式深拷贝
3. **值对象轻量化**：Move 只有数据，无复杂逻辑
4. **快照优先**：history 存储完整状态而非操作

### 核心权衡

| 决策 | 选择 | 原因 |
|------|------|------|
| 可变 vs 不可变 | **可变** | 简化实现，兼容测试 |
| 存 move vs 存 snapshot | **存 snapshot** | 实现简单，行为可靠 |
| 固定掩码 | **有** | 支持 UI 区分固定/用户数字 |
