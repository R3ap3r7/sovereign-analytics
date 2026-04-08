export type ThemeMode = 'terminal' | 'paper'
export type DensityMode = 'compact' | 'research'
export type DashboardMode = 'compact' | 'research-heavy' | 'simulation-heavy'
export type AnalysisFocus = 'macro' | 'technical' | 'simulation' | 'portfolio'
export type RiskProfile = 'conservative' | 'balanced' | 'aggressive'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type ChartMode = 'line' | 'area' | 'candlestick'
export type PairClassification = 'major' | 'cross' | 'minor'
export type ImpactLevel = 'low' | 'medium' | 'high'
export type SentimentTone = 'bullish' | 'bearish' | 'neutral'
export type TrendLabel = 'bullish' | 'bearish' | 'neutral'
export type VolatilityBucket = 'low' | 'moderate' | 'elevated' | 'extreme'
export type PositionDirection = 'long' | 'short'
export type EventStatus = 'upcoming' | 'live' | 'released'
export type UserRole = 'user' | 'admin'
export type UserStatus = 'active' | 'locked' | 'unverified'
export type EntityType = 'pair' | 'currency' | 'event' | 'forecast' | 'simulation' | 'strategy'
export type WatchEntityType = 'pair' | 'currency' | 'event' | 'forecast'
export type EventType =
  | 'CPI'
  | 'GDP'
  | 'employment'
  | 'rate decision'
  | 'speech'
  | 'trade balance'
  | 'manufacturing PMI'
  | 'services PMI'
  | 'intervention concern'
  | 'geopolitical incident'
export type AlertConditionType =
  | 'price_cross'
  | 'event_approaching'
  | 'volatility_threshold'
  | 'uncertainty_widening'
  | 'macro_risk_change'

export interface MacroStats {
  policyRate: number
  inflation: number
  gdpGrowth: number
  unemployment: number
  tradeBalance: number
  debtToGdp: number
  manufacturingTrend: number
  consumerStrength: number
  reserveRole: number
  externalSensitivity: number
}

export interface CentralBankTonePoint {
  label: string
  tone: 'tightening' | 'pausing' | 'easing' | 'uncertain'
  note: string
}

export interface CurrencyDriver {
  label: string
  weight: number
  description: string
}

export interface HistoricalNarrativePoint {
  title: string
  summary: string
  dateLabel: string
}

export interface CurrencyProfile {
  code: string
  name: string
  regionName: string
  countryGroup: string
  centralBank: string
  classificationTags: string[]
  macro: MacroStats
  centralBankState: {
    currentTone: 'tightening' | 'pausing' | 'easing' | 'uncertain'
    expectation: string
    summary: string
    toneHistory: CentralBankTonePoint[]
  }
  strengthScore: number
  riskScore: number
  eventSensitivity: number
  drivers: CurrencyDriver[]
  historicalNarrative: HistoricalNarrativePoint[]
  currentSummary: string
  relatedPairIds: string[]
  relatedEventIds: string[]
  relatedNewsIds: string[]
}

export interface SimulationPreset {
  name: string
  direction: PositionDirection
  entryOffset: number
  stopOffset: number
  targetOffset: number
  leverage: number
}

export interface Pair {
  id: string
  symbol: string
  baseCode: string
  quoteCode: string
  classification: PairClassification
  pipPrecision: number
  displayPrecision: number
  spreadEstimate: number
  carryScore: number
  sentimentScore: number
  eventRiskBase: number
  narrative: string
  simulationPresets: SimulationPreset[]
  technicalSummaryRef: string
  forecastRef: string
}

export interface PricePoint {
  label: string
  timestamp: string
  value: number
}

export interface OhlcPoint extends PricePoint {
  open: number
  high: number
  low: number
  close: number
}

export interface DerivedIndicators {
  ma20: number[]
  ma50: number[]
  rsi: number
  macd: number
  signal: number
  histogram: number
  upperBand: number[]
  lowerBand: number[]
  atr: number
}

export interface PriceSeries {
  pairId: string
  timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y'
  points: PricePoint[]
  ohlcPoints: OhlcPoint[]
  derivedIndicators: DerivedIndicators
}

export interface TechnicalSnapshot {
  id: string
  pairId: string
  trend: TrendLabel
  maSet: { short: number; long: number }
  rsi: number
  macd: number
  bollinger: { upper: number; middle: number; lower: number }
  atr: number
  supportZones: number[]
  resistanceZones: number[]
  channel: { low: number; high: number }
  volatilityScore: number
  signalSummary: string
  driverWeights: {
    technical: number
    macro: number
    event: number
    sentiment: number
  }
}

export interface MacroEvent {
  id: string
  title: string
  type: EventType
  currencyCodes: string[]
  pairIds: string[]
  region: string
  impact: ImpactLevel
  status: EventStatus
  scheduledAt: string
  prior: string
  forecast: string
  actual?: string
  surpriseDirection?: 'positive' | 'negative' | 'inline'
  urgency: number
  scenarioNarrative?: string
  summary?: string
  source?: string
  sourceUrl?: string
}

export interface NewsItem {
  id: string
  headline: string
  source: string
  timestamp: string
  currencyCodes: string[]
  pairIds: string[]
  eventIds: string[]
  sentiment: SentimentTone
  impact: ImpactLevel
  explanation?: string
  whyItMatters?: string
  reactionBias?: string
  summary?: string
  url?: string
  evaluated?: boolean
}

export interface ForecastPathPoint {
  horizon: string
  value: number
}

export interface ForecastDailyPoint {
  day: number
  date: string
  label: string
  value: number
  uncertainty: number
}

export interface ForecastEvaluationMetrics {
  rmseBps: number
  maeBps: number
  mape: number
  directionalAccuracy: number
}

export interface ForecastModelHorizon {
  horizon: string
  horizonDays: number
  family: string
  lambda: number
  features: string[]
  validation: ForecastEvaluationMetrics
  test: ForecastEvaluationMetrics
}

export interface ForecastModelMeta {
  trainedAt: string
  methodology: string
  observations: number
  lastObservation: string
  horizons: ForecastModelHorizon[]
}

export interface Forecast {
  id: string
  pairId: string
  spotPrice?: number
  horizons: string[]
  basePath: ForecastPathPoint[]
  optimisticPath: ForecastPathPoint[]
  pessimisticPath: ForecastPathPoint[]
  dailyPath?: ForecastDailyPoint[]
  uncertaintyCurve: number[]
  confidence: number
  driverImportance: Record<string, number>
  disclaimer: string
  model?: ForecastModelMeta
}

export interface StrategyTemplate {
  id: string
  name: string
  style: string
  suitedPairs: string[]
  suitedRegimes: string[]
  entryLogic: string
  exitLogic: string
  riskProfile: string
  illustrationModel: string
}

export interface MacroScenarioPreset {
  id: string
  name: string
  description: string
  currencyEffects: Record<string, number>
  pairEffects: Record<string, number>
  forecastBiasShifts: Record<string, number>
  eventIntensityShifts: Record<string, number>
  newsToneShifts: Record<string, number>
}

export interface Settings {
  theme: ThemeMode
  density: DensityMode
  chartDefaults: {
    chartMode: ChartMode
    timeframe: PriceSeries['timeframe']
    overlays: string[]
  }
  dashboardMode: DashboardMode
  notificationPrefs: {
    alerts: boolean
    news: boolean
    events: boolean
  }
  favoriteCurrencies: string[]
  favoritePairs: string[]
  defaultAccountCurrency: string
  mock2FAEnabled: boolean
  widgetOrder?: string[]
}

export interface User {
  id: string
  role: UserRole
  status: UserStatus
  email: string
  password: string
  displayName: string
  avatarSeed: string
  experienceLevel: ExperienceLevel
  riskProfile: RiskProfile
  analysisFocus: AnalysisFocus
  defaultAccountCurrency: string
  favoriteCurrencies: string[]
  favoritePairs: string[]
  dashboardPreset: DashboardMode
  settings: Settings
  watchlistIds: string[]
  alertIds: string[]
  noteIds: string[]
  portfolioId: string
  savedSimulationIds: string[]
  onboardingCompleted: boolean
  verified: boolean
  locked: boolean
}

export interface Session {
  userId: string
  expiresAt: string
  intendedPath?: string
  mock2FARequired: boolean
}

export interface SimulationOutputs {
  priceMove: number
  pipMove: number
  pipValue: number
  grossPnL: number
  netPnL: number
  riskAmount: number
  rewardAmount: number
  rrRatio: number
  rMultiple: number
  marginUsed: number
  freeMargin: number
  balanceAfterTrade: number
  drawdownAtStop: number
}

export interface Simulation {
  id: string
  userId: string
  pairId: string
  sourceContext: 'blank' | 'pair' | 'event' | 'saved' | 'portfolio'
  accountCurrency: string
  capital: number
  direction: PositionDirection
  entry: number
  exit: number
  stopLoss: number
  takeProfit: number
  leverage: number
  positionSize: number
  lotSize: number
  spread: number
  fees: number
  holdingDuration: string
  conviction: number
  scenarioType: string
  outputs: SimulationOutputs
  linkedNoteIds: string[]
  createdAt: string
  updatedAt: string
}

export interface PortfolioPosition {
  id: string
  pairId: string
  direction: PositionDirection
  size: number
  entry: number
  currentPrice: number
  stopLoss: number
  takeProfit: number
  openedAt: string
  closedAt?: string
  status: 'open' | 'closed'
  originSimulationId?: string
  unrealizedPnL: number
  realizedPnL?: number
  leverage: number
}

export interface PortfolioOrder {
  id: string
  pairId: string
  action: 'open' | 'close' | 'modify'
  timestamp: string
  detail: string
}

export interface PortfolioJournal {
  id: string
  title: string
  body: string
  pairId?: string
  createdAt: string
}

export interface PortfolioAccount {
  id: string
  userId: string
  baseCurrency: string
  startingBalance?: number
  balance: number
  equity: number
  marginUsed: number
  freeMargin: number
  openPositionIds: string[]
  closedPositionIds: string[]
  orderIds: string[]
  journalIds: string[]
}

export interface WatchlistItem {
  id: string
  userId: string
  entityType: WatchEntityType
  entityId: string
  createdAt: string
  priority: 'low' | 'medium' | 'high'
}

export interface AlertRule {
  id: string
  userId: string
  entityType: EntityType
  entityId: string
  conditionType: AlertConditionType
  threshold: string
  status: 'active' | 'paused' | 'triggered'
  createdAt: string
  lastTriggeredAt?: string
  lastEvaluation: string
}

export interface LinkedEntity {
  entityType: EntityType
  entityId: string
}

export interface Note {
  id: string
  userId: string
  title: string
  body: string
  tags: string[]
  template: string
  pinned: boolean
  linkedEntities: LinkedEntity[]
  createdAt: string
  updatedAt: string
}

export interface AdminMarketMutation {
  currencyShifts: Record<string, number>
  pairVolatilityShifts: Record<string, number>
  newsToneShifts: Record<string, number>
  triggeredEventIds: string[]
}

export interface NotificationItem {
  id: string
  title: string
  body: string
  level: 'info' | 'warning' | 'critical'
  href?: string
  createdAt: string
}

export interface VisitRecord {
  pairs: string[]
  currencies: string[]
  events: string[]
}

export interface OnboardingRecord {
  completed: boolean
  updates?: Partial<User>
}

export interface SeedData {
  users: User[]
  currencies: CurrencyProfile[]
  pairs: Pair[]
  priceSeries: PriceSeries[]
  technicals: TechnicalSnapshot[]
  events: MacroEvent[]
  news: NewsItem[]
  forecasts: Forecast[]
  strategies: StrategyTemplate[]
  scenarios: MacroScenarioPreset[]
  simulations: Simulation[]
  portfolios: PortfolioAccount[]
  positions: PortfolioPosition[]
  orders: PortfolioOrder[]
  journals: PortfolioJournal[]
  watchlist: WatchlistItem[]
  alerts: AlertRule[]
  notes: Note[]
}

export interface MLSimulateRequest {
  account_balance: number;
  lot_size: number;
  leverage: number;
  pair_id: string;
}

export interface MLSimulateResponse {
  pair_id: string;
  predicted_pip_move: number;
  margin_call_probability: number;
  margin_call_threshold_pips: number;
  pip_value_per_pip: number;
  margin_required: number;
  risk_status: 'LOW' | 'MEDIUM' | 'HIGH';
  sampled_paths: number[];
  n_paths_simulated: number;
  sigma_used: number;
  current_close: number;
}

export interface MLHealthResponse {
  status: string;
  model_loaded: boolean;
  pair: string;
}

