'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Language } from '@/lib/i18n'

type Slide = { icon: string; title: string; body: React.ReactNode }

// ── English slides ────────────────────────────────────────────────────────

const SLIDES_EN: Slide[] = [
  {
    icon: '🎲',
    title: 'What is Trade Roguelike?',
    body: (
      <>
        <p>A chart-reading training game for XAUUSD (Gold).</p>
        <p className="mt-2">
          You&apos;ll read <strong className="text-amber-300">real price charts</strong>, predict
          direction, classify the setup, and manage risk across 30 trading squares.
        </p>
        <p className="mt-2">
          Every number you see — win rates, trade outcomes, setup stats — is backed by a
          real backtest on real market data.
        </p>
      </>
    ),
  },
  {
    icon: '📊',
    title: 'The data is real',
    body: (
      <>
        <p>
          All candles are <strong className="text-amber-300">actual XAUUSD 5-minute bars</strong> from
          Feb–May 2026 — 13,496 candles total.
        </p>
        <p className="mt-2">
          No random walk. No synthetic data. Every run draws a random slice of real market
          history you haven&apos;t seen before.
        </p>
        <p className="mt-2 text-slate-500 text-xs">Data source: real XAUUSD M5 OHLC bars.</p>
      </>
    ),
  },
  {
    icon: '🔮',
    title: 'Bias prediction',
    body: (
      <>
        <p>
          Before each dice roll, predict whether the next candle will close{' '}
          <strong className="text-green-400">UP</strong> or{' '}
          <strong className="text-red-400">DOWN</strong>.
        </p>
        <p className="mt-2">
          Get it right → <strong className="text-emerald-300">your next loss is softened by 50%</strong>.
        </p>
        <p className="mt-2">
          This trains the most fundamental chart-reading skill: predicting the immediate
          next candle direction.
        </p>
      </>
    ),
  },
  {
    icon: '🧠',
    title: 'Setup types & real win rates',
    body: (
      <>
        <p>The game classifies the chart context before each trade:</p>
        <div className="mt-3 flex flex-col gap-1.5 text-sm font-mono">
          {[
            ['Structure break', '51.3%', true],
            ['With trend',      '48.9%', false],
            ['Counter move',    '~54%',  true],
            ['Instinct',        '49.2%', false],
          ].map(([label, wr, good]) => (
            <div key={label as string} className="flex justify-between">
              <span className="text-slate-300">{label}</span>
              <span className={good ? 'text-emerald-400' : 'text-slate-400'}>{wr} win rate</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Real backtested win rates from 2,687 trades on XAUUSD M5, 1:1 ATR stop/target.
        </p>
      </>
    ),
  },
  {
    icon: '🗺️',
    title: 'How to play',
    body: (
      <>
        <p>Roll dice → land on a square → act.</p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          {[
            ['🟦', 'Trade',   'text-blue-400',   'Read the chart, decide BUY / SELL / SKIP'],
            ['⬜', 'Skip',    'text-slate-400',   'Free pass, no trade'],
            ['🟨', 'Wisdom',  'text-yellow-400',  'Choose a perk that changes the game'],
            ['🟥', 'Mystery', 'text-red-400',     'Random event — good or bad'],
          ].map(([emoji, name, color, desc]) => (
            <div key={name as string} className="flex gap-3 items-start">
              <span className={`${color} shrink-0`}>{emoji} {name}</span>
              <span className="text-slate-300">{desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Start with $1,000. Risk 2% per trade. Survive all 30 squares.</p>
      </>
    ),
  },
  {
    icon: '🚀',
    title: "You're ready",
    body: (
      <>
        <p>
          You&apos;re playing with <strong className="text-amber-300">real market data</strong> and
          real backtest-backed statistics.
        </p>
        <p className="mt-2">
          After each run you&apos;ll see your <strong className="text-white">trading archetype</strong> and
          a diagnosis of how you read the market.
        </p>
        <p className="mt-2">
          Your results are saved. After your first run we&apos;ll ask for quick feedback —
          this is a beta and your input shapes the game directly.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          You can revisit this guide anytime via the <strong>?</strong> button.
        </p>
      </>
    ),
  },
]

// ── Thai slides ───────────────────────────────────────────────────────────

const SLIDES_TH: Slide[] = [
  {
    icon: '🎲',
    title: 'Trade Roguelike คืออะไร?',
    body: (
      <>
        <p>เกมฝึกอ่านกราฟ XAUUSD (ทอง) แบบ Roguelike</p>
        <p className="mt-2">
          คุณจะอ่าน <strong className="text-amber-300">กราฟราคาจริง</strong> ทำนายทิศทาง
          วิเคราะห์ Setup และบริหารความเสี่ยงผ่าน 30 ช่อง
        </p>
        <p className="mt-2">
          ตัวเลขทุกอย่างที่เห็น — win rate, ผล trade, สถิติ setup —
          มาจาก backtest บนข้อมูลตลาดจริง
        </p>
      </>
    ),
  },
  {
    icon: '📊',
    title: 'ข้อมูลเป็นของจริง',
    body: (
      <>
        <p>
          แท่งเทียนทั้งหมดคือ <strong className="text-amber-300">ข้อมูล XAUUSD M5 จริง</strong> ตั้งแต่
          กุมภาพันธ์–พฤษภาคม 2026 รวม 13,496 แท่ง
        </p>
        <p className="mt-2">
          ไม่ใช่ข้อมูลสังเคราะห์หรือ random walk ทุกรันดึงช่วงเวลาที่ต่างกันจากประวัติตลาดจริง
        </p>
        <p className="mt-2 text-slate-500 text-xs">แหล่งข้อมูล: XAUUSD M5 OHLC จริง</p>
      </>
    ),
  },
  {
    icon: '🔮',
    title: 'Bias Prediction',
    body: (
      <>
        <p>
          ก่อนทอดลูกเต๋าทุกครั้ง ให้ทำนายว่าแท่งถัดไปจะปิด{' '}
          <strong className="text-green-400">ขึ้น</strong> หรือ{' '}
          <strong className="text-red-400">ลง</strong>
        </p>
        <p className="mt-2">
          ทำนายถูก → <strong className="text-emerald-300">ลด damage ของ loss ถัดไป 50%</strong>
        </p>
        <p className="mt-2">
          ฝึกทักษะพื้นฐานที่สำคัญที่สุด: อ่านทิศทางแท่งเทียนถัดไป
        </p>
      </>
    ),
  },
  {
    icon: '🧠',
    title: 'ประเภท Setup & Win Rate จริง',
    body: (
      <>
        <p>เกมจะวิเคราะห์บริบทกราฟก่อนทุก trade:</p>
        <div className="mt-3 flex flex-col gap-1.5 text-sm font-mono">
          {[
            ['Structure break (ทะลุแนว)', '51.3%', true],
            ['With trend (ตามเทรนด์)',    '48.9%', false],
            ['Counter move (สวนทาง)',     '~54%',  true],
            ['Instinct (ไม่มี signal)',    '49.2%', false],
          ].map(([label, wr, good]) => (
            <div key={label as string} className="flex justify-between gap-2">
              <span className="text-slate-300 text-xs">{label}</span>
              <span className={`shrink-0 ${good ? 'text-emerald-400' : 'text-slate-400'}`}>{wr}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Win rate จริงจาก backtest 2,687 trade บน XAUUSD M5 ด้วย SL/TP แบบ 1:1 ATR
        </p>
      </>
    ),
  },
  {
    icon: '🗺️',
    title: 'วิธีเล่น',
    body: (
      <>
        <p>ทอดลูกเต๋า → เดินหมาก → ตัดสินใจ</p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          {[
            ['🟦', 'Trade',   'text-blue-400',   'อ่านกราฟแล้วเลือก BUY / SELL / SKIP'],
            ['⬜', 'Skip',    'text-slate-400',   'ผ่านช่องนี้ ไม่เทรด'],
            ['🟨', 'Wisdom',  'text-yellow-400',  'เลือก perk เพื่อเปลี่ยนรูปเกม'],
            ['🟥', 'Mystery', 'text-red-400',     'เหตุการณ์สุ่ม — ดีหรือร้าย'],
          ].map(([emoji, name, color, desc]) => (
            <div key={name as string} className="flex gap-3 items-start">
              <span className={`${color} shrink-0`}>{emoji} {name}</span>
              <span className="text-slate-300">{desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">เริ่มต้นด้วย $1,000 เสี่ยง 2% ต่อ trade ผ่านให้ครบ 30 ช่อง</p>
      </>
    ),
  },
  {
    icon: '🚀',
    title: 'พร้อมแล้ว!',
    body: (
      <>
        <p>
          คุณกำลังเล่นกับ <strong className="text-amber-300">ข้อมูลตลาดจริง</strong>{' '}
          และสถิติที่ผ่าน backtest มาแล้ว
        </p>
        <p className="mt-2">
          หลังแต่ละรัน คุณจะเห็น <strong className="text-white">Trading Archetype</strong>{' '}
          และการวิเคราะห์ว่าคุณอ่านตลาดเป็นอย่างไร
        </p>
        <p className="mt-2">
          ผลเกมถูกบันทึกไว้ และหลังรันแรกเราจะขอ feedback —
          เกมนี้ยังเป็น beta และคำติชมของคุณช่วยพัฒนาตรงๆ
        </p>
        <p className="mt-3 text-xs text-slate-500">
          กลับมาดูคู่มือนี้ได้ตลอดผ่านปุ่ม <strong>?</strong>
        </p>
      </>
    ),
  },
]

// ── Component ─────────────────────────────────────────────────────────────

const NAV = {
  en: { back: '← Back', next: 'Next →', skip: 'Skip', start: 'Start playing →' },
  th: { back: '← ย้อนกลับ', next: 'ถัดไป →', skip: 'ข้าม', start: 'เริ่มเล่น →' },
}

export default function IntroModal({
  language = 'en',
  onDone,
}: {
  language?: Language
  onDone: () => void
}) {
  const [slide, setSlide] = useState(0)
  const slides  = language === 'th' ? SLIDES_TH : SLIDES_EN
  const nav     = NAV[language] ?? NAV.en
  const isFirst = slide === 0
  const isLast  = slide === slides.length - 1
  const current = slides[slide]

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden"
      >
        {/* Progress bar */}
        <div className="flex gap-1.5 justify-center pt-4 px-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= slide ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Slide content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${language}-${slide}`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="px-6 py-5"
          >
            <p className="text-3xl mb-3">{current.icon}</p>
            <h2 className="text-white font-bold text-lg mb-3">{current.title}</h2>
            <div className="text-slate-300 text-sm leading-relaxed">{current.body}</div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="px-6 pb-5 flex gap-2">
          {!isFirst && (
            <button
              onClick={() => setSlide(s => s - 1)}
              className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400
                         hover:border-slate-400 text-sm font-medium transition-colors"
            >
              {nav.back}
            </button>
          )}
          {!isLast && (
            <>
              <motion.button
                onClick={() => setSlide(s => s + 1)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400
                           text-slate-900 font-bold text-sm transition-colors"
              >
                {nav.next}
              </motion.button>
              {slide > 0 && (
                <button
                  onClick={onDone}
                  className="px-3 py-2.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {nav.skip}
                </button>
              )}
            </>
          )}
          {isLast && (
            <motion.button
              onClick={onDone}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400
                         text-slate-900 font-bold text-sm transition-colors"
            >
              {nav.start}
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
