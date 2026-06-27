import { useCallback, useEffect, useState } from "react";
import { deleteDraft, getDrafts, saveDraft, updateDraft, type Draft } from "./db";

export function useDraft<T extends object>(entity: string) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setDrafts(await getDrafts(entity));
  }, [entity]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (values: T): Promise<string> => {
    if (activeDraftId) {
      await updateDraft(activeDraftId, values as Record<string, unknown>);
      await refresh();
      return activeDraftId;
    }
    const id = await saveDraft(entity, values as Record<string, unknown>);
    setActiveDraftId(id);
    await refresh();
    return id;
  }, [entity, activeDraftId, refresh]);

  const load = useCallback((draft: Draft): T => {
    setActiveDraftId(draft.id);
    return draft.values as T;
  }, []);

  const discard = useCallback(async (id: string) => {
    await deleteDraft(id);
    if (activeDraftId === id) setActiveDraftId(null);
    await refresh();
  }, [activeDraftId, refresh]);

  const clear = useCallback(() => {
    setActiveDraftId(null);
  }, []);

  return { drafts, activeDraftId, save, load, discard, clear, refresh };
}
