'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Square, SquareType } from '@/store/gameStore'

// ============ TYPES ============

export type BoardProps = {
  squares: Square[]
  currentIndex: number          // -1 = ยังไม่ได้เริ่ม (pawn อยู่ก่อน square 0)
  previewableIndices: number[]  // Variant C: ช่องที่ dice preview ให้เห็น type ได้
  onSquareClick?: (idx: number) => void
}

// ============ CONFIG ============

// Snake layout: 5 rows × 6 cols (30 squares)
// even rows → left-to-right, odd rows → right-to-left
const COLS = 6
const ROWS = 5

const SQUARE_META: Record<SquareType, { label: string; icon: string; bg: string; border: string; text: string }> = {
  trade:   { label: 'Trade',   icon: '⚔',  bg: 'bg-amber-900/60',   border: 'border-amber-500',  text: 'text-amber-300' },
  skip:    { label: 'Skip',    icon: '⏭',  bg: 'bg-slate-800/60',   border: 'border-slate-500',  text: 'text-slate-300' },
  wisdom:  { label: 'Wisdom',  icon: '✦',  bg: 'bg-violet-900/60',  border: 'border-violet-500', text: 'text-violet-300' },
  mystery: { label: '?',       icon: '?',  bg: 'bg-teal-900/60',    border: 'border-teal-500',   text: 'text-teal-300' },
}

// ============ LAYOUT HELPER ============

/** Returns {row, col} for square index in snake order */
function snakePos(idx: number): { row: number; col: number } {
  const row = Math.floor(idx / COLS)
  const colInRow = idx % COLS
  const col = row % 2 === 0 ? colInRow : COLS - 1 - colInRow
  return { row, col }
}

// ============ COMPONENT ============

export default function Board({ squares, currentIndex, previewableIndices, onSquareClick }: BoardProps) {
  const previewSet = new Set(previewableIndices)

  // Build grid: rows top → bottom (row 0 = top), but we want the path to go
  // bottom-to-top so square 0 is bottom-left (more intuitive as "start").
  // We flip: displayRow = ROWS - 1 - row
  const cells: { idx: number; displayRow: number; col: number }[] = squares.map((sq) => {
    const { row, col } = snakePos(sq.index)
    return { idx: sq.index, displayRow: ROWS - 1 - row, col }
  })

  // Group by displayRow for rendering
  const byRow: Record<number, typeof cells> = {}
  for (const c of cells) {
    if (!byRow[c.displayRow]) byRow[c.displayRow] = []
    byRow[c.displayRow].push(c)
  }

  // Pawn grid position
  const pawnPos = currentIndex >= 0 ? snakePos(currentIndex) : null
  const pawnDisplayRow = pawnPos ? ROWS - 1 - pawnPos.row : null

  return (
    <div className="select-none p-2">
      {/* Grid */}
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: ROWS }, (_, displayRow) => (
          <div key={displayRow} className="flex gap-1.5 justify-center">
            {(byRow[displayRow] ?? [])
              .sort((a, b) => a.col - b.col)
              .map(({ idx }) => {
                const sq = squares[idx]
                const meta = SQUARE_META[sq.type]
                const isPreview   = previewSet.has(idx)
                const isCurrent   = idx === currentIndex
                const isResolved  = sq.resolved
                const isClickable = isPreview && !isResolved

                return (
                  <SquareCell
                    key={idx}
                    index={idx}
                    meta={meta}
                    isCurrent={isCurrent}
                    isPreview={isPreview}
                    isResolved={isResolved}
                    isClickable={isClickable}
                    showType={isPreview || isCurrent || isResolved}
                    onClick={isClickable ? () => onSquareClick?.(idx) : undefined}
                  />
                )
              })}
          </div>
        ))}
      </div>

      {/* Pawn overlay — absolutely positioned over the grid */}
      <AnimatePresence>
        {pawnPos !== null && pawnDisplayRow !== null && (
          <PawnOverlay
            displayRow={pawnDisplayRow}
            col={pawnPos.col}
          />
        )}
      </AnimatePresence>

      {/* Legend */}
      <Legend />
    </div>
  )
}

// ============ SUB-COMPONENTS ============

type SquareCellProps = {
  index: number
  meta: typeof SQUARE_META[SquareType]
  isCurrent: boolean
  isPreview: boolean
  isResolved: boolean
  isClickable: boolean
  showType: boolean
  onClick?: () => void
}

function SquareCell({ index, meta, isCurrent, isPreview, isResolved, isClickable, showType, onClick }: SquareCellProps) {
  return (
    <motion.button
      key={index}
      onClick={onClick}
      disabled={!isClickable}
      whileHover={isClickable ? { scale: 1.1 } : {}}
      whileTap={isClickable ? { scale: 0.95 } : {}}
      className={[
        'relative w-10 h-10 rounded-md border-2 flex flex-col items-center justify-center transition-all duration-200',
        showType ? meta.bg : 'bg-slate-900/40',
        showType ? meta.border : 'border-slate-700/40',
        isCurrent ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : '',
        isPreview && !isCurrent ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent animate-pulse' : '',
        isResolved ? 'opacity-40' : '',
        isClickable ? 'cursor-pointer' : 'cursor-default',
      ].filter(Boolean).join(' ')}
      title={showType ? meta.label : `Square ${index + 1}`}
    >
      {/* Square number */}
      <span className="text-[9px] text-slate-500 leading-none">{index + 1}</span>

      {/* Type icon — only when revealed */}
      {showType && (
        <span className={`text-sm leading-none ${meta.text}`}>{meta.icon}</span>
      )}

      {/* Hidden square */}
      {!showType && (
        <span className="text-slate-600 text-xs">·</span>
      )}
    </motion.button>
  )
}

// Pawn rendered as an overlay chip — positioned via CSS grid trick
// We use a simple absolute approach: calculate % offset from grid position
function PawnOverlay({ displayRow, col }: { displayRow: number; col: number }) {
  // Each cell is ~40px wide + 6px gap = 46px. Board centers in parent.
  // We use CSS vars approach by injecting inline style.
  const CELL = 40
  const GAP  = 6
  const BOARD_WIDTH = COLS * CELL + (COLS - 1) * GAP

  const x = col * (CELL + GAP) + CELL / 2
  const y = displayRow * (CELL + GAP) + CELL / 2

  return (
    <motion.div
      className="pointer-events-none absolute z-10"
      style={{
        // Offset from center of board. Parent must be position:relative.
        left: `calc(50% - ${BOARD_WIDTH / 2}px + ${x - CELL / 2}px)`,
        top:  `calc(${y - CELL / 2}px + 8px)`, // 8px = padding
        width: CELL,
        height: CELL,
      }}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-white shadow-lg shadow-white/20 flex items-center justify-center text-sm font-bold text-slate-900 ring-2 ring-white/40">
          ♟
        </div>
      </div>
    </motion.div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-3">
      {(Object.entries(SQUARE_META) as [SquareType, typeof SQUARE_META[SquareType]][]).map(([type, meta]) => (
        <div key={type} className="flex items-center gap-1">
          <span className={`text-xs ${meta.text}`}>{meta.icon}</span>
          <span className="text-xs text-slate-500">{meta.label}</span>
        </div>
      ))}
    </div>
  )
}
