'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SquareType } from '@/store/gameStore'

// ============ TYPES ============

export type DiceProps = {
  value: number | null             // null = ยังไม่ทอย
  previewableSquares: {            // Variant C: ช่อง + type ที่จะเห็น
    index: number
    type: SquareType
  }[]
  disabled?: boolean
  onRoll: () => void
}

// ============ CONFIG ============

const FACE_DOTS: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}

const TYPE_COLORS: Record<SquareType, string> = {
  trade:   'text-amber-400 border-amber-600 bg-amber-900/40',
  skip:    'text-slate-300 border-slate-600 bg-slate-800/40',
  wisdom:  'text-violet-400 border-violet-600 bg-violet-900/40',
  mystery: 'text-teal-400  border-teal-600  bg-teal-900/40',
}

const TYPE_ICONS: Record<SquareType, string> = {
  trade: '⚔', skip: '⏭', wisdom: '✦', mystery: '?',
}

// ============ COMPONENT ============

export default function Dice({ value, previewableSquares, disabled = false, onRoll }: DiceProps) {
  const [rolling, setRolling] = useState(false)

  function handleRoll() {
    if (disabled || rolling) return
    setRolling(true)
    setTimeout(() => {
      setRolling(false)
      onRoll()
    }, 600)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Dice face */}
      <motion.button
        onClick={handleRoll}
        disabled={disabled || rolling}
        whileHover={!disabled && !rolling ? { scale: 1.05 } : {}}
        whileTap={!disabled && !rolling ? { scale: 0.9 } : {}}
        className={[
          'relative w-20 h-20 rounded-xl border-2 bg-slate-800',
          disabled ? 'border-slate-700 opacity-40 cursor-not-allowed' : 'border-slate-500 cursor-pointer',
          rolling ? 'animate-bounce' : '',
        ].join(' ')}
        title="Roll dice"
      >
        <AnimatePresence mode="wait">
          {rolling ? (
            <motion.div
              key="rolling"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 flex items-center justify-center text-3xl text-slate-400"
            >
              🎲
            </motion.div>
          ) : value !== null ? (
            <motion.div
              key={`face-${value}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute inset-0 p-2"
            >
              <DiceFace value={value} />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              className="absolute inset-0 flex items-center justify-center text-3xl text-slate-600"
            >
              🎲
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Roll label */}
      <p className="text-xs text-slate-500 text-center">
        {rolling
          ? 'Rolling…'
          : value !== null
            ? `Rolled ${value} — pick a square below`
            : disabled
              ? 'Predict bias first ↑'
              : 'Tap to roll d6'}
      </p>

      {/* Variant C: type preview for reachable squares */}
      <AnimatePresence>
        {previewableSquares.length > 0 && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex flex-col items-center gap-2"
          >
            <p className="text-xs text-slate-400 uppercase tracking-widest">Choose square</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {previewableSquares.map(({ index, type }) => (
                <SquarePreviewChip key={index} squareIndex={index} type={type} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============ SUB-COMPONENTS ============

function DiceFace({ value }: { value: number }) {
  const dots = FACE_DOTS[value] ?? []
  // 3×3 grid
  const grid = Array.from({ length: 3 }, (_, r) =>
    Array.from({ length: 3 }, (_, c) =>
      dots.some(([dr, dc]) => dr === r && dc === c)
    )
  )
  return (
    <div className="w-full h-full grid grid-rows-3 grid-cols-3 gap-0.5 p-1">
      {grid.flat().map((filled, i) => (
        <div key={i} className="flex items-center justify-center">
          {filled && (
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm shadow-white/30" />
          )}
        </div>
      ))}
    </div>
  )
}

function SquarePreviewChip({ squareIndex, type }: { squareIndex: number; type: SquareType }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${TYPE_COLORS[type]}`}>
      <span>{TYPE_ICONS[type]}</span>
      <span>#{squareIndex + 1}</span>
    </div>
  )
}
