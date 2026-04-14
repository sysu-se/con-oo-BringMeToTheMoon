# 数独领域对象设计与 Svelte 接入

## 一、对原有 Sudoku 和 Game 类的改进

### 1.1 Move 类改进

| 项目 | HW1 | HW1.1 |
|------|------|-------|
| **参数方式** | 位置参数 `(row, col, value, prevValue)` | 参数对象 `{ row, col, value }` |
| **输入验证** | ❌ 无 | ✅ 新增 |
| **prevValue** | ✅ 保留（用于反向操作） | ❌ 移除（改用快照） |
| **序列化** | 依赖外部 | `toJSON()` / `fromJSON()` |

### 1.2 Sudoku 类改进

| 项目 | HW1 | HW1.1 |
|------|------|-------|
| **fixed 掩码** | ❌ 无（无法区分固定格子） | ✅ 新增 `_fixed` 掩码 |
| **输入验证** | ❌ 无 | ✅ 多层验证 |
| **isValidMove()** | ❌ 无 | ✅ 新增 |
| **isFixedAt()** | ❌ 无 | ✅ 新增 |
| **getFixed()** | ❌ 无 | ✅ 新增 |
| **guess() 返回值** | void（无检查） | boolean（是否成功） |
| **guess() 固定格子检查** | ❌ 无 | ✅ 返回 false |
| **guess() Move 对象支持** | ❌ 无 | ✅ 自动转换 |
| **构造函数** | 仅接受 grid | 支持 `{grid, fixed}` 或纯 grid |
| **fromJSON()** | ❌ 无 | ✅ 新增 |

### 1.3 Game 类改进

| 项目 | HW1 | HW1.1 |
|------|------|-------|
| **属性可见性** | 公开 `this.sudoku` | 私有 `this._currentSudoku` |
| **构造函数参数** | 三个独立参数 | 参数对象 `{ sudoku }` |
| **sudoku 类型检查** | ❌ 无 | ✅ instanceof 检查 |
| **undoStack 存储内容** | Move 对象（带 prevValue） | Sudoku 快照 |
| **redoStack 存储内容** | Move 对象 | Sudoku 快照 |
| **Undo 实现** | 反向 Move | 恢复 Sudoku 快照 |
| **Redo 实现** | 重放 Move | 恢复 Sudoku 快照 |
| **guess() 返回值** | void | boolean |
| **guess() 验证** | 无 | 调用 `isValidMove()` |
| **fromJSON()** | 基础实现 | 完整恢复栈 |

### 1.4 核心改进方向总结

#### 1. 防御性编程

HW1 的领域对象**没有任何输入验证**，外部恶意数据可以直接污染内部状态。

**改进措施：**

| 类 | 验证点 |
|---|--------|
| Move | 构造时验证 row/col (0-8)、value (0-9) |
| Sudoku | `_validateGrid()`、`_validateFixed()`、`_validateCoord()` |
| Game | 构造时验证 sudoku 是否为 Sudoku 实例 |

**改进前：**
```javascript
// HW1: 任意数据都能传入
this.grid[row][col] = value;  // 无检查，可能越界
```

**改进后：**
```javascript
// HW1.1: 有防御性验证
isValidMove(row, col, value) {
    if (typeof row !== 'number' || row < 0 || row > 8) return false;
    if (this._fixed[row][col]) return false;
    return true;
}
guess(move) {
    if (!this.isValidMove(move.row, move.col, move.value)) return false;
    this._grid[move.row][move.col] = move.value;
    return true;
}
```

#### 2. Grid 的区别化（fixed 掩码）

HW1 的 grid 中所有非零数字**无法区分**是题目预设还是用户输入。

**改进措施：**
- 新增 `_fixed` 布尔掩码，`true` = 固定不可改
- 构造函数支持两种输入格式

```javascript
// HW1.1: 支持固定掩码
constructor(input) {
    if (input.grid && input.fixed) {
        this._grid = input.grid.map(row => [...row]);
        this._fixed = input.fixed.map(row => [...row]);
    } else {
        // 简化格式：> 0 视为固定
        this._grid = input.map(row => [...row]);
        this._fixed = this._grid.map(row => row.map(v => v !== 0));
    }
}
```

**作用：**
- UI 可区分固定格子（题目）和用户输入格子
- `guess()` 时检查 fixed 掩码，防止修改固定格子

#### 3. 历史记录由 Move 变为快照

HW1 的 Undo/Redo **依赖 Move 对象的 prevValue**，存在状态不一致风险。

**HW1 的问题：**
```javascript
// HW1: undo 时需要知道原始值
guess(move) {
    move.prevValue = currentGrid[move.row][move.col];  // 保存原始值
    this.undoStack.push(move);
}

undo() {
    const reverseMove = new Move(lastMove.row, lastMove.col, lastMove.prevValue);
    this.sudoku.guess(reverseMove);  // 恢复原始值
}
```
- 问题：如果中间有其他操作影响该格子，prevValue 可能过时

**HW1.1 改进：存储 Sudoku 快照**
```javascript
// HW1.1: 完整状态快照
guess(move) {
    this._undoStack.push(this._currentSudoku.clone());  // 快照当前完整状态
    this._currentSudoku.guess(move);
}

undo() {
    this._redoStack.push(this._currentSudoku.clone());  // 保存当前状态
    this._currentSudoku = this._undoStack.pop();       // 恢复完整快照
}
```
- 优点：状态完整可靠，无依赖问题

#### 4. 序列化适配

HW1 的序列化**不完整**，反序列化后栈无法正确恢复。

**HW1 的问题：**
```javascript
// HW1: toJSON() 返回 Move 对象而非 Sudoku 快照
undoStack: this.undoStack.map(m => ({ ...m }))  // Move 对象
```

**HW1.1 改进：完整状态序列化**
```javascript
// HW1.1: 存储 Sudoku JSON
undoStack: this._undoStack.map(s => s.toJSON())

// fromJSON() 完整恢复
static fromJSON(json) {
    const game = new Game({ sudoku: createSudokuFromJSON(json.currentSudoku) });
    game._undoStack = json.undoStack.map(s => createSudokuFromJSON(s));
    game._redoStack = json.redoStack.map(s => createSudokuFromJSON(s));
    return game;
}
```

#### 5. 其他改进

| 改进点 | 说明 |
|--------|------|
| **私有属性封装** | 使用 `_` 前缀（`this._grid`、`this._currentSudoku`）封装内部状态 |
| **参数对象模式** | 构造函数改用 `{ sudoku }` 而非独立参数，提高可读性和扩展性 |
| **返回值语义化** | `guess()` 返回 boolean，表示操作是否成功，便于 UI 判断 |

#### 6. Trade-off 分析

每个改进方向都有其权衡取舍：

| 改进方向 | 优点 | 缺点/代价 |
|----------|------|----------|
| **防御性编程** | 防止外部污染，提高健壮性 | 每次调用都有验证开销（极小） |
| **fixed 掩码** | UI 可区分固定/用户输入 | 内存占用翻倍（9x9 布尔数组，约 81 字节，可忽略） |
| **Sudoku 快照** | 状态完整可靠，无依赖问题 | 内存占用大（每次操作存储完整 9x9 数组）<br/>时间开销（深拷贝 81 个数字） |
| **多层级验证** | 全面防护 | 代码量增加，职责分散到 Move/Sudoku/Game |

**快照策略的空间代价：**

```
Undo 操作前：存储当前 Sudoku 快照
  └── 9x9 grid × 9 bytes ≈ 81 字节

每步操作存储一个快照，最多 81 步
  └── 最大空间：81 × 81 = 6561 字节 ≈ 6.5 KB

相比 Move 对象（只需 row, col, value）：
  └── 3 × 8 bytes = 24 字节 × 81 = 1944 字节 ≈ 2 KB
```

**结论：**
- 空间代价约 3 倍（可接受）
- 换取了状态完整性和可靠性
- 数独操作步数有限（≤81），内存占用完全可控

**验证策略的时间代价：**
- 输入验证为 O(1) 操作，常数时间
- 对用户体验无感知影响

---

## 二、将领域对象接入真实 Svelte 游戏流程

### 2.1 Svelte 机制简介

#### 2.1.1 Svelte 的响应式机制如何与领域对象协作？

本方案依赖 Svelte 的 **Store 机制** 实现响应式更新：

**1. `$` 语法糖与显式调用的关系**

本项目采用"底层显式调用 + 组件层语法糖"的组合方式：

| 层级 | 方式 | 示例 |
|------|------|------|
| Store 定义层 | 显式 `subscribe`/`set` | `writable()`, `derived()`, `store.set()` |
| View 消费层 | `$` 语法糖 | `$gameStore`, `$invalidCells` |

**`$` 语法糖的订阅机制：**

```javascript
// 当组件使用 $gameStore 时：
// 1. Svelte 自动调用 gameStore.subscribe(callback)
// 2. 当 gameStore 内部状态变化时，callback 被调用
// 3. $gameStore 自动更新为新值
// 4. 组件销毁时，Svelte 自动调用取消订阅
```

**`$` 的优点：**

| 优点 | 说明 |
|------|------|
| 自动生命周期管理 | 组件创建时订阅，销毁时取消订阅，无需手动管理 |
| 代码简洁 | `$store` 直接获取值，无需 `let val; store.subscribe(v => val = v)()` |
| 透明组合 | gameStore 内部已组合子 store，UI 无需知道内部结构 |
| 精确依赖 | UI 只依赖 gameStore，不直接依赖子 store |

```svelte
<!-- UI 只写一行，自动获得所有响应式更新 -->
{#each $gameStore.grid as row}
    <Cell value={value} />
{/each}

<!-- gameStore 内部已组合 gridStore/fixedStore/gamePausedStore -->
<!-- 任一子 store 变化时，$gameStore 都会自动更新 -->
```

**2. 依赖的 Svelte 机制**

| 机制 | 作用 |
|------|------|
| `writable store` | 创建可变的响应式状态 |
| `custom store` | 自定义 subscribe 接口，返回组合状态 |
| `derived` | 基于现有 store 派生计算状态 |
| `$` 前缀 | 组件层语法糖，自动订阅/取消订阅 |

**2. 响应式暴露给 UI 的数据**

```
gameStore 暴露的响应式状态：
├── grid        → 当前数独局面（9x9 数组）
├── fixed       → 固定格子掩码（9x9 布尔数组）
├── gamePaused  → 游戏是否暂停
├── invalidCells → 冲突单元格（派生状态）
└── gameWon     → 游戏是否胜利（派生状态）
```

**3. 为什么直接 mutate 不会更新**

```
错误做法：
  直接修改 Sudoku._grid[0][0] = 5
  
  问题：Svelte 无法感知内部数组的修改，因为 Store 本身没有变化
  
正确做法：
  调用 gameStore.guess({x, y}, value)
    → Game.guess(move)
    → Sudoku.guess(move)        // 修改内部状态
    → syncToStore()             // 显式同步到 Store
    → Store 触发更新             // Svelte 自动刷新 UI
```

**4. 哪些状态留在领域对象内部？**

| 状态 | 位置 | 说明 |
|------|------|------|
| `_undoStack` | Game | Undo 历史栈，UI 不直接访问 |
| `_redoStack` | Game | Redo 历史栈，UI 不直接访问 |
| `_currentSudoku` | Game | 当前 Sudoku 实例，通过 `getSudoku()` 访问 |
| 内部验证逻辑 | Sudoku/Game | `isValidMove()` 等校验不对 UI 暴露细节 |

UI 只需通过 `gameStore.canUndo()` / `canRedo()` 查询是否可以撤销/重做。

**5. 数据流图**

```
用户操作 ──→ Store 命令方法 ──→ 领域对象修改 ──→ syncToStore() ──→ Store 更新 ──→ UI 刷新
              (guess)           (Sudoku)           ↑                              ↑
                                                   │                              │
                                            调用 getGrid()                   $store.xxx
                                            getFixed()                       自动订阅
```

---

#### 2.1.2 View 层如何消费 Sudoku / Game？

**1. View 层直接消费的是什么？**

View 层消费的是 **`gameStore`**（Store Adapter），而非直接消费 `Game` 或 `Sudoku` 实例。

```
┌─────────────────────────────────────────┐
│              Svelte 组件                │
│  Board/index.svelte, Actions.svelte     │
└─────────────────┬───────────────────────┘
                  │ $gameStore.xxx
                  ▼
┌─────────────────────────────────────────┐
│         Store Adapter (gameStore.js)     │
│  - 持有 Game 实例                        │
│  - 暴露响应式状态                         │
│  - 暴露命令方法                           │
└─────────────────┬───────────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌─────────────┐    ┌─────────────┐
│    Game     │───▶│   Sudoku   │
│  (历史管理) │    │  (数据持有) │
└─────────────┘    └─────────────┘
```

**2. View 层拿到的数据是什么？**

```svelte
<!-- Board/index.svelte 中的使用示例 -->

<!-- 渲染棋盘 -->
{#each $gameStore.grid as row, y}
    {#each row as value, x}
        <Cell value={value} />
    {/each}
{/each}

<!-- 区分固定/用户输入 -->
<Cell isFixed={$gameStore.fixed[y][x]} />

<!-- 控制 UI 可用性 -->
<button disabled={$gameStore.gamePaused}>Undo</button>

<!-- 冲突检测 -->
{#if $invalidCells.includes(x + ',' + y)}
    <span class="error">冲突</span>
{/if}

<!-- 游戏胜利检测 -->
{#if $gameWon}
    <div>恭喜通关！</div>
{/if}
```

| 数据 | 类型 | 用途 |
|------|------|------|
| `$gameStore.grid` | `number[][]` | 渲染棋盘数字 |
| `$gameStore.fixed` | `boolean[][]` | 区分固定格子与用户输入 |
| `$gameStore.gamePaused` | `boolean` | 控制 UI 可用性 |
| `$invalidCells` | `string[]` | 高亮冲突单元格 |
| `$gameWon` | `boolean` | 显示胜利信息 |

**3. 用户操作如何进入领域对象？**

```javascript
// 键盘输入 → guess
keyboard.js:handleKey() {
    gameStore.guess({ x: cursor.x, y: cursor.y }, value);
}
// 调用链：gameStore.guess() → Game.guess() → Sudoku.guess()

// Undo → undo
Actions.svelte:
    <button on:click={() => gameStore.undo()}>Undo</button>
// 调用链：gameStore.undo() → Game.undo()

// Redo → redo
Actions.svelte:
    <button on:click={() => gameStore.redo()}>Redo</button>
// 调用链：gameStore.redo() → Game.redo()
```

**4. 领域对象变化后，Svelte 为什么会更新？**

关键在于 `syncToStore()` 函数：

```javascript
// gameStore.js
function syncToStore() {
    const sudoku = currentGame.getSudoku();
    const grid = sudoku.getGrid();
    const fixed = sudoku.getFixed();
    
    // 创建新数组（触发 Svelte 响应式更新）
    gridStore.set(grid.map(row => [...row]));
    fixedStore.set(fixed.map(row => [...row]));
}

// 每次领域对象修改后调用
function guess(pos, value) {
    currentGame.guess(move);
    syncToStore();  // 显式同步 → Store 更新 → UI 刷新
}
```

流程：
1. 用户操作调用 `gameStore.guess()`
2. `Game.guess()` 修改 `Sudoku._grid`
3. `syncToStore()` 调用 `gridStore.set()` → **创建新数组引用**
4. Svelte 检测到 Store 值变化
5. 自动通知所有订阅者（`$gameStore`）→ UI 刷新

---

### 2.2 接入功能

#### 2.2.1 开始一局游戏

```javascript
// gameStore.startNew('easy')
function startNew(difficulty = 'easy') {
    // 1. 生成谜题
    const puzzleGrid = generateSudoku(difficulty);
    
    // 2. 创建领域对象
    const sudoku = createSudoku(puzzleGrid);  // Sudoku 领域对象
    currentGame = createGame({ sudoku });      // Game 领域对象
    
    // 3. 同步到 Store
    syncToStore();
    
    // 4. 开始游戏
    gamePausedStore.set(false);
}
```

#### 2.2.2 界面渲染当前局面

```svelte
<!-- Board/index.svelte -->
{#each $gameStore.grid as row, y}
    {#each row as value, x}
        <Cell 
            value={value}
            isFixed={$gameStore.fixed[y][x]}
        />
    {/each}
{/each}
```

所有渲染数据均来自 `$gameStore`，而 `$gameStore.grid` 源自领域对象 `Sudoku._grid`。

#### 2.2.3 用户输入

```javascript
// keyboard.js
export const keyboardDisabled = derived(
    [cursor, gameStore],
    ([$cursor, $gameStore]) => {
        // 固定格子不可编辑
        if ($gameStore.fixed[$cursor.y][$cursor.x]) return true;
        return false;
    }
);

function handleKey(key) {
    if (key >= '1' && key <= '9') {
        gameStore.guess({ x: $cursor.x, y: $cursor.y }, parseInt(key));
    }
}
```

#### 2.2.4 Undo / Redo

```javascript
// Actions.svelte
<button on:click={() => gameStore.undo()}>Undo</button>
<button on:click={() => gameStore.redo()}>Redo</button>

// gameStore.js
function undo() {
    currentGame.undo();
    syncToStore();
}

function redo() {
    currentGame.redo();
    syncToStore();
}
```

#### 2.2.5 界面自动更新

见 2.1.1 第 5 节"数据流图"和 `syncToStore()` 机制。

---

### 2.3 接入方式（Store Adapter）

**Store Adapter 职责：**

| 职责 | 说明 |
|------|------|
| 持有领域对象 | `currentGame` 持有 `Game` 实例 |
| 状态同步 | `syncToStore()` 将领域对象状态同步到响应式 Store |
| 命令转发 | 将 UI 操作转发给领域对象 |
| 派生计算 | `invalidCells`、`gameWon` 等派生状态 |

**代码结构：**

```javascript
export const gameStore = {
    // 响应式状态订阅
    subscribe: (callback) => { /* 组合多个 store */ },
    
    // 单独状态订阅
    grid: { subscribe: gridStore.subscribe },
    fixed: { subscribe: fixedStore.subscribe },
    gamePaused: { subscribe: gamePausedStore.subscribe },
    
    // 派生状态
    invalidCells,
    gameWon,
    
    // 命令方法
    startNew,
    startCustom,
    guess,
    undo,
    redo,
    pause,
    resume,
    applyHint,
};
```

---

## 三、附录

### A. 核心文件清单

| 文件 | 职责 |
|------|------|
| `src/domain/Sudoku.js` | 数独数据持有、guess 操作、输入验证 |
| `src/domain/Game.js` | Undo/Redo 历史管理、guess 转发 |
| `src/domain/Move.js` | 操作命令对象 |
| `src/node_modules/@sudoku/stores/gameStore.js` | Store Adapter，连接领域对象与 UI |
| `src/components/Board/index.svelte` | 棋盘渲染，消费 gameStore |
| `src/components/Controls/ActionBar/Actions.svelte` | Undo/Redo 按钮，调用 gameStore |
| `src/node_modules/@sudoku/stores/keyboard.js` | 键盘输入，转发到 gameStore.guess |

### B. 类图

```
┌─────────────────────┐     ┌─────────────────────┐
│       Move          │     │       Sudoku        │
├─────────────────────┤     ├─────────────────────┤
│ + row: number       │     │ - _grid: number[][] │
│ + col: number       │     │ - _fixed: boolean[][]│
│ + value: number     │     ├─────────────────────┤
├─────────────────────┤     │ + getGrid()          │
│ + toJSON()          │     │ + getFixed()         │
└─────────────────────┘     │ + isValidMove()     │
                             │ + guess(move)       │
                             │ + clone()           │
                             │ + toJSON()          │
                             └──────────┬──────────┘
                                        │
                                        │ 持有
                                        ▼
                             ┌─────────────────────┐
                             │        Game         │
                             ├─────────────────────┤
                             │ - _currentSudoku    │
                             │ - _undoStack        │
                             │ - _redoStack        │
                             ├─────────────────────┤
                             │ + guess(move)       │
                             │ + undo()            │
                             │ + redo()            │
                             │ + canUndo()         │
                             │ + canRedo()         │
                             │ + getSudoku()       │
                             └──────────┬──────────┘
                                        │
                                        │ 适配
                                        ▼
                             ┌─────────────────────┐
                             │     gameStore       │
                             │   (Store Adapter)   │
                             ├─────────────────────┤
                             │ 响应式:              │
                             │   grid, fixed       │
                             │   gamePaused        │
                             │   invalidCells      │
                             │   gameWon           │
                             ├─────────────────────┤
                             │ 命令:                │
                             │   guess()           │
                             │   undo(), redo()    │
                             │   startNew()        │
                             └─────────────────────┘
```
