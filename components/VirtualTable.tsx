
import React, { useState, useEffect, useRef } from 'react';

interface VirtualTableProps<T> {
  data: T[];
  rowHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  header: React.ReactNode;
  activeId?: string | null;
  getId?: (item: T) => string;
}

export function VirtualTable<T>({ data, rowHeight, renderRow, header, activeId, getId }: VirtualTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync scroll position when activeId changes (Keyboard Nav Support)
  useEffect(() => {
    if (!activeId || !getId || !containerRef.current) return;

    const index = data.findIndex(item => getId(item) === activeId);
    if (index === -1) return;

    const itemTop = index * rowHeight;
    const itemBottom = itemTop + rowHeight;
    const viewTop = containerRef.current.scrollTop;
    const viewBottom = viewTop + containerHeight;

    if (itemTop < viewTop) {
      // Scroll up to show item at the top
      containerRef.current.scrollTop = itemTop;
    } else if (itemBottom > viewBottom) {
      // Scroll down to show item at the bottom
      containerRef.current.scrollTop = itemBottom - containerHeight;
    }
  }, [activeId, data, rowHeight, containerHeight, getId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      if (entries[0]) setContainerHeight(entries[0].contentRect.height);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const totalHeight = data.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight));
  const visibleCount = Math.ceil(containerHeight / rowHeight) || 10;
  const endIndex = Math.min(data.length, startIndex + visibleCount + 2);

  const visibleData = data.slice(startIndex, endIndex);
  const offsetY = startIndex * rowHeight;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden rounded-[32px] border border-slate-800 bg-black/40">
      <div className="bg-slate-900 border-b border-slate-800 z-10 shrink-0">
        {header}
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-hide relative"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div style={{ height: totalHeight, width: '100%' }}>
          <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', top: 0, left: 0, right: 0 }}>
            <table className="w-full text-left text-[11px] mono border-collapse">
              <tbody>
                {visibleData.map((item, idx) => renderRow(item, startIndex + idx))}
              </tbody>
            </table>
          </div>
        </div>
        {data.length === 0 && (
          <div className="p-20 text-center italic opacity-10 font-black uppercase tracking-[2em]">Empty</div>
        )}
      </div>
    </div>
  );
}
