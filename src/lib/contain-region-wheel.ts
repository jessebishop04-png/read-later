import { useEffect, type RefObject } from "react";

function canOverflowY(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  const oy = style.overflowY;
  return oy === "auto" || oy === "scroll" || oy === "overlay";
}

function isScrollableY(el: HTMLElement) {
  return canOverflowY(el) && el.scrollHeight > el.clientHeight + 1;
}

function findScrollable(start: HTMLElement | null, root: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = start;
  while (node) {
    if (isScrollableY(node)) return node;
    if (node === root) break;
    node = node.parentElement;
  }
  if (isScrollableY(root)) return root;

  const all = root.querySelectorAll<HTMLElement>("*");
  for (const el of all) {
    if (isScrollableY(el)) return el;
  }
  return null;
}

/**
 * When the cursor is over a region, wheel scrolls that region's content
 * and does not move a parent page scrollport.
 */
export function useContainRegionWheel(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onWheel = (e: WheelEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : root;
      const scrollEl = findScrollable(target, root);
      if (!scrollEl) {
        e.preventDefault();
        return;
      }

      const top = scrollEl.scrollTop;
      const max = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
      const next = Math.min(max, Math.max(0, top + e.deltaY));
      if (next !== top) {
        scrollEl.scrollTop = next;
      }
      e.preventDefault();
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [rootRef]);
}
