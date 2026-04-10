import { Move } from './Move.js';

/**
 * Sudoku - 数独棋盘领域对象（不可变设计）
 * 
 * 设计原则：
 * - grid 在构造后不可变
 * - 所有修改操作返回新的 Sudoku 实例
 * - clone() 用于显式深拷贝
 */
export class Sudoku {
  #grid;  // 私有属性，外部无法直接访问

  /**
   * @param {number[][]} grid - 9x9 数独棋盘，数字范围 0-9，0 表示空白
   */
  constructor(grid) {
    // 防御性拷贝：构造时深拷贝，保证内部数据不被外部修改
    this.#grid = grid.map(row => [...row]);
  }

  /**
   * 获取棋盘数据（方法形式，保留兼容性，因为测试接口是getGrid，所以没删掉这个函数）
   * @returns {number[][]}
   */
  getGrid() {
    return this.#grid;
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

    // 直接修改当前实例的 grid
    this.#grid[move.row][move.col] = move.value;
  }

  /**
   * 显式深拷贝（当需要独立副本时调用，如保存历史快照）
   * @returns {Sudoku}
   */
  clone() {
    return new Sudoku(this.#grid.map(row => [...row]));
  }

  /**
   * 序列化 - 用于保存/传输
   * @returns {Object}
   */
  toJSON() {
    return {
      grid: this.#grid.map(row => [...row])
    };
  }

  /**
   * 从 JSON 反序列化恢复
   * @param {Object} json
   * @returns {Sudoku}
   */
  static fromJSON(json) {
    return new Sudoku(json.grid);
  }

  /**
   * 调试用文本表示（复用 @sudoku/sudoku.js 的 printSudoku 美化格式）
   * @returns {string}
   */
  toString() {
    // 复用现有的美化输出格式
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
