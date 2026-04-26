import type { StyleMutation } from '../types';

export class StyleHistory {
  private stack: StyleMutation[] = [];
  private pointer: number = -1;

  public push(mutation: StyleMutation) {
    // Clear any "redo" steps if we push a new mutation
    if (this.pointer < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.pointer + 1);
    }
    this.stack.push(mutation);
    this.pointer++;
  }

  public undo(): StyleMutation | null {
    if (this.pointer < 0) return null;
    const mutation = this.stack[this.pointer];
    this.applyMutation(mutation, true);
    this.pointer--;
    return mutation;
  }

  public redo(): StyleMutation | null {
    if (this.pointer >= this.stack.length - 1) return null;
    this.pointer++;
    const mutation = this.stack[this.pointer];
    this.applyMutation(mutation, false);
    return mutation;
  }

  private applyMutation(mutation: StyleMutation, isUndo: boolean) {
    const { element, property, oldValue, newValue } = mutation;
    (element.style as any)[property] = isUndo ? oldValue : newValue;
  }

  public clear() {
    this.stack = [];
    this.pointer = -1;
  }
}
