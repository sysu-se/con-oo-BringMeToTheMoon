/**
 * Move - 简单值对象
 * 封装一次用户操作的信息
 */
export class Move {
  constructor({ row, col, value }) {
    this.row = row;
    this.col = col;
    this.value = value;
  }

  toJSON() {
    return {
      row: this.row,
      col: this.col,
      value: this.value
    };
  }

  static fromJSON(json) {
    return new Move(json);
  }
}
