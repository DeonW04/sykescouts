import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const PIN_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-yellow-400', 'bg-green-500', 'bg-purple-500'];

export default function PostItNote({ idea, boardRef, onClick, onDragEnd, isSelected }) {
  const noteRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef(null);
  const pinColor = PIN_COLORS[idea.id?.charCodeAt(0) % PIN_COLORS.length] || 'bg-red-500';

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    const noteRect = noteRef.current.getBoundingClientRect();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startPctX: idea.pos_x,
      startPctY: idea.pos_y,
      boardW: board.scrollWidth,
      boardH: board.scrollHeight,
    };
    setIsDragging(true);

    const onMouseMove = (e) => {
      if (!dragStart.current) return;
      const { mouseX, mouseY, startPctX, startPctY, boardW, boardH } = dragStart.current;
      const dx = ((e.clientX - mouseX) / boardW) * 100;
      const dy = ((e.clientY - mouseY) / boardH) * 100;
      const noteW = (220 / boardW) * 100;
      const noteH = (200 / boardH) * 100;
      const newX = Math.max(0, Math.min(100 - noteW, startPctX + dx));
      const newY = Math.max(0, Math.min(100 - noteH, startPctY + dy));
      if (noteRef.current) {
        noteRef.current.style.left = `${newX}%`;
        noteRef.current.style.top = `${newY}%`;
      }
      dragStart.current._newX = newX;
      dragStart.current._newY = newY;
    };

    const onMouseUp = () => {
      setIsDragging(false);
      if (dragStart.current?._newX !== undefined) {
        onDragEnd(idea.id, dragStart.current._newX, dragStart.current._newY);
      } else {
        onClick();
      }
      dragStart.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const truncated = idea.description?.length > 100
    ? idea.description.slice(0, 100) + '…'
    : idea.description;

  return (
    <div
      ref={noteRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${idea.pos_x ?? 10}%`,
        top: `${idea.pos_y ?? 10}%`,
        width: '220px',
        transform: `rotate(${idea.rotation ?? 0}deg)`,
        zIndex: isSelected ? 50 : isDragging ? 40 : 10,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        filter: isSelected ? 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))' : 'drop-shadow(2px 4px 8px rgba(0,0,0,0.18))',
        transition: isDragging ? 'none' : 'filter 0.2s',
      }}
    >
      {/* Pin */}
      <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 ${pinColor} rounded-full shadow-lg border-2 border-white z-20`}
        style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
      />

      {/* Note body */}
      <div
        className={`${idea.color || 'bg-yellow-200'} rounded-sm pt-5 pb-4 px-4 relative`}
        style={{
          minHeight: '170px',
          boxShadow: '3px 4px 10px rgba(0,0,0,0.15), inset 0 -1px 0 rgba(0,0,0,0.05)',
          background: idea.color
            ? undefined
            : 'linear-gradient(to bottom, #fef08a, #fde047)',
        }}
      >
        {/* Lined paper effect */}
        <div className="absolute inset-0 rounded-sm overflow-hidden pointer-events-none opacity-20">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="border-b border-gray-400/40" style={{ marginTop: `${28 + i * 22}px` }} />
          ))}
        </div>

        {idea.source === 'ai_generated' && (
          <div className="absolute top-1.5 right-2 text-xs opacity-60">✨</div>
        )}
        {idea.status === 'added_to_programme' && (
          <div className="absolute top-1.5 left-2 text-xs opacity-70">✅</div>
        )}

        <p className="text-sm font-bold text-gray-800 leading-tight mb-2 relative z-10"
          style={{ fontFamily: "'Georgia', 'Palatino', serif" }}>
          {idea.title}
        </p>

        {truncated && (
          <p className="text-xs text-gray-600 leading-relaxed relative z-10 line-clamp-4">
            {truncated}
          </p>
        )}

        {idea.suggested_week && (
          <p className="text-xs text-gray-500 mt-2 relative z-10 font-medium">
            📅 {idea.suggested_week}
          </p>
        )}

        <p className="text-xs text-gray-400 mt-2 relative z-10">
          — {idea.added_by_name || 'Leader'}
        </p>
      </div>
    </div>
  );
}