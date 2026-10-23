import { useCallback, useRef, useState } from "react";
import { createProject, readRecovery } from "./model";
import type { Project } from "./types";
import { pruneStacks } from "./stacks";

function initialProject() {
  try {
    const saved = readRecovery(localStorage);
    if (saved) return saved;
  } catch {
    /* An unavailable store must not prevent startup. */
  }
  return { project: createProject(), recovered: false };
}
export function useProject() {
  const [initial] = useState(initialProject);
  const [project, setProject] = useState(initial.project);
  const current = useRef(project),
    past = useRef<Project[]>([]),
    future = useRef<Project[]>([]),
    transaction = useRef<Project | null>(null);
  const [, refreshHistory] = useState(0);
  const apply = useCallback((next: Project) => {
    current.current = next;
    setProject(next);
    refreshHistory((v) => v + 1);
  }, []);
  const update = useCallback(
    (change: Project | ((previous: Project) => Project)) => {
      const next = pruneStacks(
        typeof change === "function" ? change(current.current) : change,
      );
      if (JSON.stringify(next) === JSON.stringify(current.current)) return;
      if (!transaction.current) {
        past.current.push(current.current);
        if (past.current.length > 80) past.current.shift();
        future.current = [];
      }
      apply(next);
    },
    [apply],
  );
  const begin = useCallback(() => {
    if (!transaction.current) transaction.current = current.current;
  }, []);
  const finish = useCallback(() => {
    if (
      transaction.current &&
      JSON.stringify(transaction.current) !== JSON.stringify(current.current)
    ) {
      past.current.push(transaction.current);
      if (past.current.length > 80) past.current.shift();
      future.current = [];
    }
    transaction.current = null;
    refreshHistory((v) => v + 1);
  }, []);
  const undo = useCallback(() => {
    if (transaction.current) return;
    const prev = past.current.pop();
    if (prev) {
      future.current.push(current.current);
      apply(prev);
    }
  }, [apply]);
  const redo = useCallback(() => {
    if (transaction.current) return;
    const next = future.current.pop();
    if (next) {
      past.current.push(current.current);
      apply(next);
    }
  }, [apply]);
  return {
    project,
    current,
    update,
    begin,
    finish,
    undo,
    redo,
    recovered: initial.recovered,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    isEditing: () => transaction.current !== null,
  };
}
