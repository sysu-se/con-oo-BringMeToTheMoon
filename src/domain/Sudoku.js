import { Move } from './Move.js';

/**
 * Sudoku - 数独棋盘领域对象
 * 
 * 设计原则：
 * - grid 在构造后可直接修改，但通过 #fixed 掩码区分固定格子
 * - guess() 直接修改实例（可变设计，兼容测试用例）
 * - clone() 用于显式深拷贝
 */
export class Sudoku {
  #grid;    // 私有属性，当前完整局面
  #fixed;   // 私有属性，固定掩码（true = 固定不可改）

  /**
   * @param {number[][]|{grid: number[][], fixed: boolean[][]}} input - 
   *   9x9 数独棋盘，或包含 grid 和 fixed 的对象
   */
  constructor(input) {
    if (input && input.grid && input.fixed) {
      // 完整格式：{ grid, fixed }
      this.#grid = input.grid.map(row => [...row]);
      this.#fixed = input.fixed.map(row => [...row]);
    } else {
      // 简化格式：纯 grid，> 0 的视为固定数字
      this.#grid = input.map(row => [...row]);
      this.#fixed = this.#grid.map(row => row.map(v => v !== 0));
    }
  }

  /**
   * 获取棋盘数据
   * @returns {number[][]}
   */
  getGrid() {
    return this.#grid;
  }

  /**
   * 获取固定掩码（用于 UI 区分固定数字和用户输入）
   * @returns {boolean[][]}
   */
  getFixed() {
    return this.#fixed;
  }

  /**
   * 判断指定位置是否是固定格子
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   */
  isFixedAt(row, col) {
    return this.#fixed[row][col];
  }

  /**
   * 执行一步操作（直接修改当前实例）
   * @param {Move|{row, col, value}} move - 移动操作
   */
  guess(move) {
    // 如果传入的是普通对象，转换为 Move 对象
    if (!(move instanceof Move)) {
      move = new Move(move);
    }

    // 如果是固定格子，无法修改
    if (this.#fixed[move.row][move.col]) {
      return;  // 静默忽略，固定格子不能修改
    }

    // 直接修改当前实例的 grid
    this.#grid[move.row][move.col] = move.value;
  }

  /**
   * 显式深拷贝（当需要独立副本时调用，如保存历史快照）
   * @returns {Sudoku}
   */
  clone() {
    return new Sudoku({
      grid: this.#grid.map(row => [...row]),
      fixed: this.#fixed.map(row => [...row])
    });
  }

  /**
   * 序列化 - 用于保存/传输
   * @returns {Object}
   */
  toJSON() {
    return {
      grid: this.#grid.map(row => [...row]),
      fixed: this.#fixed.map(row => [...row])
    };
  }

  /**
   * 从 JSON 反序列化恢复
   * @param {Object} json
   * @returns {Sudoku}
   */
  static fromJSON(json) {
    return new Sudoku({ grid: json.grid, fixed: json.fixed });
  }

  /**
   * 调试用文本表示（复用 @sudoku/sudoku.js 的 printSudoku 美化格式）
   * @returns {string}
   */
  toString() {
    let out = '╔═══════╤═══════╤═══════╗\n';

    for (let row = 0; row < 9; row++) {
      if (row !== 0 && row % 3 === 0) {
        out += '╟───────┼───────┼───────╢\n';
      }

      for (let col = 0; col < 9; col++) {
        if (col === 0) {
          out += '║ ';
        } else if (col % 3 === 0) {
          out += '│ ';
        }

        out += (this.#grid[row][col] === 0 ? '·' : this.#grid[row][col]) + ' ';

        if (col === 8) {
          out += '║';
        }
      }

      out += '\n';
    }

    out += '╚═══════╧═══════╧═══════╝';
    return out;
  }
}

/**
 * 工厂函数：创建 Sudoku
 * @param {number[][]} input - 9x9 grid
 * @returns {Sudoku}
 */
export function createSudoku(input) {
  return new Sudoku(input);
}

/**
 * 工厂函数：从 JSON 创建 Sudoku
 * @param {Object} json
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
  return Sudoku.fromJSON(json);
}
