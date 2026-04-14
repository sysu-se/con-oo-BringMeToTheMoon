/**
 * @fileoverview 数独棋盘领域对象
 * @module domain/Sudoku
 */

import { Move } from './Move.js';

/**
 * 数独棋盘领域对象
 * 
 * 设计原则：
 * - 持有 grid 和 fixed 数据
 * - guess() 直接修改实例（可变设计，兼容测试用例）
 * - clone() 用于显式深拷贝（如保存历史快照）
 * - 所有公开方法都有输入验证，防止外部污染
 */
export class Sudoku {
  /** @type {number[][]} 9x9 数独棋盘，值为 0-9（0 表示空格） */
  _grid;
  
  /** @type {boolean[][]} 9x9 固定掩码，true = 固定不可改 */
  _fixed;

  /**
   * @param {number[][] | {grid: number[][], fixed: boolean[][]}} input
   * 
   * 支持两种格式：
   * - 简化格式：9x9 数字数组（大于 0 视为固定）
   * - 完整格式：{ grid: 9x9数组, fixed: 9x9布尔数组 }
   * 
   * @throws {Error} input 为空或格式无效
   */
  constructor(input) {
    if (!input) {
      throw new Error('Sudoku: constructor requires valid input');
    }

    if (input && input.grid && input.fixed) {
      // 完整格式：{ grid, fixed }
      this._validateGrid(input.grid);
      this._validateFixed(input.fixed);
      this._grid = input.grid.map(row => [...row]);
      this._fixed = input.fixed.map(row => [...row]);
    } else {
      // 简化格式：纯 grid，> 0 的视为固定数字
      this._validateGrid(input);
      this._grid = input.map(row => [...row]);
      this._fixed = this._grid.map(row => row.map(v => v !== 0));
    }
  }

  /**
   * @private
   * @param {number[][]} grid - 9x9 数字数组
   * @throws {Error} grid 不是 9x9 数组或包含非法值
   */
  _validateGrid(grid) {
    if (!Array.isArray(grid) || grid.length !== 9) {
      throw new Error('Sudoku: grid must be a 9x9 array');
    }
    for (let r = 0; r < 9; r++) {
      if (!Array.isArray(grid[r]) || grid[r].length !== 9) {
        throw new Error(`Sudoku: grid row ${r} must have 9 elements`);
      }
      for (let c = 0; c < 9; c++) {
        const val = grid[r][c];
        if (typeof val !== 'number' || val < 0 || val > 9 || !Number.isInteger(val)) {
          throw new Error(`Sudoku: grid[${r}][${c}] must be integer 0-9, got ${val}`);
        }
      }
    }
  }

  /**
   * @private
   * @param {boolean[][]} fixed - 9x9 布尔数组
   * @throws {Error} fixed 不是 9x9 布尔数组
   */
  _validateFixed(fixed) {
    if (!Array.isArray(fixed) || fixed.length !== 9) {
      throw new Error('Sudoku: fixed must be a 9x9 boolean array');
    }
    for (let r = 0; r < 9; r++) {
      if (!Array.isArray(fixed[r]) || fixed[r].length !== 9) {
        throw new Error(`Sudoku: fixed row ${r} must have 9 elements`);
      }
      for (let c = 0; c < 9; c++) {
        if (typeof fixed[r][c] !== 'boolean') {
          throw new Error(`Sudoku: fixed[${r}][${c}] must be boolean, got ${typeof fixed[r][c]}`);
        }
      }
    }
  }

  /**
   * @private
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @throws {Error} 坐标超出范围
   */
  _validateCoord(row, col) {
    if (typeof row !== 'number' || row < 0 || row > 8 || !Number.isInteger(row)) {
      throw new Error(`Sudoku: row must be 0-8 integer, got ${row}`);
    }
    if (typeof col !== 'number' || col < 0 || col > 8 || !Number.isInteger(col)) {
      throw new Error(`Sudoku: col must be 0-8 integer, got ${col}`);
    }
  }

  /**
   * 获取棋盘数据（返回内部引用）
   * @returns {number[][]} 9x9 数组，值为 0-9
   */
  getGrid() {
    return this._grid;
  }

  /**
   * 获取固定掩码（返回内部引用）
   * @returns {boolean[][]} 9x9 布尔数组
   */
  getFixed() {
    return this._fixed;
  }

  /**
   * 判断指定位置是否是固定格子
   * @param {number} row - 行索引 [0-8]
   * @param {number} col - 列索引 [0-8]
   * @returns {boolean} true = 固定不可改
   * @throws {Error} 坐标超出范围
   */
  isFixedAt(row, col) {
    this._validateCoord(row, col);
    return this._fixed[row][col];
  }

  /**
   * 验证移动是否合法（仅验证数字范围和固定格子，不验证数独冲突）
   * @param {number} row - 行索引 [0-8]
   * @param {number} col - 列索引 [0-8]
   * @param {number} value - 填入的值 [0-9]，0 表示清除
   * @returns {boolean} true 表示可以尝试填入
   */
  isValidMove(row, col, value) {
    if (typeof row !== 'number' || row < 0 || row > 8 || !Number.isInteger(row)) {
      return false;
    }
    if (typeof col !== 'number' || col < 0 || col > 8 || !Number.isInteger(col)) {
      return false;
    }
    if (typeof value !== 'number' || value < 0 || value > 9 || !Number.isInteger(value)) {
      return false;
    }
    if (this._fixed[row][col]) {
      return false;
    }
    return true;
  }

  /**
   * 执行一步操作（直接修改当前实例）
   * @param {Move | {row: number, col: number, value: number}} move
   * @returns {boolean} true = 成功，false = 失败（固定格子或验证失败）
   */
  guess(move) {
    if (!(move instanceof Move)) {
      move = new Move(move);
    }

    if (this._fixed[move.row][move.col]) {
      return false;
    }

    this._grid[move.row][move.col] = move.value;
    return true;
  }

  /**
   * 显式深拷贝
   * @returns {Sudoku} 新的 Sudoku 实例
   */
  clone() {
    return new Sudoku({
      grid: this._grid.map(row => [...row]),
      fixed: this._fixed.map(row => [...row])
    });
  }

  /**
   * 序列化
   * @returns {{grid: number[][], fixed: boolean[][]}}
   */
  toJSON() {
    return {
      grid: this._grid.map(row => [...row]),
      fixed: this._fixed.map(row => [...row])
    };
  }

  /**
   * 从 JSON 反序列化
   * @param {{grid: number[][], fixed: boolean[][]}} json
   * @returns {Sudoku}
   */
  static fromJSON(json) {
    return new Sudoku({ grid: json.grid, fixed: json.fixed });
  }

  /**
   * 调试用文本表示
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

        out += (this._grid[row][col] === 0 ? '·' : this._grid[row][col]) + ' ';

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
 * @param {number[][] | {grid: number[][], fixed: boolean[][]}} input
 * @returns {Sudoku}
 */
export function createSudoku(input) {
  return new Sudoku(input);
}

/**
 * @param {{grid: number[][], fixed: boolean[][]}} json
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
  return Sudoku.fromJSON(json);
}
