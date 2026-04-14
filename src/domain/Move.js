/**
 * @fileoverview 操作命令值对象
 * @module domain/Move
 */

/**
 * 操作命令值对象
 * 
 * 封装一次用户操作的信息。
 */
export class Move {
  /** @type {number} 行索引 [0-8] */
  row;
  
  /** @type {number} 列索引 [0-8] */
  col;
  
  /** @type {number} 填入的值 [0-9]，0 表示清除 */
  value;

  /**
   * @param {{row: number, col: number, value: number}} param
   * @param {number} param.row - 行索引 [0-8]
   * @param {number} param.col - 列索引 [0-8]
   * @param {number} param.value - 填入的值 [0-9]
   * @throws {Error} 参数超出范围或类型错误
   */
  constructor({ row, col, value }) {
    if (typeof row !== 'number' || row < 0 || row > 8 || !Number.isInteger(row)) {
      throw new Error(`Move: row must be 0-8 integer, got ${row}`);
    }
    if (typeof col !== 'number' || col < 0 || col > 8 || !Number.isInteger(col)) {
      throw new Error(`Move: col must be 0-8 integer, got ${col}`);
    }
    if (typeof value !== 'number' || value < 0 || value > 9 || !Number.isInteger(value)) {
      throw new Error(`Move: value must be 0-9 integer, got ${value}`);
    }

    this.row = row;
    this.col = col;
    this.value = value;
  }

  /**
   * @returns {{row: number, col: number, value: number}}
   */
  toJSON() {
    return {
      row: this.row,
      col: this.col,
      value: this.value
    };
  }

  /**
   * @param {{row: number, col: number, value: number}} json
   * @returns {Move}
   */
  static fromJSON(json) {
    return new Move(json);
  }
}
