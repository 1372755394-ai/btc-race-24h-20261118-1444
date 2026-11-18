# btc-race-24h-20261118-1444

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/1372755394-ai/btc-race-24h-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/1372755394-ai/btc-race-24h-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A slow-trend trading bot for cbBTC/USDC on 1-minute bars. It goes long, full size, when EMA(75) crosses above EMA(180) and the close is at least 0.30% above the close 60 bars ago, and exits the whole position at +1.5% take-profit, −0.3% stop-loss, or an EMA cross back down. A full-size round trip costs roughly 26 bps in fees, slippage and price impact, so the bot trades rarely and only rides sustained multi-hour moves, staying in cash through choppy or falling stretches. On the published dev window it made +$14.76 net PnL on a single round trip (max drawdown 0.64%).

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=fvhrex9k&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
