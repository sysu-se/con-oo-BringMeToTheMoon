import { Sudoku, createSudokuFromJSON } from './Sudoku.js';
import { Move } from './Move.js';

/**
 * Game - 游戏会话领域对象
 * 
 * 职责：
 * - 管理当前数独状态
 * - 维护 Undo/Redo 历史
 * - 处理用户操作
 */
export class Game {
  #undoStack = [];     // Undo 栈：存储之前的状态
  #redoStack = [];     // Redo 栈：存储被撤销的状态
  #currentSudoku;      // 当前数独状态（不可变 Sudoku 实例）

  /**
   * @param {{ sudoku: Sudoku }} config
   */
  constructor({ sudoku }) {
    this.#currentSudoku = sudoku;
  }

  /**
   * 执行一步操作
   * @param {Move|{row, col, value}} move
   */
  guess(move) {
    // 将 Move 转换为 Move 对象
    if (!(move instanceof Move)) {
      move = new Move(move);
    }

    // 保存当前状态到 Undo 栈（使用 clone 保证快照完整）
    this.#undoStack.push(this.#currentSudoku.clone());
    
    // 执行操作（Sudoku 是可变的，直接修改当前实例）
    this.#currentSudoku.guess(move);
    
    // 新操作后清空 Redo 栈
    this.#redoStack = [];
  }

  /**
   * 撤销上一步操作
   */
  undo() {
    if (!this.canUndo()) return;

    // 将当前状态保存到 Redo 栈
    this.#redoStack.push(this.#currentSudoku.clone());
    
    // 从 Undo 栈恢复上一个状态
    this.#currentSudoku = this.#undoStack.pop();
  }

  /**
   * 重做上一步被撤销的操作
   */
  redo() {
    if (!this.canRedo()) return;

    // 将当前状态保存到 Undo 栈
    this.#undoStack.push(this.#currentSudoku.clone());
    
    // 从 Redo 栈恢复
    this.#currentSudoku = this.#redoStack.pop();
  }

  /**
   * 是否可以撤销
   * @returns {boolean}
   */
  canUndo() {
    return this.#undoStack.length > 0;
  }

  /**
   * 是否可以重做
   * @returns {boolean}
   */
  canRedo() {
    return this.#redoStack.length > 0;
  }

  /**
   * 获取当前的 Sudoku 对象
   * @returns {Sudoku}
   */
  getSudoku() {
    return this.#currentSudoku;
  }

  /**
   * 序列化 - 保存完整游戏状态
   * @returns {Object}
   */
  toJSON() {
    return {
      // 当前状态
      currentSudoku: this.#currentSudoku.toJSON(),
      // Undo 栈中的所有快照
      undoStack: this.#undoStack.map(s => s.toJSON()),
      // Redo 栈中的所有快照
      redoStack: this.#redoStack.map(s => s.toJSON())
    };
  }

  /**
   * 从 JSON 反序列化恢复游戏状态
   * @param {Object} json
   * @returns {Game}
   */
  static fromJSON(json) {
    const game = new Game({
      sudoku: createSudokuFromJSON(json.currentSudoku)
    });
    
    // 恢复 Undo 栈
    game.#undoStack = json.undoStack.map(s => createSudokuFromJSON(s));
    
    // 恢复 Redo 栈
    game.#redoStack = json.redoStack.map(s => createSudokuFromJSON(s));
    
    return game;
  }
}

/**
 * 工厂函数：创建 Game
 * @param {{ sudoku: Sudoku }} config
 * @returns {Game}
 */
export function createGame({ sudoku }) {
  return new Game({ sudoku });
}

/**
 * 工厂函数：从 JSON 创建 Game
 * @param {Object} json
 * @returns {Game}
 */
export function createGameFromJSON(json) {
  return Game.fromJSON(json);
}
