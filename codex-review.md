# con-oo-BringMeToTheMoon - Review

## Review 结论

代码已经把 Game/Sudoku 接进了真实的 Svelte 游戏流程，基本达成了“界面不再直接改旧二维数组”的最低目标；但当前实现里，数独业务规则仍主要落在 store 适配层，领域对象的封装也被可变引用暴露削弱，因此接入是成立的，但领域建模与架构质量只能算中等。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | fair |
| OOD | fair |

## 缺点

### 1. 数独规则校验没有收口到领域层

- 严重程度：core
- 位置：src/domain/Sudoku.js:138-177, src/node_modules/@sudoku/stores/gameStore.js:45-118
- 原因：Sudoku.isValidMove() 只校验坐标、数值范围和 fixed，明确不检查行/列/宫冲突；真正的冲突检测和胜利判定却放在 gameStore 的 calculateInvalidCells() 和 gameWon 里。这样 Sudoku/Game 不能独立表达“当前局面是否符合数独业务”，核心业务规则仍然依赖 Svelte 适配层。

### 2. 领域对象直接暴露可变内部状态

- 严重程度：core
- 位置：src/domain/Sudoku.js:110-124, src/domain/Game.js:94-99
- 原因：Sudoku.getGrid()、Sudoku.getFixed() 和 Game.getSudoku() 都返回内部引用。外部代码可以绕过 guess()、history 和输入校验直接修改棋盘，这破坏了封装；在 Svelte 场景下还会带来“对象内部已变但 store 未同步”的响应式风险。

### 3. 无状态变化的输入也会进入 Undo 历史

- 严重程度：major
- 位置：src/domain/Game.js:44-57, src/domain/Sudoku.js:145-176
- 原因：Game.guess() 只要 isValidMove() 通过就先压入快照；但 isValidMove() 不判断目标值是否与当前值相同，也不判断清空空格是否是 no-op。结果是重复输入同一个数字、对空格执行清空等操作也会污染 Undo/Redo 历史。

### 4. 自定义 store 组合方式不符合常见 Svelte 惯例

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/gameStore.js:233-270
- 原因：gameStore.subscribe() 通过临时订阅子 store 读取当前值，再手工拼装对象回调，而不是使用更直接的 derived/readable 或单一 writable 状态。这种写法增加了理解成本，也让 grid、fixed、gamePaused 的一致性依赖手工同步逻辑。

### 5. View 层同时消费两套游戏入口

- 严重程度：major
- 位置：src/App.svelte:12-17, src/components/Modal/Types/Welcome.svelte:2-24, src/components/Header/Dropdown.svelte:2-65, src/components/Controls/ActionBar/Timer.svelte:2-9
- 原因：渲染和输入主要走 gameStore，但开始游戏、暂停和继续又通过 @sudoku/game 包装层。虽然包装层最终委托给了 gameStore，但 UI 依赖并没有收敛到一个清晰的 adapter，职责边界需要来回追踪两套 API。

### 6. 组件中保留了调试型 reactive side effect

- 严重程度：minor
- 位置：src/components/Board/index.svelte:35-36
- 原因：顶层 $: 直接 console.log($invalidCells) 会在每次冲突集合变化时运行。它不属于业务逻辑或视图渲染职责，保留在提交代码里不符合常见 Svelte/JS 生产代码惯例。

## 优点

### 1. 领域对象已经进入真实 UI 主流程

- 位置：src/node_modules/@sudoku/stores/gameStore.js:138-188, src/components/Board/index.svelte:47-59, src/components/Controls/Keyboard.svelte:10-25, src/components/Controls/ActionBar/Actions.svelte:25-37
- 原因：新局创建、界面渲染、键盘输入、撤销/重做和提示都经过 gameStore，而 gameStore 内部持有 Game/Sudoku。这说明领域对象不是只存在于测试里，而是确实接到了真实交互路径上。

### 2. Move 值对象把输入验证集中到了明确边界

- 位置：src/domain/Move.js:11-61
- 原因：row、col、value 的范围和类型检查没有散落在组件事件处理里，而是由 Move 统一承担，接口边界比直接在 UI 里传裸数据更清楚。

### 3. 快照与序列化设计为历史和外表化提供了明确表示

- 位置：src/domain/Sudoku.js:179-208, src/domain/Game.js:105-127
- 原因：Sudoku.clone()、toJSON()、fromJSON() 连同 Game 的序列化逻辑，至少把 Undo/Redo 和状态恢复建立在显式快照之上，而不是依赖隐式共享数组。

### 4. 适配层写入 Svelte store 前做了防御性复制

- 位置：src/node_modules/@sudoku/stores/gameStore.js:123-132
- 原因：syncToStore() 没有把领域对象内部数组直接塞进响应式 store，而是复制后再 set()。这减少了 UI 侧误改领域内部状态和引用复用导致刷新异常的风险。

### 5. 开始与暂停流程兼顾了领域状态和外围应用状态

- 位置：src/node_modules/@sudoku/game.js:12-49
- 原因：@sudoku/game 在委托 gameStore 的同时，同步处理了 difficulty、cursor、timer 和 hints，使“开始一局游戏”和“暂停/继续”能与现有页面流程顺畅衔接。

## 补充说明

- 本次结论仅基于静态审查；按要求未运行测试，也未实际点击 Svelte 界面验证运行时行为。
- 关于“是否接入了 Svelte 游戏流程”的判断，依据是 Board、Keyboard、Actions、Welcome、Dropdown、Timer 到 gameStore/@sudoku/game 的代码调用链，而不是运行结果。
- 本次审查只覆盖 src/domain/* 及其直接接入层：src/node_modules/@sudoku/stores/gameStore.js、src/node_modules/@sudoku/game.js 和相关 .svelte 组件；未扩展到无关目录。
- 关于封装泄漏、Undo 历史噪音和响应式风险的结论，都是基于代码路径推断得出，属于静态阅读判断。
