import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const THRESHOLD = 60;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const target = containerRef.current;
    if (!target) return;
    // Only trigger pull-to-refresh when at the very top
    if (target.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      // Resistance: slow down as they pull further
      const resisted = Math.min(delta * 0.4, THRESHOLD * 1.5);
      setPullDistance(resisted);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{
          height: pullDistance > 0 ? `${pullDistance}px` : "0px",
          opacity: Math.min(pullDistance / THRESHOLD, 1),
        }}
      >
        <Loader2
          size={20}
          className={`${refreshing ? "animate-spin" : ""}`}
          style={{
            color: "var(--accent)",
            transform: refreshing ? undefined : `rotate(${Math.min(pullDistance / THRESHOLD, 1) * 360}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
