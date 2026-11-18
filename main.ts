// Slow-trend cbBTC/USDC bot for make.fun's bars-replay/v1 race.
//
// Strategy (long only, one position, full size):
//   - EMA(75) crosses above EMA(180) on 1-minute closes, and only when the
//     market has actually moved: the close is at least 0.30% above the close
//     60 bars ago. The confirmation keeps the bot out of flat EMA crosses
//     that have not produced a real move yet.
//   - Exit the whole position on any of:
//       * take profit: position value >= 1.5% above its cost (fees included),
//       * stop loss:  position value <= 0.3% below its cost,
//       * trend exit: EMA(75) crosses back below EMA(180).
//   - Orders fill at the next bar's open and a full-size round trip costs
//     roughly 26 bps in fees, slippage and price impact, so the bot trades
//     rarely (a handful of round trips per day at most) and only rides
//     sustained multi-hour moves. Cash earns nothing, so staying flat
//     through choppy or falling stretches is the point, not a failure.
//
// Determinism: EMAs run in float64 in arrival order (IEEE 754, same as the
// kit baselines), all decisions are integer comparisons on the closes and
// on the account the harness reports, no wall clock, no randomness, no
// environment reads. The bot reads only the bars and account of each batch.

import { runBars, type BarsState, type BuyInput, type OrderInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const FAST_SPAN = 75;
const SLOW_SPAN = 180;
const CONFIRM_BARS = 60;
/** Entry needs close > close 60 bars ago by at least 30 bps. */
const CONFIRM_NUM = 1003n;
const CONFIRM_DEN = 1000n;
/** Take profit +1.5%: value*1000 >= cost*1015. Stop loss -0.3%: value*1000 <= cost*997. */
const TP_NUM = 1015n;
const SL_NUM = 997n;
const DEN = 1000n;
const MAX_SLIPPAGE_BPS = 100;

/** One EMA: the mean of its first span of closes, then 2/(span+1) steps. */
interface Ema {
  span: number;
  warm: number[];
  value: number | null;
}

function step(e: Ema, close: number): void {
  if (e.value !== null) {
    e.value += (2 / (e.span + 1)) * (close - e.value);
    return;
  }
  e.warm.push(close);
  if (e.warm.length === e.span) e.value = e.warm.reduce((a, x) => a + x, 0) / e.span;
}

const fast: Ema = { span: FAST_SPAN, warm: [], value: null };
const slow: Ema = { span: SLOW_SPAN, warm: [], value: null };
/** Closes of CBBTC bars, in arrival order. */
const closes: bigint[] = [];
/** fast - slow after the previous bar, once both are set. */
let gap: number | null = null;
/** fast - slow after this bar. */
let now: number | null = null;

await runBars({
  onBatch(state: BarsState, batch): OrderInput[] {
    for (const bar of batch.bars) {
      if (bar.symbol !== SYMBOL) continue;
      const c = Number(bar.c);
      closes.push(BigInt(bar.c));
      step(fast, c);
      step(slow, c);
      gap = now;
      now = fast.value !== null && slow.value !== null ? fast.value - slow.value : null;
    }
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      const value = state.value(SYMBOL, held.qty);
      if (value * DEN >= held.cost * TP_NUM) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies SellInput];
      }
      if (value * DEN <= held.cost * SL_NUM) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies SellInput];
      }
      if (gap !== null && now !== null && now < 0 && gap >= 0) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies SellInput];
      }
      return [];
    }

    // Not holding: enter on a confirmed cross up.
    if (gap === null || now === null || closes.length <= CONFIRM_BARS) return [];
    if (now > 0 && gap <= 0) {
      const latest = closes[closes.length - 1];
      const hourAgo = closes[closes.length - 1 - CONFIRM_BARS];
      if (latest * CONFIRM_DEN > hourAgo * CONFIRM_NUM) {
        const room = state.weightRoom(SYMBOL);
        const amount = state.cash < room ? state.cash : room;
        if (amount < BigInt(state.hello.fees.min_notional_quote_units)) return [];
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: amount, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies BuyInput];
      }
    }
    return [];
  },
});
