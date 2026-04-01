import type { PositionDirection, SimulationOutputs } from '../types'

export const getPipSize = (symbol: string) => (symbol.includes('JPY') ? 0.01 : 0.0001)

const parseSymbol = (symbol: string) => {
  const [base = '', quote = ''] = symbol.split('/')
  return { base, quote }
}

export const getPipValue = (symbol: string, sizeUnits: number, referencePrice?: number) => {
  const pipSize = getPipSize(symbol)
  const { base, quote } = parseSymbol(symbol)
  if (quote === 'USD') return sizeUnits * pipSize
  if (base === 'USD') return (sizeUnits * pipSize) / Math.max(referencePrice ?? 1, 0.0001)
  return (sizeUnits * pipSize * 0.85) / Math.max(referencePrice ?? 1, 0.0001)
}

export const calculateTradeOutputs = (params: {
  symbol: string
  direction: PositionDirection
  capital: number
  leverage: number
  entry: number
  exit: number
  stopLoss: number
  takeProfit: number
  positionSize: number
  spread: number
  fees: number
}): SimulationOutputs => {
  const {
    symbol,
    direction,
    capital,
    leverage,
    entry,
    exit,
    stopLoss,
    takeProfit,
    positionSize,
    spread,
    fees,
  } = params
  const pipSize = getPipSize(symbol)
  const signedMove = direction === 'long' ? exit - entry : entry - exit
  const pipMove = signedMove / pipSize
  const { base, quote } = parseSymbol(symbol)
  const pipValue = getPipValue(symbol, positionSize, entry)
  const grossPnL = pipMove * pipValue
  const spreadCost = spread * pipValue
  const netPnL = grossPnL - spreadCost - fees
  const riskPips = Math.abs((direction === 'long' ? entry - stopLoss : stopLoss - entry) / pipSize)
  const rewardPips = Math.abs((direction === 'long' ? takeProfit - entry : entry - takeProfit) / pipSize)
  const riskAmount = riskPips * pipValue
  const rewardAmount = rewardPips * pipValue
  const rrRatio = riskAmount === 0 ? 0 : rewardAmount / riskAmount
  const rMultiple = riskAmount === 0 ? 0 : netPnL / riskAmount
  const notionalExposure =
    quote === 'USD' ? entry * positionSize : base === 'USD' ? positionSize : entry * positionSize * 0.72
  const marginUsed = leverage === 0 ? 0 : notionalExposure / leverage
  const freeMargin = capital - marginUsed
  const balanceAfterTrade = capital + netPnL
  const drawdownAtStop = riskAmount

  return {
    priceMove: signedMove,
    pipMove,
    pipValue,
    grossPnL,
    netPnL,
    riskAmount,
    rewardAmount,
    rrRatio,
    rMultiple,
    marginUsed,
    freeMargin,
    balanceAfterTrade,
    drawdownAtStop,
  }
}

export interface MonteCarloScenarioInput {
  capital: number
  trades: number
  winRate: number
  averageR: number
  riskPerTrade: number
  streakIntensity: number
}

export interface MonteCarloSummary {
  best: number
  median: number
  worst: number
  breachProbability: number
  aboveStartProbability: number
  paths: number[][]
}

export const generateMonteCarloSummary = ({
  capital,
  trades,
  winRate,
  averageR,
  riskPerTrade,
  streakIntensity,
}: MonteCarloScenarioInput): MonteCarloSummary => {
  const paths = Array.from({ length: 24 }, (_, pathIndex) => {
    let balance = capital
    const path = [capital]
    for (let tradeIndex = 0; tradeIndex < trades; tradeIndex += 1) {
      const rhythm = ((tradeIndex + 1) * (pathIndex + 3) * 17) % 100
      const winBias = rhythm < winRate * 100 + (tradeIndex % 3) * streakIntensity * 2
      const riskCash = balance * (riskPerTrade / 100)
      const pnl = winBias ? riskCash * averageR : -riskCash
      balance += pnl
      path.push(Number(balance.toFixed(2)))
    }
    return path
  })

  const finals = paths.map((path) => path[path.length - 1]).sort((a, b) => a - b)
  const worst = finals[0] ?? capital
  const best = finals[finals.length - 1] ?? capital
  const median = finals[Math.floor(finals.length / 2)] ?? capital
  const breachProbability = finals.filter((value) => value < capital * 0.85).length / finals.length
  const aboveStartProbability = finals.filter((value) => value > capital).length / finals.length

  return {
    best,
    median,
    worst,
    breachProbability,
    aboveStartProbability,
    paths,
  }
}
