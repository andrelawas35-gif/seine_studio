import { useState, useEffect } from "react";

/**
 * Returns a debounced version of `value` that only updates after `delay` ms of
 * inactivity. Use for search inputs to avoid firing API calls on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
