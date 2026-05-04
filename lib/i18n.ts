// Lightweight i18n — flat key-string dictionary, no library.
// Supports {placeholder} substitution.

export type Language = 'en' | 'th'

export type Dict = Record<string, string>

const EN: Dict = {
  // Top bar / shell
  'app.title':            'TRADE ROGUELIKE',
  'app.subtitle':         'M5 · XAUUSD',
  'app.equity':           'Equity',
  'app.square':           'Square',
  'app.disclaimer':       'For education only — not financial advice',

  // Start screen
  'start.tagline':        'XAUUSD · M5 · Deliberate Practice',
  'start.runs':           'Runs',
  'start.biasAccuracy':   'Bias Accuracy',
  'start.first':          'Start Run',
  'start.next':           'New Run',
  'start.loading':        'Loading…',

  // Bias panel
  'bias.title':           'Bias Prediction',
  'bias.prompt':          'Will the next candle close green, red, or doji?',
  'bias.help':            'Required before rolling. Get it right → next losing trade takes only -50% damage. Wrong has no penalty.',
  'bias.bullish':         'Bullish',
  'bias.bearish':         'Bearish',
  'bias.doji':            'Doji',
  'bias.correct':         '✓ Correct! -50% damage next trade',
  'bias.wrong':           '✗ Wrong — no penalty',
  'bias.streak':          '{n} streak',

  // Dice
  'dice.rolling':         'Rolling…',
  'dice.rolled':          'Rolled {n} — pick a square below',
  'dice.blocked':         'Predict bias first ↑',
  'dice.idle':            'Tap to roll d6',
  'dice.chooseSquare':    'Choose square',

  // Board legend
  'square.trade':         'Trade',
  'square.skip':          'Skip',
  'square.wisdom':        'Wisdom',
  'square.mystery':       '?',

  // Trade panel
  'trade.title':          'Trade Square',
  'trade.help':           'Read the chart and decide. SL/TP auto-set at 1.5×ATR (1:1 R:R). SKIP keeps you safe but earns nothing.',
  'trade.bonus':          '-50% loss',
  'trade.equity':         'Equity',
  'trade.risk':           'Risk (1R)',
  'trade.setupQ':         'What setup do you see?',
  'trade.optional':       '(optional)',
  'trade.skipSetup':      'Skip setup guess →',
  'trade.setupGuess':     'Setup guess:',
  'trade.actionQ':        'Your action?',
  'trade.buy':            'BUY',
  'trade.sell':           'SELL',
  'trade.skip':           'SKIP',
  'trade.back':           '← Back',

  // Setup types
  'setup.breakout':       'Breakout',
  'setup.breakoutDesc':   'Price breaks key level',
  'setup.pullback':       'Pullback',
  'setup.pullbackDesc':   'Retrace in a trend',
  'setup.range':          'Range',
  'setup.rangeDesc':      'Bounce between levels',
  'setup.reversal':       'Reversal',
  'setup.reversalDesc':   'Trend change signal',

  // Wisdom panel
  'wisdom.active':        'Active Perk',
  'wisdom.choose':        'Wisdom Square — Choose a Perk',
  'wisdom.tradeoff':      'Trade-off: {text}',

  // Perks
  'perk.iron_will':            'Iron Will',
  'perk.iron_willDesc':        'Next loss reduced 25% extra',
  'perk.iron_willTradeoff':    'No effect on wins',
  'perk.sniper':               'Sniper',
  'perk.sniperDesc':           'Next win gives +0.5R bonus',
  'perk.sniperTradeoff':       'One-shot only',
  'perk.extra_skip':           'Extra Time',
  'perk.extra_skipDesc':       'Gain 1 free skip this run',
  'perk.extra_skipTradeoff':   'No combat bonus',
  'perk.bull_vision':          'Bull Vision',
  'perk.bull_visionDesc':      'Count 1 free bias correct',
  'perk.bull_visionTradeoff':  'Skips the Q1 phase',
  'perk.second_chance':        'Second Chance',
  'perk.second_chanceDesc':    'Reroll dice once this run',
  'perk.second_chanceTradeoff':'One-shot only',

  // Mystery
  'mystery.title':        'Mystery Square',
  'mystery.lucky':        'Lucky flip!',
  'mystery.unlucky':      'Unlucky flip',
  'mystery.continue':     'Continue',

  // Trade resolution
  'resolution.tpHit':     '✓ Take Profit Hit',
  'resolution.slHit':     '✗ Stop Loss Hit',
  'resolution.candles':   '{n} candle to resolution',
  'resolution.candles_other':'{n} candles to resolution',
  'resolution.action':    'Action',
  'resolution.entry':     'Entry',
  'resolution.tp':        'Take Profit',
  'resolution.sl':        'Stop Loss',
  'resolution.distance':  'Distance',
  'resolution.setup':     'Setup',
  'resolution.session':   'Session',
  'resolution.continue':  'Continue',
  'resolution.whyWin':    'Price moved {dir} to your Take Profit before retracing. You earned 1R.',
  'resolution.whyLossSoftened':'Price moved against you and hit Stop Loss. Your correct bias guess softened the blow by 50%.',
  'resolution.whyLoss':   'Price moved against you and hit Stop Loss. You lost 1R.',
  'resolution.up':        'up',
  'resolution.down':      'down',

  // Scorecard
  'sc.complete':          'Run Complete',
  'sc.finalEquity':       'Final Equity',
  'sc.roi':               'ROI',
  'sc.trades':            'Trades',
  'sc.wins':              'Wins',
  'sc.losses':            'Losses',
  'sc.skips':             'Skips',
  'sc.winrate':           'Winrate',
  'sc.biasAccuracy':      'Bias Accuracy',
  'sc.rDist':             'R-Multiple Distribution',
  'sc.diagnosis':         'Diagnosis',
  'sc.newRun':            'New Run',

  // Run-over panel
  'over.title':           'Run Complete!',
  'over.finalEquity':     'Final equity:',
  'over.viewScorecard':   'View Scorecard',

  // Archetypes
  'archetype.Breakout Chaser':         'Breakout Chaser',
  'archetype.Fearful Skipper':         'Fearful Skipper',
  'archetype.Tilt Trader':             'Tilt Trader',
  'archetype.Patient Pullback Trader': 'Patient Pullback Trader',
  'archetype.Range Bouncer':           'Range Bouncer',
  'archetype.Balanced Trader':         'Balanced Trader',
}

const TH: Dict = {
  'app.title':            'TRADE ROGUELIKE',
  'app.subtitle':         'M5 · XAUUSD',
  'app.equity':           'ทุน',
  'app.square':           'ช่อง',
  'app.disclaimer':       'เพื่อการศึกษาเท่านั้น — ไม่ใช่คำแนะนำการลงทุน',

  'start.tagline':        'XAUUSD · M5 · ฝึกอ่านกราฟอย่างตั้งใจ',
  'start.runs':           'รัน',
  'start.biasAccuracy':   'ความแม่นทำนายแท่ง',
  'start.first':          'เริ่มเล่น',
  'start.next':           'รันใหม่',
  'start.loading':        'กำลังโหลด…',

  'bias.title':           'ทำนายแท่งถัดไป',
  'bias.prompt':          'แท่งถัดไปจะปิดเขียว แดง หรือ doji?',
  'bias.help':            'ต้องตอบก่อนทอย ถ้าทายถูก → trade ถัดไปที่แพ้จะลด damage 50% ทายผิดไม่มี penalty',
  'bias.bullish':         'ขึ้น',
  'bias.bearish':         'ลง',
  'bias.doji':            'โดจิ',
  'bias.correct':         '✓ ถูก! -50% damage trade ถัดไป',
  'bias.wrong':           '✗ ผิด — ไม่มี penalty',
  'bias.streak':          '{n} ติด',

  'dice.rolling':         'กำลังทอย…',
  'dice.rolled':          'ทอยได้ {n} — เลือกช่องด้านล่าง',
  'dice.blocked':         'ทำนาย bias ก่อน ↑',
  'dice.idle':            'แตะเพื่อทอยลูกเต๋า',
  'dice.chooseSquare':    'เลือกช่อง',

  'square.trade':         'เทรด',
  'square.skip':          'ข้าม',
  'square.wisdom':        'ปัญญา',
  'square.mystery':       '?',

  'trade.title':          'ช่องเทรด',
  'trade.help':           'อ่านกราฟแล้วตัดสินใจ SL/TP ตั้งอัตโนมัติที่ 1.5×ATR (R:R 1:1) SKIP ปลอดภัยแต่ไม่ได้กำไร',
  'trade.bonus':          '-50% loss',
  'trade.equity':         'ทุน',
  'trade.risk':           'ความเสี่ยง (1R)',
  'trade.setupQ':         'คุณเห็น setup อะไร?',
  'trade.optional':       '(เลือกหรือข้ามได้)',
  'trade.skipSetup':      'ข้ามการเดา setup →',
  'trade.setupGuess':     'เดา setup:',
  'trade.actionQ':        'คุณจะทำอะไร?',
  'trade.buy':            'ซื้อ',
  'trade.sell':           'ขาย',
  'trade.skip':           'ข้าม',
  'trade.back':           '← กลับ',

  'setup.breakout':       'Breakout',
  'setup.breakoutDesc':   'ราคาทะลุแนวสำคัญ',
  'setup.pullback':       'Pullback',
  'setup.pullbackDesc':   'ราคาย่อในเทรนด์',
  'setup.range':          'Range',
  'setup.rangeDesc':      'แกว่งระหว่างแนว',
  'setup.reversal':       'Reversal',
  'setup.reversalDesc':   'สัญญาณกลับเทรนด์',

  'wisdom.active':        'Perk ที่ใช้อยู่',
  'wisdom.choose':        'ช่องปัญญา — เลือก Perk',
  'wisdom.tradeoff':      'ข้อเสีย: {text}',

  'perk.iron_will':            'Iron Will',
  'perk.iron_willDesc':        'การแพ้ครั้งถัดไปลด 25% เพิ่ม',
  'perk.iron_willTradeoff':    'ไม่มีผลกับการชนะ',
  'perk.sniper':               'Sniper',
  'perk.sniperDesc':           'การชนะครั้งถัดไป +0.5R',
  'perk.sniperTradeoff':       'ใช้ได้ครั้งเดียว',
  'perk.extra_skip':           'Extra Time',
  'perk.extra_skipDesc':       'ได้ free skip 1 ครั้งในรันนี้',
  'perk.extra_skipTradeoff':   'ไม่ช่วยตอนเทรด',
  'perk.bull_vision':          'Bull Vision',
  'perk.bull_visionDesc':      'นับ bias ถูกฟรี 1 ครั้ง',
  'perk.bull_visionTradeoff':  'ข้ามขั้นตอน Q1',
  'perk.second_chance':        'Second Chance',
  'perk.second_chanceDesc':    'ทอยใหม่ได้ 1 ครั้งในรันนี้',
  'perk.second_chanceTradeoff':'ใช้ได้ครั้งเดียว',

  'mystery.title':        'ช่องลึกลับ',
  'mystery.lucky':        'โชคดี!',
  'mystery.unlucky':      'โชคร้าย',
  'mystery.continue':     'ไปต่อ',

  'resolution.tpHit':     '✓ ชน Take Profit',
  'resolution.slHit':     '✗ ชน Stop Loss',
  'resolution.candles':   'จบใน {n} แท่ง',
  'resolution.candles_other':'จบใน {n} แท่ง',
  'resolution.action':    'การทำ',
  'resolution.entry':     'ราคาเข้า',
  'resolution.tp':        'Take Profit',
  'resolution.sl':        'Stop Loss',
  'resolution.distance':  'ระยะทาง',
  'resolution.setup':     'Setup',
  'resolution.session':   'Session',
  'resolution.continue':  'ไปต่อ',
  'resolution.whyWin':    'ราคาวิ่ง{dir}ถึง Take Profit ก่อนที่จะย่อตัว ได้กำไร 1R',
  'resolution.whyLossSoftened':'ราคาวิ่งสวนและชน Stop Loss แต่ทำนาย bias ถูก ลด damage 50%',
  'resolution.whyLoss':   'ราคาวิ่งสวนและชน Stop Loss เสีย 1R',
  'resolution.up':        'ขึ้น',
  'resolution.down':      'ลง',

  'sc.complete':          'จบรัน',
  'sc.finalEquity':       'ทุนสุดท้าย',
  'sc.roi':               'ROI',
  'sc.trades':            'เทรด',
  'sc.wins':              'ชนะ',
  'sc.losses':            'แพ้',
  'sc.skips':             'ข้าม',
  'sc.winrate':           'อัตราชนะ',
  'sc.biasAccuracy':      'ความแม่น Bias',
  'sc.rDist':             'การกระจาย R-Multiple',
  'sc.diagnosis':         'วินิจฉัย',
  'sc.newRun':            'รันใหม่',

  'over.title':           'จบรันแล้ว!',
  'over.finalEquity':     'ทุนสุดท้าย:',
  'over.viewScorecard':   'ดูสรุปผล',

  'archetype.Breakout Chaser':         'นักไล่ Breakout',
  'archetype.Fearful Skipper':         'นักข้ามจอมระวัง',
  'archetype.Tilt Trader':             'เทรดเดอร์ขาดสติ',
  'archetype.Patient Pullback Trader': 'นักรอ Pullback',
  'archetype.Range Bouncer':           'นักเด้ง Range',
  'archetype.Balanced Trader':         'เทรดเดอร์สมดุล',
}

const DICTS: Record<Language, Dict> = { en: EN, th: TH }

export function translate(lang: Language, key: string, params?: Record<string, string | number>): string {
  const dict = DICTS[lang] ?? EN
  let s = dict[key] ?? EN[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(`{${k}}`, String(v))
    }
  }
  return s
}
