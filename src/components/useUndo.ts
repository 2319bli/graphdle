import { useState } from "react";
export function useUndo<T>(initial: T) {
  const [stack, setStack] = useState<T[]>([initial]);
  const [index, setIndex] = useState(0);
  const set = (value: T) => {
    setStack((s) => [...s.slice(0, index + 1), value]);
    setIndex(index + 1);
  };
  const undo = () => setIndex((i) => Math.max(0, i - 1));
  const redo = () => setIndex((i) => Math.min(stack.length - 1, i + 1));
  return {
    value: stack[index],
    set,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < stack.length - 1,
  };
}
