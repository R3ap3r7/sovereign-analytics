import { calculateTradeOutputs } from '../calculators'
import type {
  AlertRule,
  CurrencyProfile,
  Forecast,
  MacroEvent,
  MacroScenarioPreset,
  NewsItem,
  Note,
  Pair,
  PortfolioAccount,
  PortfolioJournal,
  PortfolioOrder,
  PortfolioPosition,
  PriceSeries,
  SeedData,
  Settings,
  Simulation,
  StrategyTemplate,
  TechnicalSnapshot,
  User,
  WatchlistItem,
} from '../types'

const now = new Date('2026-04-01T12:00:00+05:30')

const addHours = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString()
const addDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()

const defaultSettings = (overrides?: Partial<Settings>): Settings => ({
  theme: 'terminal',
  density: 'research',
  chartDefaults: {
    chartMode: 'candlestick',
    timeframe: '3M',
    overlays: ['ma', 'rsi', 'macd', 'forecast'],
  },
  dashboardMode: 'research-heavy',
  notificationPrefs: {
    alerts: true,
    news: true,
    events: true,
  },
  favoriteCurrencies: ['USD', 'JPY'],
  favoritePairs: ['eur-usd', 'usd-jpy'],
  defaultAccountCurrency: 'USD',
  mock2FAEnabled: false,
  ...overrides,
})

export const currencyProfiles: CurrencyProfile[] = [
  {
    code: 'USD',
    name: 'US Dollar',
    regionName: 'United States',
    countryGroup: 'North America',
    centralBank: 'Federal Reserve',
    classificationTags: ['reserve currency', 'safe haven', 'policy-sensitive'],
    macro: {
      policyRate: 5.25,
      inflation: 2.9,
      gdpGrowth: 2.1,
      unemployment: 4.1,
      tradeBalance: -72,
      debtToGdp: 119,
      manufacturingTrend: 51.2,
      consumerStrength: 69,
      reserveRole: 98,
      externalSensitivity: 38,
    },
    centralBankState: {
      currentTone: 'pausing',
      expectation: 'One cut priced later in the year, but inflation resilience keeps yields supportive.',
      summary: 'USD remains backed by high real-rate carry and defensive demand when global narrative softens.',
      toneHistory: [
        { label: 'Q3', tone: 'tightening', note: 'Inflation persistence kept policy restrictive.' },
        { label: 'Q4', tone: 'pausing', note: 'Growth cooled, but labour data stayed firm.' },
        { label: 'Now', tone: 'pausing', note: 'Higher-for-longer rhetoric still underpins the dollar.' },
      ],
    },
    strengthScore: 78,
    riskScore: 62,
    eventSensitivity: 86,
    drivers: [
      { label: 'Rate differentials', weight: 0.31, description: 'US yields still sit above most developed peers.' },
      { label: 'Inflation surprise risk', weight: 0.24, description: 'CPI and wages can quickly reprice cuts.' },
      { label: 'Risk-off demand', weight: 0.21, description: 'Dollar demand rises when cross-asset stress appears.' },
      { label: 'Growth resilience', weight: 0.24, description: 'Consumer and labor data keep soft-landing hopes alive.' },
    ],
    historicalNarrative: [
      { title: 'Inflation shock repricing', summary: 'Sticky services inflation revived higher-for-longer pricing.', dateLabel: 'Late 2025' },
      { title: 'Yield support returns', summary: 'Treasury yields widened against Europe and Japan again.', dateLabel: 'Jan 2026' },
      { title: 'Event-loaded quarter', summary: 'CPI, payrolls, and Fed communication created tactical volatility.', dateLabel: 'Mar 2026' },
    ],
    currentSummary: 'USD is firm on rate support, but event density keeps near-term risk elevated.',
    relatedPairIds: ['eur-usd', 'gbp-usd', 'usd-jpy', 'usd-inr', 'aud-usd', 'usd-cad', 'usd-chf', 'nzd-usd'],
    relatedEventIds: ['evt-us-cpi', 'evt-us-payrolls', 'evt-fed-minutes'],
    relatedNewsIds: ['news-usd-yields', 'news-us-cpi-preview', 'news-global-risk-off'],
  },
  {
    code: 'EUR',
    name: 'Euro',
    regionName: 'Euro Area',
    countryGroup: 'Europe',
    centralBank: 'European Central Bank',
    classificationTags: ['reserve currency', 'cyclical', 'policy-sensitive'],
    macro: {
      policyRate: 3,
      inflation: 2.4,
      gdpGrowth: 0.9,
      unemployment: 6.2,
      tradeBalance: 19,
      debtToGdp: 88,
      manufacturingTrend: 48.7,
      consumerStrength: 54,
      reserveRole: 72,
      externalSensitivity: 58,
    },
    centralBankState: {
      currentTone: 'easing',
      expectation: 'Growth fragility keeps easing bias alive, though services inflation tempers pace.',
      summary: 'EUR trades with soft growth baggage and sensitivity to data that could validate or challenge ECB easing.',
      toneHistory: [
        { label: 'Q3', tone: 'pausing', note: 'Disinflation improved but growth stayed weak.' },
        { label: 'Q4', tone: 'easing', note: 'Demand softness shifted focus to support.' },
        { label: 'Now', tone: 'easing', note: 'Markets still lean toward further policy relief.' },
      ],
    },
    strengthScore: 58,
    riskScore: 55,
    eventSensitivity: 74,
    drivers: [
      { label: 'Growth momentum', weight: 0.27, description: 'Surveys and credit demand shape the policy path.' },
      { label: 'ECB communication', weight: 0.25, description: 'Any pushback against easing can stabilize EUR.' },
      { label: 'External demand', weight: 0.24, description: 'Manufacturing-sensitive euro reacts to trade cycle expectations.' },
      { label: 'US spread differential', weight: 0.24, description: 'EUR/USD remains dominated by rate spread gap.' },
    ],
    historicalNarrative: [
      { title: 'Manufacturing drag', summary: 'Industrial softness capped euro upside.', dateLabel: 'Late 2025' },
      { title: 'Disinflation improves', summary: 'Lower energy pressure created easing room.', dateLabel: 'Jan 2026' },
      { title: 'Speaker-heavy calendar', summary: 'ECB communication left direction mixed.', dateLabel: 'Mar 2026' },
    ],
    currentSummary: 'EUR remains soft versus higher-yield peers, but positioning is less one-sided than late 2025.',
    relatedPairIds: ['eur-usd', 'eur-jpy', 'eur-gbp', 'eur-chf'],
    relatedEventIds: ['evt-ez-cpi', 'evt-ecb-speaker'],
    relatedNewsIds: ['news-eur-growth', 'news-ecb-tone'],
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    regionName: 'Japan',
    countryGroup: 'Asia',
    centralBank: 'Bank of Japan',
    classificationTags: ['safe haven', 'policy-sensitive', 'intervention-risk'],
    macro: {
      policyRate: 0.35,
      inflation: 2.1,
      gdpGrowth: 1.1,
      unemployment: 2.6,
      tradeBalance: 4,
      debtToGdp: 252,
      manufacturingTrend: 49.6,
      consumerStrength: 48,
      reserveRole: 61,
      externalSensitivity: 63,
    },
    centralBankState: {
      currentTone: 'uncertain',
      expectation: 'Normalization remains gradual, but market sensitivity to any hawkish tilt is high.',
      summary: 'JPY is still driven by yield spreads, BoJ headlines, and intervention risk when depreciation accelerates.',
      toneHistory: [
        { label: 'Q3', tone: 'pausing', note: 'Policy remained ultra-accommodative.' },
        { label: 'Q4', tone: 'uncertain', note: 'Speculation on normalization increased.' },
        { label: 'Now', tone: 'uncertain', note: 'Markets are alert to policy or intervention surprises.' },
      ],
    },
    strengthScore: 49,
    riskScore: 79,
    eventSensitivity: 84,
    drivers: [
      { label: 'Yield spread pressure', weight: 0.3, description: 'Wide USD-JPY spread still burdens the yen.' },
      { label: 'BoJ normalization', weight: 0.25, description: 'Any credible tightening signal can squeeze shorts.' },
      { label: 'Intervention risk', weight: 0.2, description: 'Authorities become more vocal near disorderly moves.' },
      { label: 'Risk aversion', weight: 0.25, description: 'JPY regains support when global stress rises.' },
    ],
    historicalNarrative: [
      { title: 'Policy normalization speculation', summary: 'BoJ communication became less one-directional.', dateLabel: 'Late 2025' },
      { title: 'Intervention concern rebuilds', summary: 'Authorities flagged FX moves as disorderly.', dateLabel: 'Feb 2026' },
      { title: 'Volatility spike risk', summary: 'Short yen positioning made the market more jumpy.', dateLabel: 'Mar 2026' },
    ],
    currentSummary: 'JPY remains structurally soft, but policy and intervention risk make downside crowded.',
    relatedPairIds: ['usd-jpy', 'eur-jpy', 'gbp-jpy', 'aud-jpy'],
    relatedEventIds: ['evt-boj-speech', 'evt-jp-cpi'],
    relatedNewsIds: ['news-jpy-intervention', 'news-boj-normalization'],
  },
  {
    code: 'GBP',
    name: 'Pound Sterling',
    regionName: 'United Kingdom',
    countryGroup: 'Europe',
    centralBank: 'Bank of England',
    classificationTags: ['reserve currency', 'cyclical', 'policy-sensitive'],
    macro: { policyRate: 4.5, inflation: 3.1, gdpGrowth: 1.2, unemployment: 4.4, tradeBalance: -12, debtToGdp: 97, manufacturingTrend: 50.1, consumerStrength: 58, reserveRole: 54, externalSensitivity: 60 },
    centralBankState: {
      currentTone: 'pausing',
      expectation: 'Sticky wage pressure delays rapid easing.',
      summary: 'GBP trades as a higher-beta developed-market currency with both rate support and growth risk.',
      toneHistory: [
        { label: 'Q3', tone: 'tightening', note: 'Inflation persistence sustained hawkish talk.' },
        { label: 'Q4', tone: 'pausing', note: 'Growth softness moderated policy urgency.' },
        { label: 'Now', tone: 'pausing', note: 'Sterling stays supported when labor data holds up.' },
      ],
    },
    strengthScore: 64,
    riskScore: 58,
    eventSensitivity: 70,
    drivers: [
      { label: 'Wage stickiness', weight: 0.28, description: 'Labor data drives BoE repricing.' },
      { label: 'Risk appetite', weight: 0.22, description: 'Sterling tends to outperform in firmer global sentiment.' },
      { label: 'Growth resilience', weight: 0.24, description: 'Domestic demand matters more than headline GDP alone.' },
      { label: 'Relative carry', weight: 0.26, description: 'Still decent yield support versus Europe and Switzerland.' },
    ],
    historicalNarrative: [
      { title: 'Wage-led inflation persistence', summary: 'Services and wages kept easing expectations delayed.', dateLabel: 'Late 2025' },
      { title: 'Growth stabilization', summary: 'Activity data stopped worsening.', dateLabel: 'Feb 2026' },
      { title: 'Risk-sensitive rally phases', summary: 'GBP outperformed in pro-cyclical sessions.', dateLabel: 'Mar 2026' },
    ],
    currentSummary: 'GBP is relatively firm, but still vulnerable to abrupt growth disappointments.',
    relatedPairIds: ['gbp-usd', 'gbp-jpy', 'eur-gbp', 'gbp-chf'],
    relatedEventIds: ['evt-uk-jobs'],
    relatedNewsIds: ['news-gbp-wages'],
  },
  {
    code: 'INR',
    name: 'Indian Rupee',
    regionName: 'India',
    countryGroup: 'Asia',
    centralBank: 'Reserve Bank of India',
    classificationTags: ['high beta', 'growth-linked', 'policy-sensitive'],
    macro: { policyRate: 6.5, inflation: 4.8, gdpGrowth: 6.4, unemployment: 6.9, tradeBalance: -21, debtToGdp: 82, manufacturingTrend: 56.4, consumerStrength: 67, reserveRole: 26, externalSensitivity: 73 },
    centralBankState: {
      currentTone: 'pausing',
      expectation: 'Growth strength offsets imported inflation concern.',
      summary: 'INR remains supported by growth optics but vulnerable to oil and external dollar strength.',
      toneHistory: [
        { label: 'Q3', tone: 'pausing', note: 'Policy held steady with inflation still watched closely.' },
        { label: 'Q4', tone: 'pausing', note: 'Growth resilience allowed patience.' },
        { label: 'Now', tone: 'uncertain', note: 'Oil and global dollar pressure remain swing drivers.' },
      ],
    },
    strengthScore: 57,
    riskScore: 66,
    eventSensitivity: 60,
    drivers: [
      { label: 'Growth premium', weight: 0.28, description: 'Domestic growth is strong versus peers.' },
      { label: 'Oil import sensitivity', weight: 0.27, description: 'Energy prices matter directly for INR pressure.' },
      { label: 'Dollar conditions', weight: 0.23, description: 'Broad USD strength can dominate domestic positives.' },
      { label: 'RBI policy smoothness', weight: 0.22, description: 'Managed FX volatility tempers extremes.' },
    ],
    historicalNarrative: [
      { title: 'Growth outperformance', summary: 'Domestic demand remained strong.', dateLabel: 'Late 2025' },
      { title: 'Oil sensitivity returns', summary: 'Energy rebound pressured import expectations.', dateLabel: 'Jan 2026' },
      { title: 'Range management', summary: 'RBI signaling kept USD/INR orderly.', dateLabel: 'Mar 2026' },
    ],
    currentSummary: 'INR is resilient on growth but not immune to oil and global dollar cycles.',
    relatedPairIds: ['usd-inr'],
    relatedEventIds: ['evt-in-gdp'],
    relatedNewsIds: ['news-inr-oil'],
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    regionName: 'Australia',
    countryGroup: 'Oceania',
    centralBank: 'Reserve Bank of Australia',
    classificationTags: ['commodity-linked', 'cyclical', 'china-sensitive'],
    macro: { policyRate: 4.1, inflation: 3.3, gdpGrowth: 1.5, unemployment: 4.2, tradeBalance: 11, debtToGdp: 51, manufacturingTrend: 50.4, consumerStrength: 53, reserveRole: 34, externalSensitivity: 68 },
    centralBankState: {
      currentTone: 'pausing',
      expectation: 'Inflation still matters, but external demand narrative is the bigger swing factor.',
      summary: 'AUD tracks risk appetite, commodity demand, and China-linked growth expectations.',
      toneHistory: [
        { label: 'Q3', tone: 'tightening', note: 'Inflation persistence delayed easing hopes.' },
        { label: 'Q4', tone: 'pausing', note: 'Domestic demand softened.' },
        { label: 'Now', tone: 'pausing', note: 'China sentiment remains decisive for directional follow-through.' },
      ],
    },
    strengthScore: 61,
    riskScore: 63,
    eventSensitivity: 68,
    drivers: [
      { label: 'Commodity demand', weight: 0.29, description: 'Global demand optimism supports AUD.' },
      { label: 'China spillover', weight: 0.27, description: 'Growth headlines out of China move AUD quickly.' },
      { label: 'Risk appetite', weight: 0.24, description: 'AUD tends to strengthen when markets want cyclicals.' },
      { label: 'RBA inflation posture', weight: 0.2, description: 'Policy tone still affects near-term rate spread support.' },
    ],
    historicalNarrative: [
      { title: 'Commodity rebound hope', summary: 'Base metals recovery improved sentiment.', dateLabel: 'Late 2025' },
      { title: 'China soft patch', summary: 'Demand concerns capped rallies.', dateLabel: 'Feb 2026' },
      { title: 'Risk-on rebound', summary: 'AUD recovered when global growth story steadied.', dateLabel: 'Mar 2026' },
    ],
    currentSummary: 'AUD trades as a cyclical expression of demand and sentiment, with event risk still manageable.',
    relatedPairIds: ['aud-usd', 'aud-jpy'],
    relatedEventIds: ['evt-au-trade'],
    relatedNewsIds: ['news-aud-commodities'],
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    regionName: 'Canada',
    countryGroup: 'North America',
    centralBank: 'Bank of Canada',
    classificationTags: ['commodity-linked', 'cyclical', 'north-america-linked'],
    macro: { policyRate: 4, inflation: 2.6, gdpGrowth: 1.1, unemployment: 6.1, tradeBalance: 5, debtToGdp: 72, manufacturingTrend: 49.5, consumerStrength: 50, reserveRole: 36, externalSensitivity: 52 },
    centralBankState: {
      currentTone: 'easing',
      expectation: 'BoC is more comfortable easing than the Fed, leaving CAD dependent on oil and broad USD tone.',
      summary: 'CAD is caught between energy support and a softer domestic growth mix.',
      toneHistory: [
        { label: 'Q3', tone: 'pausing', note: 'Disinflation improved.' },
        { label: 'Q4', tone: 'easing', note: 'Growth softness pulled the bank toward cuts.' },
        { label: 'Now', tone: 'easing', note: 'CAD relies more on oil and relative dollar tone.' },
      ],
    },
    strengthScore: 55,
    riskScore: 59,
    eventSensitivity: 61,
    drivers: [
      { label: 'Crude linkage', weight: 0.31, description: 'Energy direction still matters for CAD demand.' },
      { label: 'Fed-BoC spread', weight: 0.27, description: 'Relative policy path keeps USD/CAD sensitive.' },
      { label: 'North American growth', weight: 0.22, description: 'US demand spillover matters for trade.' },
      { label: 'Domestic housing sensitivity', weight: 0.2, description: 'Soft domestic momentum limits policy confidence.' },
    ],
    historicalNarrative: [
      { title: 'Oil cushion', summary: 'Energy helped offset policy easing pressure.', dateLabel: 'Late 2025' },
      { title: 'Domestic slowdown concern', summary: 'Housing and demand data softened.', dateLabel: 'Jan 2026' },
      { title: 'Range-bound USD/CAD', summary: 'Crosscurrents kept the pair tactical.', dateLabel: 'Mar 2026' },
    ],
    currentSummary: 'CAD is balanced between oil support and softer domestic policy momentum.',
    relatedPairIds: ['usd-cad'],
    relatedEventIds: ['evt-ca-gdp'],
    relatedNewsIds: ['news-cad-oil'],
  },
  {
    code: 'CHF',
    name: 'Swiss Franc',
    regionName: 'Switzerland',
    countryGroup: 'Europe',
    centralBank: 'Swiss National Bank',
    classificationTags: ['safe haven', 'low yield', 'defensive'],
    macro: { policyRate: 1.25, inflation: 1.4, gdpGrowth: 1, unemployment: 2.3, tradeBalance: 8, debtToGdp: 39, manufacturingTrend: 48.9, consumerStrength: 57, reserveRole: 43, externalSensitivity: 49 },
    centralBankState: {
      currentTone: 'easing',
      expectation: 'Low inflation allows policy support, but safe-haven flows still dominate tactical swings.',
      summary: 'CHF stays resilient when geopolitical or market stress rises, despite modest yield support.',
      toneHistory: [
        { label: 'Q3', tone: 'pausing', note: 'Inflation fell back comfortably.' },
        { label: 'Q4', tone: 'easing', note: 'Policy moved to prevent excessive tightness.' },
        { label: 'Now', tone: 'easing', note: 'Safe-haven demand matters more than domestic data.' },
      ],
    },
    strengthScore: 66,
    riskScore: 49,
    eventSensitivity: 44,
    drivers: [
      { label: 'Risk aversion', weight: 0.35, description: 'CHF strengthens during market stress.' },
      { label: 'SNB policy', weight: 0.2, description: 'Low inflation gives flexibility on rates.' },
      { label: 'European spillover', weight: 0.21, description: 'Regional growth and EUR tone affect CHF crosses.' },
      { label: 'Flow sensitivity', weight: 0.24, description: 'Defensive positioning keeps franc bid in shocks.' },
    ],
    historicalNarrative: [
      { title: 'Safe-haven demand rebuild', summary: 'Macro uncertainty supported CHF.', dateLabel: 'Late 2025' },
      { title: 'Low inflation regime', summary: 'Policy became less restrictive.', dateLabel: 'Jan 2026' },
      { title: 'Defensive carry trade unwind', summary: 'Stress episodes brought CHF demand back.', dateLabel: 'Mar 2026' },
    ],
    currentSummary: 'CHF remains a defensive anchor with lower event sensitivity than higher-beta peers.',
    relatedPairIds: ['usd-chf', 'eur-chf', 'gbp-chf'],
    relatedEventIds: ['evt-swiss-cpi'],
    relatedNewsIds: ['news-chf-defensive'],
  },
  {
    code: 'NZD',
    name: 'New Zealand Dollar',
    regionName: 'New Zealand',
    countryGroup: 'Oceania',
    centralBank: 'Reserve Bank of New Zealand',
    classificationTags: ['commodity-linked', 'high beta', 'cyclical'],
    macro: { policyRate: 5, inflation: 3.4, gdpGrowth: 1, unemployment: 4.8, tradeBalance: -2, debtToGdp: 46, manufacturingTrend: 48.4, consumerStrength: 46, reserveRole: 22, externalSensitivity: 71 },
    centralBankState: {
      currentTone: 'pausing',
      expectation: 'Yield support exists, but domestic growth softness limits clean bullish follow-through.',
      summary: 'NZD behaves like a smaller-cap cyclical FX expression with high sensitivity to global sentiment.',
      toneHistory: [
        { label: 'Q3', tone: 'tightening', note: 'Inflation pressures remained uncomfortable.' },
        { label: 'Q4', tone: 'pausing', note: 'Demand cooled noticeably.' },
        { label: 'Now', tone: 'pausing', note: 'Yield support remains, but liquidity is thinner.' },
      ],
    },
    strengthScore: 53,
    riskScore: 67,
    eventSensitivity: 57,
    drivers: [
      { label: 'Risk appetite', weight: 0.31, description: 'NZD is vulnerable when cyclicals unwind.' },
      { label: 'Yield carry', weight: 0.25, description: 'Still supportive when volatility is calm.' },
      { label: 'Agricultural export tone', weight: 0.2, description: 'Trade and commodity context matters.' },
      { label: 'Domestic slowdown', weight: 0.24, description: 'Growth softness caps upside conviction.' },
    ],
    historicalNarrative: [
      { title: 'Carry demand', summary: 'Higher rates initially supported NZD.', dateLabel: 'Late 2025' },
      { title: 'Growth softness emerges', summary: 'Domestic indicators deteriorated.', dateLabel: 'Jan 2026' },
      { title: 'High-beta chop', summary: 'Global sentiment drove large tactical swings.', dateLabel: 'Mar 2026' },
    ],
    currentSummary: 'NZD keeps yield appeal but remains exposed to any deterioration in the global growth story.',
    relatedPairIds: ['nzd-usd'],
    relatedEventIds: ['evt-nz-rbnz'],
    relatedNewsIds: ['news-nzd-carry'],
  },
  {
    code: 'CNY',
    name: 'Chinese Yuan',
    regionName: 'China',
    countryGroup: 'Asia',
    centralBank: 'People’s Bank of China',
    classificationTags: ['managed currency', 'growth-sensitive', 'trade-linked'],
    macro: { policyRate: 2.5, inflation: 1.2, gdpGrowth: 4.6, unemployment: 5.2, tradeBalance: 63, debtToGdp: 93, manufacturingTrend: 50.7, consumerStrength: 47, reserveRole: 44, externalSensitivity: 77 },
    centralBankState: {
      currentTone: 'easing',
      expectation: 'Authorities continue to prioritize growth stability and controlled FX moves.',
      summary: 'CNY matters more as a macro influence on regional and commodity FX than as a direct trading focus here.',
      toneHistory: [
        { label: 'Q3', tone: 'easing', note: 'Growth stabilization remained the priority.' },
        { label: 'Q4', tone: 'easing', note: 'Targeted support continued.' },
        { label: 'Now', tone: 'easing', note: 'Demand recovery remains uneven.' },
      ],
    },
    strengthScore: 52,
    riskScore: 64,
    eventSensitivity: 52,
    drivers: [
      { label: 'Growth policy support', weight: 0.28, description: 'Authorities manage growth expectations directly.' },
      { label: 'Property stabilization', weight: 0.24, description: 'Domestic demand confidence remains fragile.' },
      { label: 'External trade cycle', weight: 0.24, description: 'Regional demand and exports remain influential.' },
      { label: 'Commodity demand spillover', weight: 0.24, description: 'AUD and NZD often react through China channel.' },
    ],
    historicalNarrative: [
      { title: 'Targeted easing phase', summary: 'Policy support focused on stabilization.', dateLabel: 'Late 2025' },
      { title: 'Demand uncertainty persists', summary: 'Recovery remained uneven.', dateLabel: 'Feb 2026' },
      { title: 'Regional spillover theme', summary: 'China headlines drove broader FX cyclicals.', dateLabel: 'Mar 2026' },
    ],
    currentSummary: 'CNY is a contextual macro driver across the platform, especially for AUD and NZD narratives.',
    relatedPairIds: [],
    relatedEventIds: ['evt-cn-pmi'],
    relatedNewsIds: ['news-china-demand'],
  },
]

const pairSeed = [
  ['eur-usd', 'EUR/USD', 'EUR', 'USD', 'major', 0.0001, 4, 1.4, 46, 52, 61, 'Macro mixed; USD carry edges EUR softness.'],
  ['gbp-usd', 'GBP/USD', 'GBP', 'USD', 'major', 0.0001, 4, 1.6, 51, 55, 58, 'Sterling supported by wages, but USD yield pressure caps rallies.'],
  ['usd-jpy', 'USD/JPY', 'USD', 'JPY', 'major', 0.01, 2, 1.2, 73, 64, 82, 'Yield spread still bullish, but intervention risk elevated.'],
  ['usd-inr', 'USD/INR', 'USD', 'INR', 'minor', 0.01, 2, 2.1, 49, 48, 54, 'USD strength leans upward, but RBI smoothing limits volatility.'],
  ['aud-usd', 'AUD/USD', 'AUD', 'USD', 'major', 0.0001, 4, 1.7, 57, 59, 57, 'Cyclical bounce competes with firm dollar carry.'],
  ['usd-cad', 'USD/CAD', 'USD', 'CAD', 'major', 0.0001, 4, 1.5, 50, 51, 55, 'Oil support offsets a softer Canadian rate path.'],
  ['usd-chf', 'USD/CHF', 'USD', 'CHF', 'major', 0.0001, 4, 1.3, 44, 50, 47, 'Dollar carry versus defensive franc creates mixed risk tone.'],
  ['nzd-usd', 'NZD/USD', 'NZD', 'USD', 'major', 0.0001, 4, 1.8, 54, 56, 59, 'Carry helps NZD, but global sentiment still dominates.'],
  ['eur-jpy', 'EUR/JPY', 'EUR', 'JPY', 'cross', 0.01, 2, 1.9, 62, 58, 76, 'EUR softness is outweighed by even weaker JPY carry backdrop.'],
  ['gbp-jpy', 'GBP/JPY', 'GBP', 'JPY', 'cross', 0.01, 2, 2.4, 69, 61, 84, 'High-beta carry cross with acute policy headline risk.'],
  ['eur-gbp', 'EUR/GBP', 'EUR', 'GBP', 'cross', 0.0001, 4, 1.1, 33, 46, 41, 'Growth softness in Europe offsets sterling wage support.'],
  ['aud-jpy', 'AUD/JPY', 'AUD', 'JPY', 'cross', 0.01, 2, 2.2, 71, 63, 80, 'Risk-on carry remains favored until volatility spikes.'],
  ['eur-chf', 'EUR/CHF', 'EUR', 'CHF', 'cross', 0.0001, 4, 1.2, 28, 43, 45, 'Low-vol defensive cross with mild euro downside pressure.'],
  ['gbp-chf', 'GBP/CHF', 'GBP', 'CHF', 'cross', 0.0001, 4, 1.4, 39, 52, 49, 'Sterling yield support meets defensive franc demand.'],
] as const

export const pairs: Pair[] = pairSeed.map(
  ([id, symbol, baseCode, quoteCode, classification, pipPrecision, displayPrecision, spreadEstimate, carryScore, sentimentScore, eventRiskBase, narrative]) => ({
    id,
    symbol,
    baseCode,
    quoteCode,
    classification,
    pipPrecision,
    displayPrecision,
    spreadEstimate,
    carryScore,
    sentimentScore,
    eventRiskBase,
    narrative,
    technicalSummaryRef: `tech-${id}`,
    forecastRef: `fc-${id}`,
    simulationPresets: [
      { name: 'Trend continuation', direction: 'long', entryOffset: 0, stopOffset: 18 * pipPrecision, targetOffset: 42 * pipPrecision, leverage: 5 },
      { name: 'Event fade', direction: 'short', entryOffset: 5 * pipPrecision, stopOffset: 22 * pipPrecision, targetOffset: 35 * pipPrecision, leverage: 7 },
    ],
  }),
)

const latestPriceMap: Record<string, number> = {
  'eur-usd': 1.0874,
  'gbp-usd': 1.2762,
  'usd-jpy': 151.84,
  'usd-inr': 83.14,
  'aud-usd': 0.6632,
  'usd-cad': 1.3478,
  'usd-chf': 0.9036,
  'nzd-usd': 0.6084,
  'eur-jpy': 165.13,
  'gbp-jpy': 193.68,
  'eur-gbp': 0.8521,
  'aud-jpy': 100.72,
  'eur-chf': 0.9824,
  'gbp-chf': 1.1528,
}

const timeframeSteps: Record<PriceSeries['timeframe'], number> = {
  '1D': 24,
  '1W': 28,
  '1M': 30,
  '3M': 36,
  '6M': 40,
  '1Y': 52,
}

const buildSeries = (pair: Pair, index: number, timeframe: PriceSeries['timeframe']): PriceSeries => {
  const steps = timeframeSteps[timeframe]
  const latest = latestPriceMap[pair.id]
  const baseDrift = (pair.sentimentScore - 50) / 1000
  const eventPulse = pair.eventRiskBase / 5000
  const volatility = pair.carryScore / 3000
  const values = Array.from({ length: steps }, (_, stepIndex) => {
    const wave = Math.sin((stepIndex + index) / 2.7) * volatility
    const pathBias = (stepIndex - steps / 2) * baseDrift * 0.08
    const shock = stepIndex % 9 === 0 ? eventPulse * (index % 2 === 0 ? 1 : -1) : 0
    return latest - (steps - stepIndex) * baseDrift * 0.05 + wave + pathBias + shock
  })
  const points = values.map((value, pointIndex) => ({
    label: `${timeframe}-${pointIndex + 1}`,
    timestamp: addHours(-(steps - pointIndex) * (timeframe === '1D' ? 1 : 8)),
    value: Number(value.toFixed(pair.displayPrecision)),
  }))
  const ohlcPoints = points.map((point, pointIndex) => {
    const open = pointIndex === 0 ? point.value : points[pointIndex - 1].value
    const drift = Math.abs(point.value - open) || pair.pipPrecision * 6
    return {
      ...point,
      open,
      high: Number((Math.max(open, point.value) + drift * 0.6).toFixed(pair.displayPrecision)),
      low: Number((Math.min(open, point.value) - drift * 0.55).toFixed(pair.displayPrecision)),
      close: point.value,
    }
  })
  const ma20 = points.map((_, pointIndex) => {
    const slice = points.slice(Math.max(0, pointIndex - 5), pointIndex + 1)
    return Number((slice.reduce((acc, item) => acc + item.value, 0) / slice.length).toFixed(pair.displayPrecision))
  })
  const ma50 = points.map((_, pointIndex) => {
    const slice = points.slice(Math.max(0, pointIndex - 11), pointIndex + 1)
    return Number((slice.reduce((acc, item) => acc + item.value, 0) / slice.length).toFixed(pair.displayPrecision))
  })
  const mean = values.reduce((acc, value) => acc + value, 0) / values.length
  const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length
  const stdev = Math.sqrt(variance)
  const upperBand = ma20.map((value) => Number((value + stdev).toFixed(pair.displayPrecision)))
  const lowerBand = ma20.map((value) => Number((value - stdev).toFixed(pair.displayPrecision)))

  return {
    pairId: pair.id,
    timeframe,
    points,
    ohlcPoints,
    derivedIndicators: {
      ma20,
      ma50,
      rsi: 42 + ((pair.sentimentScore + index) % 24),
      macd: Number(((pair.sentimentScore - 50) / 6).toFixed(2)),
      signal: Number(((pair.sentimentScore - 52) / 7).toFixed(2)),
      histogram: Number(((pair.sentimentScore - 50) / 14).toFixed(2)),
      upperBand,
      lowerBand,
      atr: Number((stdev * 10).toFixed(2)),
    },
  }
}

export const priceSeries: PriceSeries[] = pairs.flatMap((pair, index) =>
  (['1D', '1W', '1M', '3M', '6M', '1Y'] as const).map((timeframe) => buildSeries(pair, index, timeframe)),
)

export const technicals: TechnicalSnapshot[] = pairs.map((pair, index) => {
  const series = priceSeries.find((item) => item.pairId === pair.id && item.timeframe === '3M')!
  const latest = series.points[series.points.length - 1]?.value ?? latestPriceMap[pair.id]
  const rsi = series.derivedIndicators.rsi
  const trend = pair.sentimentScore > 54 ? 'bullish' : pair.sentimentScore < 48 ? 'bearish' : 'neutral'
  return {
    id: `tech-${pair.id}`,
    pairId: pair.id,
    trend,
    maSet: {
      short: series.derivedIndicators.ma20[series.derivedIndicators.ma20.length - 1] ?? latest,
      long: series.derivedIndicators.ma50[series.derivedIndicators.ma50.length - 1] ?? latest,
    },
    rsi,
    macd: series.derivedIndicators.macd,
    bollinger: {
      upper: series.derivedIndicators.upperBand[series.derivedIndicators.upperBand.length - 1] ?? latest,
      middle: latest,
      lower: series.derivedIndicators.lowerBand[series.derivedIndicators.lowerBand.length - 1] ?? latest,
    },
    atr: series.derivedIndicators.atr,
    supportZones: [Number((latest * 0.992).toFixed(pair.displayPrecision)), Number((latest * 0.985).toFixed(pair.displayPrecision))],
    resistanceZones: [Number((latest * 1.008).toFixed(pair.displayPrecision)), Number((latest * 1.015).toFixed(pair.displayPrecision))],
    channel: { low: Number((latest * 0.988).toFixed(pair.displayPrecision)), high: Number((latest * 1.012).toFixed(pair.displayPrecision)) },
    volatilityScore: Math.min(96, Math.round(pair.eventRiskBase * 0.8 + pair.carryScore * 0.35)),
    signalSummary:
      rsi > 63
        ? 'Momentum is extended higher; trend persistence remains intact but overbought risk is rising.'
        : rsi < 40
          ? 'Momentum is soft and rallies are fading into resistance.'
          : 'Momentum is balanced; directional conviction depends on macro and event flow.',
    driverWeights: {
      technical: Number((0.34 + index * 0.01).toFixed(2)),
      macro: Number((0.3 + (pair.eventRiskBase % 6) * 0.01).toFixed(2)),
      event: Number((0.16 + pair.eventRiskBase / 500).toFixed(2)),
      sentiment: Number((0.2 - index * 0.003).toFixed(2)),
    },
  }
})

export const events: MacroEvent[] = [
  { id: 'evt-us-cpi', title: 'US CPI Release', type: 'CPI', currencyCodes: ['USD'], pairIds: ['eur-usd', 'gbp-usd', 'usd-jpy', 'aud-usd'], region: 'United States', impact: 'high', status: 'upcoming', scheduledAt: addHours(9), prior: '2.9%', forecast: '3.0%', urgency: 94, scenarioNarrative: 'Hotter inflation would extend USD yield support; a miss could soften dollar carry.' },
  { id: 'evt-us-payrolls', title: 'US Nonfarm Payrolls', type: 'employment', currencyCodes: ['USD'], pairIds: ['eur-usd', 'gbp-usd', 'usd-jpy'], region: 'United States', impact: 'high', status: 'upcoming', scheduledAt: addDays(2), prior: '188k', forecast: '176k', urgency: 85, scenarioNarrative: 'Strong payrolls would reinforce soft-landing conviction and favor the dollar.' },
  { id: 'evt-fed-minutes', title: 'Fed Minutes', type: 'speech', currencyCodes: ['USD'], pairIds: ['eur-usd', 'usd-jpy', 'usd-cad'], region: 'United States', impact: 'medium', status: 'upcoming', scheduledAt: addHours(20), prior: 'n/a', forecast: 'n/a', urgency: 72, scenarioNarrative: 'Any pushback against market easing expectations would keep USD supported.' },
  { id: 'evt-ez-cpi', title: 'Euro Area Flash CPI', type: 'CPI', currencyCodes: ['EUR'], pairIds: ['eur-usd', 'eur-jpy', 'eur-gbp', 'eur-chf'], region: 'Euro Area', impact: 'high', status: 'upcoming', scheduledAt: addHours(14), prior: '2.4%', forecast: '2.3%', urgency: 88, scenarioNarrative: 'A downside surprise would validate ECB easing and weigh on the euro.' },
  { id: 'evt-ecb-speaker', title: 'ECB Governing Council Speakers', type: 'speech', currencyCodes: ['EUR'], pairIds: ['eur-usd', 'eur-jpy', 'eur-gbp'], region: 'Euro Area', impact: 'medium', status: 'upcoming', scheduledAt: addHours(31), prior: 'n/a', forecast: 'n/a', urgency: 61, scenarioNarrative: 'Hawkish pushback could stabilize EUR after recent softness.' },
  { id: 'evt-boj-speech', title: 'BoJ Deputy Governor Speech', type: 'speech', currencyCodes: ['JPY'], pairIds: ['usd-jpy', 'eur-jpy', 'gbp-jpy', 'aud-jpy'], region: 'Japan', impact: 'high', status: 'upcoming', scheduledAt: addHours(6), prior: 'n/a', forecast: 'n/a', urgency: 97, scenarioNarrative: 'Hints of faster normalization or intervention tolerance could trigger sharp JPY strength.' },
  { id: 'evt-jp-cpi', title: 'Japan National CPI', type: 'CPI', currencyCodes: ['JPY'], pairIds: ['usd-jpy', 'eur-jpy'], region: 'Japan', impact: 'medium', status: 'upcoming', scheduledAt: addDays(3), prior: '2.1%', forecast: '2.2%', urgency: 63, scenarioNarrative: 'Stronger inflation keeps normalization speculation alive.' },
  { id: 'evt-uk-jobs', title: 'UK Labor Market Update', type: 'employment', currencyCodes: ['GBP'], pairIds: ['gbp-usd', 'gbp-jpy', 'eur-gbp', 'gbp-chf'], region: 'United Kingdom', impact: 'high', status: 'upcoming', scheduledAt: addHours(26), prior: '4.3%', forecast: '4.4%', urgency: 77, scenarioNarrative: 'Sticky wages would keep sterling relatively supported against low-yield peers.' },
  { id: 'evt-in-gdp', title: 'India GDP Estimate', type: 'GDP', currencyCodes: ['INR'], pairIds: ['usd-inr'], region: 'India', impact: 'medium', status: 'upcoming', scheduledAt: addDays(5), prior: '6.2%', forecast: '6.3%', urgency: 49, scenarioNarrative: 'A stronger growth print supports INR resilience but broad USD tone still matters.' },
  { id: 'evt-au-trade', title: 'Australia Trade Balance', type: 'trade balance', currencyCodes: ['AUD'], pairIds: ['aud-usd', 'aud-jpy'], region: 'Australia', impact: 'medium', status: 'upcoming', scheduledAt: addHours(18), prior: '10.1B', forecast: '9.5B', urgency: 58, scenarioNarrative: 'A stronger balance supports AUD only if China-linked demand optimism also holds.' },
  { id: 'evt-ca-gdp', title: 'Canada Monthly GDP', type: 'GDP', currencyCodes: ['CAD'], pairIds: ['usd-cad'], region: 'Canada', impact: 'medium', status: 'upcoming', scheduledAt: addDays(1), prior: '0.1%', forecast: '0.0%', urgency: 55, scenarioNarrative: 'Weak growth would reinforce a more dovish BoC outlook and favor USD/CAD upside.' },
  { id: 'evt-swiss-cpi', title: 'Swiss CPI', type: 'CPI', currencyCodes: ['CHF'], pairIds: ['usd-chf', 'eur-chf', 'gbp-chf'], region: 'Switzerland', impact: 'low', status: 'upcoming', scheduledAt: addDays(2), prior: '1.3%', forecast: '1.4%', urgency: 40, scenarioNarrative: 'CHF reacts more to risk tone than CPI unless inflation surprises materially.' },
  { id: 'evt-nz-rbnz', title: 'RBNZ Rate Decision', type: 'rate decision', currencyCodes: ['NZD'], pairIds: ['nzd-usd'], region: 'New Zealand', impact: 'high', status: 'upcoming', scheduledAt: addDays(6), prior: '5.00%', forecast: '5.00%', urgency: 64, scenarioNarrative: 'A hawkish hold would help NZD carry sentiment if risk appetite is stable.' },
  { id: 'evt-cn-pmi', title: 'China Manufacturing PMI', type: 'manufacturing PMI', currencyCodes: ['CNY', 'AUD', 'NZD'], pairIds: ['aud-usd', 'aud-jpy', 'nzd-usd'], region: 'China', impact: 'high', status: 'upcoming', scheduledAt: addHours(28), prior: '50.7', forecast: '50.9', urgency: 73, scenarioNarrative: 'A strong PMI would strengthen cyclical commodity FX narratives.' },
  { id: 'evt-energy-shock', title: 'Energy Corridor Disruption', type: 'geopolitical incident', currencyCodes: ['USD', 'CAD', 'INR'], pairIds: ['usd-cad', 'usd-inr', 'eur-usd'], region: 'Global', impact: 'high', status: 'released', scheduledAt: addHours(-12), prior: 'n/a', forecast: 'n/a', actual: 'Confirmed route disruptions', surpriseDirection: 'negative', urgency: 69, scenarioNarrative: 'Oil-sensitive currencies and inflation-linked USD themes gained attention after the headline.' },
]

export const news: NewsItem[] = [
  { id: 'news-usd-yields', headline: 'Treasury yields hold firm as cuts remain delayed', source: 'Sovereign Wire', timestamp: addHours(-2), currencyCodes: ['USD'], pairIds: ['eur-usd', 'usd-jpy', 'usd-cad'], eventIds: ['evt-us-cpi'], sentiment: 'bullish', impact: 'high', explanation: 'USD remains rate-supported into a data-heavy stretch.', whyItMatters: 'Higher yields keep carry-sensitive dollar pairs supported even when risk sentiment is stable.', reactionBias: 'Supports USD longs on dips.' },
  { id: 'news-us-cpi-preview', headline: 'Desk focus shifts to US CPI after sticky services read', source: 'Macro Desk', timestamp: addHours(-5), currencyCodes: ['USD'], pairIds: ['eur-usd', 'gbp-usd', 'aud-usd'], eventIds: ['evt-us-cpi'], sentiment: 'bullish', impact: 'high', explanation: 'Inflation risk is the next catalyst for yield repricing.', whyItMatters: 'If inflation re-accelerates, USD strength could broaden across majors.', reactionBias: 'Favors defensive USD positioning.' },
  { id: 'news-global-risk-off', headline: 'Cross-asset tone turns defensive after supply disruption', source: 'Terminal Nine', timestamp: addHours(-9), currencyCodes: ['USD', 'JPY', 'CHF'], pairIds: ['usd-jpy', 'usd-chf', 'eur-usd'], eventIds: ['evt-energy-shock'], sentiment: 'bullish', impact: 'high', explanation: 'Defensive currencies gained attention as energy risk re-entered the macro tape.', whyItMatters: 'The interaction between safe havens and rate differentials is raising dispersion across FX majors.', reactionBias: 'Supports CHF and USD, but JPY response depends on local policy headlines.' },
  { id: 'news-eur-growth', headline: 'Euro area demand indicators still soft ahead of CPI', source: 'Continental Macro', timestamp: addHours(-7), currencyCodes: ['EUR'], pairIds: ['eur-usd', 'eur-gbp', 'eur-jpy'], eventIds: ['evt-ez-cpi'], sentiment: 'bearish', impact: 'medium', explanation: 'Growth softness limits confidence in any sustained euro rebound.', whyItMatters: 'Weak activity data leaves EUR vulnerable unless inflation surprises higher.', reactionBias: 'EUR rallies may fade without hawkish ECB cues.' },
  { id: 'news-ecb-tone', headline: 'ECB speakers leave room for gradual easing path', source: 'Policy Watch', timestamp: addHours(-12), currencyCodes: ['EUR'], pairIds: ['eur-usd', 'eur-gbp', 'eur-chf'], eventIds: ['evt-ecb-speaker'], sentiment: 'bearish', impact: 'medium', explanation: 'The euro lacks a clean policy catalyst relative to the dollar or sterling.', whyItMatters: 'Relative policy drift keeps the euro more reactive than proactive.', reactionBias: 'Neutral to mildly EUR-negative.' },
  { id: 'news-jpy-intervention', headline: 'Officials repeat warning against disorderly FX moves', source: 'Tokyo Briefing', timestamp: addHours(-3), currencyCodes: ['JPY'], pairIds: ['usd-jpy', 'gbp-jpy', 'aud-jpy'], eventIds: ['evt-boj-speech'], sentiment: 'bullish', impact: 'high', explanation: 'Jawboning is raising asymmetry in yen shorts.', whyItMatters: 'Crowded yen weakness can reverse abruptly if verbal or actual intervention follows.', reactionBias: 'Elevates downside tail risk in JPY crosses.' },
  { id: 'news-boj-normalization', headline: 'BoJ normalization speculation returns to front page', source: 'Macro Flow', timestamp: addHours(-11), currencyCodes: ['JPY'], pairIds: ['usd-jpy', 'eur-jpy'], eventIds: ['evt-boj-speech', 'evt-jp-cpi'], sentiment: 'bullish', impact: 'medium', explanation: 'Markets are increasingly sensitive to even subtle tone shifts from Tokyo.', whyItMatters: 'Small policy shifts can matter when spread-driven shorts are crowded.', reactionBias: 'Supports tactical JPY rebound scenarios.' },
  { id: 'news-gbp-wages', headline: 'UK wage growth keeps Bank of England caution alive', source: 'Sterling Journal', timestamp: addHours(-6), currencyCodes: ['GBP'], pairIds: ['gbp-usd', 'gbp-jpy', 'eur-gbp'], eventIds: ['evt-uk-jobs'], sentiment: 'bullish', impact: 'medium', explanation: 'Sterling is retaining rate support as labor data stays sticky.', whyItMatters: 'GBP can outperform lower-yield Europe when wage pressure delays easing.', reactionBias: 'Supports GBP on relative-rate metrics.' },
  { id: 'news-inr-oil', headline: 'Oil rebound keeps rupee traders focused on imported inflation', source: 'South Asia Macro', timestamp: addHours(-13), currencyCodes: ['INR'], pairIds: ['usd-inr'], eventIds: ['evt-energy-shock', 'evt-in-gdp'], sentiment: 'bearish', impact: 'medium', explanation: 'Strong growth is helping INR, but energy prices complicate the backdrop.', whyItMatters: 'Oil is one of the cleanest ways global macro shocks leak into INR risk.', reactionBias: 'Leans USD/INR higher unless RBI smooths conditions.' },
  { id: 'news-aud-commodities', headline: 'Commodity desk sees tentative demand rebound in metals', source: 'Pacific Desk', timestamp: addHours(-15), currencyCodes: ['AUD'], pairIds: ['aud-usd', 'aud-jpy'], eventIds: ['evt-cn-pmi'], sentiment: 'bullish', impact: 'medium', explanation: 'AUD sentiment improved as demand expectations stabilized.', whyItMatters: 'The Australia-China commodity channel remains central to AUD upside cases.', reactionBias: 'Supports AUD if risk tone remains constructive.' },
  { id: 'news-cad-oil', headline: 'Oil steadies but Canada growth uncertainty limits CAD follow-through', source: 'North FX', timestamp: addHours(-4), currencyCodes: ['CAD'], pairIds: ['usd-cad'], eventIds: ['evt-ca-gdp', 'evt-energy-shock'], sentiment: 'neutral', impact: 'medium', explanation: 'Crude helps CAD, but policy drift remains a headwind.', whyItMatters: 'USD/CAD stays mixed unless one side gets a cleaner catalyst.', reactionBias: 'Range trading still favored.' },
  { id: 'news-chf-defensive', headline: 'Franc demand ticks up as defensive baskets reappear', source: 'Geneva Note', timestamp: addHours(-16), currencyCodes: ['CHF'], pairIds: ['usd-chf', 'eur-chf', 'gbp-chf'], eventIds: ['evt-energy-shock'], sentiment: 'bullish', impact: 'medium', explanation: 'CHF is seeing renewed inflows when macro uncertainty rises.', whyItMatters: 'CHF crosses can diverge from rate logic when stress themes lead.', reactionBias: 'Supports CHF in broader risk-off sessions.' },
  { id: 'news-nzd-carry', headline: 'NZD carry remains attractive, but demand backdrop still uneven', source: 'Kiwi Macro', timestamp: addHours(-18), currencyCodes: ['NZD'], pairIds: ['nzd-usd'], eventIds: ['evt-nz-rbnz'], sentiment: 'neutral', impact: 'low', explanation: 'Carry supports NZD, but conviction is limited without stronger growth optics.', whyItMatters: 'High-beta carry trades remain vulnerable when volatility picks up.', reactionBias: 'Constructive only while risk stays calm.' },
  { id: 'news-china-demand', headline: 'China demand narrative improves slightly ahead of PMI', source: 'Asia Pulse', timestamp: addHours(-10), currencyCodes: ['CNY', 'AUD', 'NZD'], pairIds: ['aud-usd', 'aud-jpy', 'nzd-usd'], eventIds: ['evt-cn-pmi'], sentiment: 'bullish', impact: 'medium', explanation: 'A better China tone is feeding directly into commodity-linked FX sentiment.', whyItMatters: 'AUD and NZD outlooks often require a supportive China backdrop to extend rallies.', reactionBias: 'Favors cyclical FX if PMI confirms.' },
  { id: 'news-usd-jpy-crowding', headline: 'Desk notes warn of crowding in USD/JPY longs', source: 'Cross Current', timestamp: addHours(-8), currencyCodes: ['USD', 'JPY'], pairIds: ['usd-jpy'], eventIds: ['evt-boj-speech'], sentiment: 'neutral', impact: 'high', explanation: 'Trend remains up, but positioning makes the pair sensitive to surprises.', whyItMatters: 'A trend can stay intact while its tactical risk worsens materially.', reactionBias: 'Encourages tighter stops on directional longs.' },
  { id: 'news-eur-usd-spreads', headline: 'EUR/USD spread differential still points to dollar edge', source: 'Rates Lens', timestamp: addHours(-14), currencyCodes: ['EUR', 'USD'], pairIds: ['eur-usd'], eventIds: ['evt-us-cpi', 'evt-ez-cpi'], sentiment: 'bearish', impact: 'high', explanation: 'Macro differential remains in favor of USD despite stretched positioning.', whyItMatters: 'EUR/USD still trades primarily as a rates and growth spread expression.', reactionBias: 'Maintains bearish medium-term bias for EUR/USD.' },
  { id: 'news-gbp-jpy-vol', headline: 'Sterling-yen implied volatility lifts into BoJ event cluster', source: 'Vol Surface', timestamp: addHours(-1), currencyCodes: ['GBP', 'JPY'], pairIds: ['gbp-jpy'], eventIds: ['evt-boj-speech', 'evt-uk-jobs'], sentiment: 'neutral', impact: 'high', explanation: 'High-beta carry cross is carrying more event premium into the week.', whyItMatters: 'Volatility-sensitive crosses can move even without spot trend changes when event risk rises.', reactionBias: 'Supports cautious sizing.' },
  { id: 'news-aud-jpy-risk', headline: 'AUD/JPY remains favored in risk-on sessions, but tail risk has widened', source: 'Cross Asset Review', timestamp: addHours(-19), currencyCodes: ['AUD', 'JPY'], pairIds: ['aud-jpy'], eventIds: ['evt-cn-pmi', 'evt-boj-speech'], sentiment: 'bullish', impact: 'medium', explanation: 'Carry and demand optimism support the pair, though yen headline risk is not negligible.', whyItMatters: 'AUD/JPY is one of the cleanest expressions of cyclical optimism versus policy-sensitive funding currency dynamics.', reactionBias: 'Bullish bias with elevated event caution.' },
  { id: 'news-eur-chf-defensive', headline: 'EUR/CHF drifts lower as defensive demand outweighs euro stabilization attempts', source: 'Defensive FX', timestamp: addHours(-21), currencyCodes: ['EUR', 'CHF'], pairIds: ['eur-chf'], eventIds: ['evt-swiss-cpi', 'evt-ez-cpi'], sentiment: 'bearish', impact: 'medium', explanation: 'Regional growth softness and defensive demand still favor the franc.', whyItMatters: 'Low-vol crosses still encode macro preference shifts even without sharp spot moves.', reactionBias: 'Keeps euro-franc rallies contained.' },
  { id: 'news-usd-cad-balance', headline: 'USD/CAD stays two-sided as oil support offsets Fed premium', source: 'North America Focus', timestamp: addHours(-17), currencyCodes: ['USD', 'CAD'], pairIds: ['usd-cad'], eventIds: ['evt-ca-gdp'], sentiment: 'neutral', impact: 'medium', explanation: 'Neither side has decisive control yet.', whyItMatters: 'Mixed crosses are useful in the platform because they force the user to weigh macro and technical evidence together.', reactionBias: 'Favor scenario testing over conviction trades.' },
]

export const forecasts: Forecast[] = pairs.map((pair, index) => {
  const latest = latestPriceMap[pair.id]
  const slope = (pair.sentimentScore - 50) / 700
  const riskWidth = pair.eventRiskBase / 1600
  const horizons = ['1W', '2W', '1M', '3M']
  return {
    id: `fc-${pair.id}`,
    pairId: pair.id,
    horizons,
    basePath: horizons.map((horizon, pointIndex) => ({ horizon, value: Number((latest + slope * (pointIndex + 1)).toFixed(pair.displayPrecision)) })),
    optimisticPath: horizons.map((horizon, pointIndex) => ({ horizon, value: Number((latest + slope * (pointIndex + 1) + riskWidth * (pointIndex + 1)).toFixed(pair.displayPrecision)) })),
    pessimisticPath: horizons.map((horizon, pointIndex) => ({ horizon, value: Number((latest + slope * (pointIndex + 1) - riskWidth * (pointIndex + 1)).toFixed(pair.displayPrecision)) })),
    uncertaintyCurve: horizons.map((_, pointIndex) => Number((riskWidth * (pointIndex + 1) * (1 + index / 18)).toFixed(pair.displayPrecision))),
    confidence: Math.max(38, Math.min(79, 70 - pair.eventRiskBase / 3 + pair.carryScore / 4)),
    driverImportance: {
      macroDifferential: 28 + (pair.carryScore % 9),
      technicalTrend: 22 + (pair.sentimentScore % 7),
      newsSentiment: 17 + (index % 5),
      eventPressure: 18 + Math.round(pair.eventRiskBase / 10),
      rateExpectations: 15 + (pair.carryScore % 6),
    },
    disclaimer: 'Illustrative forecast only. This path demonstrates how a future model output could be presented, not a live predictive signal.',
  }
})

export const strategies: StrategyTemplate[] = [
  { id: 'strat-breakout', name: 'Trend-Following Breakout', style: 'Trend', suitedPairs: ['eur-usd', 'usd-jpy', 'gbp-usd'], suitedRegimes: ['persistent macro trend', 'post-event continuation'], entryLogic: 'Break above recent range with trend confirmation and rising volume proxy.', exitLogic: 'Trail behind short MA or exit on range failure.', riskProfile: 'Moderate', illustrationModel: 'Shows breakout markers and follow-through windows on historical series.' },
  { id: 'strat-ma', name: 'Moving Average Crossover', style: 'Trend', suitedPairs: ['eur-usd', 'aud-usd', 'usd-cad'], suitedRegimes: ['clean trend', 'low noise'], entryLogic: 'Enter when short MA crosses above or below long MA with momentum confirmation.', exitLogic: 'Exit on reverse cross or loss of momentum.', riskProfile: 'Moderate', illustrationModel: 'Compares signal lag versus smoother trend capture.' },
  { id: 'strat-rsi', name: 'RSI Mean Reversion', style: 'Mean reversion', suitedPairs: ['eur-gbp', 'eur-chf', 'usd-chf'], suitedRegimes: ['range-bound', 'lower volatility'], entryLogic: 'Fade stretched RSI readings into known support or resistance.', exitLogic: 'Take profit near mid-band or prior equilibrium zone.', riskProfile: 'Conservative', illustrationModel: 'Highlights overextension zones and mean reversion paths.' },
  { id: 'strat-vol', name: 'Volatility Breakout', style: 'Volatility', suitedPairs: ['gbp-jpy', 'aud-jpy', 'usd-jpy'], suitedRegimes: ['event compression then expansion'], entryLogic: 'Trade break from compressed range once ATR expands.', exitLogic: 'Scale out as volatility normalizes.', riskProfile: 'Aggressive', illustrationModel: 'Overlays ATR bands and event markers.' },
  { id: 'strat-carry', name: 'Carry Continuation', style: 'Macro carry', suitedPairs: ['usd-jpy', 'aud-jpy', 'nzd-usd'], suitedRegimes: ['stable volatility', 'steady yield differential'], entryLogic: 'Favor higher-yield side when macro risk is calm and spreads are stable.', exitLogic: 'Exit when volatility or intervention risk spikes.', riskProfile: 'Moderate', illustrationModel: 'Connects yield support to drawdown risk under shocks.' },
  { id: 'strat-divergence', name: 'Central-Bank Divergence Thesis', style: 'Macro', suitedPairs: ['eur-usd', 'usd-cad', 'eur-gbp'], suitedRegimes: ['policy divergence', 'data repricing'], entryLogic: 'Build directional bias when central bank paths decouple.', exitLogic: 'Reduce on convergence or major data invalidation.', riskProfile: 'Moderate', illustrationModel: 'Shows driver-weight shifts over time.' },
  { id: 'strat-event-fade', name: 'Event Fade', style: 'Event', suitedPairs: ['eur-usd', 'gbp-usd', 'usd-jpy'], suitedRegimes: ['one-off event overshoot'], entryLogic: 'Fade exaggerated post-release move if macro regime remains unchanged.', exitLogic: 'Exit into normalization or if secondary confirmation appears.', riskProfile: 'Aggressive', illustrationModel: 'Compares release spike to post-event mean reversion.' },
  { id: 'strat-range', name: 'Range Reversion', style: 'Range', suitedPairs: ['eur-gbp', 'eur-chf', 'usd-inr'], suitedRegimes: ['managed or lower-vol markets'], entryLogic: 'Buy support and sell resistance while macro catalysts remain muted.', exitLogic: 'Cut on decisive range break.', riskProfile: 'Conservative', illustrationModel: 'Uses support and resistance zones as structure anchors.' },
]

export const scenarios: MacroScenarioPreset[] = [
  { id: 'scenario-hawkish-fed', name: 'Hawkish Fed', description: 'US inflation resilience delays easing again.', currencyEffects: { USD: 8, EUR: -4, JPY: -3 }, pairEffects: { 'eur-usd': -6, 'usd-jpy': 5, 'gbp-usd': -4 }, forecastBiasShifts: { 'eur-usd': -0.004, 'usd-jpy': 0.6 }, eventIntensityShifts: { 'evt-us-cpi': 8 }, newsToneShifts: { USD: 6 } },
  { id: 'scenario-dovish-fed', name: 'Dovish Fed', description: 'Soft data revives faster easing hopes.', currencyEffects: { USD: -8, EUR: 2, JPY: 3 }, pairEffects: { 'eur-usd': 5, 'usd-jpy': -4 }, forecastBiasShifts: { 'eur-usd': 0.004, 'usd-jpy': -0.8 }, eventIntensityShifts: { 'evt-us-payrolls': 4 }, newsToneShifts: { USD: -5 } },
  { id: 'scenario-boj-normalization', name: 'BoJ Normalization', description: 'Japanese policy path turns more credible.', currencyEffects: { JPY: 10, USD: -2, AUD: -1 }, pairEffects: { 'usd-jpy': -7, 'eur-jpy': -5, 'aud-jpy': -6 }, forecastBiasShifts: { 'usd-jpy': -1.1 }, eventIntensityShifts: { 'evt-boj-speech': 10 }, newsToneShifts: { JPY: 7 } },
  { id: 'scenario-commodity-surge', name: 'Commodity Surge', description: 'Demand and commodity prices lift cyclicals.', currencyEffects: { AUD: 7, CAD: 5, NZD: 5, USD: -2 }, pairEffects: { 'aud-usd': 4, 'usd-cad': -3, 'nzd-usd': 4, 'aud-jpy': 5 }, forecastBiasShifts: { 'aud-usd': 0.005 }, eventIntensityShifts: { 'evt-cn-pmi': 6 }, newsToneShifts: { AUD: 5, CAD: 4, NZD: 4 } },
]

const baseSim = (id: string, userId: string, pairId: string, direction: 'long' | 'short', capital: number, positionSize: number, leverage: number): Simulation => {
  const pair = pairs.find((item) => item.id === pairId)!
  const latest = latestPriceMap[pairId]
  const pip = pair.pipPrecision
  const entry = latest
  const stopLoss = direction === 'long' ? latest - 20 * pip : latest + 20 * pip
  const takeProfit = direction === 'long' ? latest + 42 * pip : latest - 42 * pip
  const exit = direction === 'long' ? latest + 12 * pip : latest - 12 * pip
  return {
    id,
    userId,
    pairId,
    sourceContext: 'saved',
    accountCurrency: 'USD',
    capital,
    direction,
    entry,
    exit,
    stopLoss,
    takeProfit,
    leverage,
    positionSize,
    lotSize: positionSize / 100000,
    spread: pair.spreadEstimate,
    fees: 12,
    holdingDuration: '3 days',
    conviction: 62,
    scenarioType: 'trend continuation',
    outputs: calculateTradeOutputs({
      symbol: pair.symbol,
      direction,
      capital,
      leverage,
      entry,
      exit,
      stopLoss,
      takeProfit,
      positionSize,
      spread: pair.spreadEstimate,
      fees: 12,
    }),
    linkedNoteIds: [],
    createdAt: addDays(-5),
    updatedAt: addDays(-1),
  }
}

export const simulations: Simulation[] = [
  baseSim('sim-1', 'user-beginner', 'eur-usd', 'long', 10000, 45000, 5),
  baseSim('sim-2', 'user-macro', 'usd-jpy', 'short', 45000, 65000, 4),
  baseSim('sim-3', 'user-technical', 'gbp-usd', 'long', 18000, 52000, 6),
  baseSim('sim-4', 'user-sim', 'aud-jpy', 'long', 30000, 70000, 10),
  baseSim('sim-5', 'user-portfolio', 'usd-cad', 'short', 52000, 88000, 5),
  baseSim('sim-6', 'user-admin', 'eur-jpy', 'short', 90000, 120000, 8),
  baseSim('sim-7', 'user-macro', 'eur-usd', 'short', 45000, 76000, 5),
  baseSim('sim-8', 'user-sim', 'nzd-usd', 'long', 30000, 64000, 9),
]

export const positions: PortfolioPosition[] = [
  { id: 'pos-1', pairId: 'eur-usd', direction: 'long', size: 55000, entry: 1.081, currentPrice: latestPriceMap['eur-usd'], stopLoss: 1.074, takeProfit: 1.096, openedAt: addDays(-7), status: 'open', originSimulationId: 'sim-1', unrealizedPnL: 352, leverage: 5 },
  { id: 'pos-2', pairId: 'usd-jpy', direction: 'short', size: 60000, entry: 153.1, currentPrice: latestPriceMap['usd-jpy'], stopLoss: 154.6, takeProfit: 149.9, openedAt: addDays(-3), status: 'open', originSimulationId: 'sim-2', unrealizedPnL: 497, leverage: 4 },
  { id: 'pos-3', pairId: 'usd-cad', direction: 'short', size: 72000, entry: 1.356, currentPrice: latestPriceMap['usd-cad'], stopLoss: 1.362, takeProfit: 1.341, openedAt: addDays(-6), status: 'open', originSimulationId: 'sim-5', unrealizedPnL: 428, leverage: 5 },
  { id: 'pos-4', pairId: 'gbp-jpy', direction: 'long', size: 46000, entry: 191.8, currentPrice: 192.44, stopLoss: 189.9, takeProfit: 194.8, openedAt: addDays(-12), closedAt: addDays(-5), status: 'closed', unrealizedPnL: 0, realizedPnL: 289, leverage: 6 },
  { id: 'pos-5', pairId: 'aud-usd', direction: 'long', size: 50000, entry: 0.6548, currentPrice: 0.6611, stopLoss: 0.6486, takeProfit: 0.6688, openedAt: addDays(-10), closedAt: addDays(-2), status: 'closed', unrealizedPnL: 0, realizedPnL: 314, leverage: 5 },
]

export const orders: PortfolioOrder[] = [
  { id: 'ord-1', pairId: 'eur-usd', action: 'open', timestamp: addDays(-7), detail: 'Opened from saved simulation sim-1.' },
  { id: 'ord-2', pairId: 'usd-jpy', action: 'open', timestamp: addDays(-3), detail: 'Event-risk tactical short initiated before BoJ speech cluster.' },
  { id: 'ord-3', pairId: 'usd-cad', action: 'modify', timestamp: addDays(-1), detail: 'Tightened stop after oil-sensitive rebound faded.' },
  { id: 'ord-4', pairId: 'gbp-jpy', action: 'close', timestamp: addDays(-5), detail: 'Closed into event premium expansion.' },
]

export const journals: PortfolioJournal[] = [
  { id: 'jr-1', title: 'USD concentration check', body: 'Three active positions still leave the book net long USD. Need to monitor CPI clustering.', pairId: 'eur-usd', createdAt: addDays(-1) },
  { id: 'jr-2', title: 'JPY tail-risk note', body: 'Short USD/JPY remains profitable, but intervention rhetoric makes the distribution asymmetric.', pairId: 'usd-jpy', createdAt: addHours(-8) },
  { id: 'jr-3', title: 'Oil spillover review', body: 'USD/CAD no longer behaves like a clean dollar proxy once crude firms.', pairId: 'usd-cad', createdAt: addDays(-2) },
]

export const portfolios: PortfolioAccount[] = [
  { id: 'portfolio-beginner', userId: 'user-beginner', baseCurrency: 'USD', balance: 10350, equity: 10702, marginUsed: 11800, freeMargin: -1098, openPositionIds: ['pos-1'], closedPositionIds: [], orderIds: ['ord-1'], journalIds: [] },
  { id: 'portfolio-macro', userId: 'user-macro', baseCurrency: 'USD', balance: 46000, equity: 46497, marginUsed: 22776, freeMargin: 23721, openPositionIds: ['pos-2'], closedPositionIds: [], orderIds: ['ord-2'], journalIds: ['jr-2'] },
  { id: 'portfolio-technical', userId: 'user-technical', baseCurrency: 'USD', balance: 18320, equity: 18320, marginUsed: 0, freeMargin: 18320, openPositionIds: [], closedPositionIds: ['pos-5'], orderIds: [], journalIds: [] },
  { id: 'portfolio-sim', userId: 'user-sim', baseCurrency: 'USD', balance: 30120, equity: 30120, marginUsed: 0, freeMargin: 30120, openPositionIds: [], closedPositionIds: [], orderIds: [], journalIds: [] },
  { id: 'portfolio-centric', userId: 'user-portfolio', baseCurrency: 'USD', balance: 52680, equity: 53108, marginUsed: 19408, freeMargin: 33700, openPositionIds: ['pos-3'], closedPositionIds: ['pos-4'], orderIds: ['ord-3', 'ord-4'], journalIds: ['jr-1', 'jr-3'] },
  { id: 'portfolio-locked', userId: 'user-locked', baseCurrency: 'USD', balance: 15000, equity: 15000, marginUsed: 0, freeMargin: 15000, openPositionIds: [], closedPositionIds: [], orderIds: [], journalIds: [] },
  { id: 'portfolio-unverified', userId: 'user-unverified', baseCurrency: 'USD', balance: 22000, equity: 22000, marginUsed: 0, freeMargin: 22000, openPositionIds: [], closedPositionIds: [], orderIds: [], journalIds: [] },
  { id: 'portfolio-admin', userId: 'user-admin', baseCurrency: 'USD', balance: 90500, equity: 90500, marginUsed: 0, freeMargin: 90500, openPositionIds: [], closedPositionIds: [], orderIds: [], journalIds: [] },
]

export const watchlist: WatchlistItem[] = [
  { id: 'watch-1', userId: 'user-beginner', entityType: 'pair', entityId: 'eur-usd', createdAt: addDays(-10), priority: 'high' },
  { id: 'watch-2', userId: 'user-beginner', entityType: 'currency', entityId: 'USD', createdAt: addDays(-8), priority: 'medium' },
  { id: 'watch-3', userId: 'user-macro', entityType: 'currency', entityId: 'JPY', createdAt: addDays(-12), priority: 'high' },
  { id: 'watch-4', userId: 'user-macro', entityType: 'event', entityId: 'evt-us-cpi', createdAt: addDays(-5), priority: 'high' },
  { id: 'watch-5', userId: 'user-technical', entityType: 'pair', entityId: 'gbp-usd', createdAt: addDays(-3), priority: 'medium' },
  { id: 'watch-6', userId: 'user-sim', entityType: 'pair', entityId: 'aud-jpy', createdAt: addDays(-2), priority: 'high' },
  { id: 'watch-7', userId: 'user-portfolio', entityType: 'pair', entityId: 'usd-cad', createdAt: addDays(-7), priority: 'high' },
  { id: 'watch-8', userId: 'user-portfolio', entityType: 'forecast', entityId: 'fc-usd-jpy', createdAt: addDays(-1), priority: 'medium' },
  { id: 'watch-9', userId: 'user-admin', entityType: 'currency', entityId: 'AUD', createdAt: addDays(-2), priority: 'medium' },
  { id: 'watch-10', userId: 'user-admin', entityType: 'event', entityId: 'evt-boj-speech', createdAt: addHours(-15), priority: 'high' },
]

export const alerts: AlertRule[] = [
  { id: 'alert-1', userId: 'user-beginner', entityType: 'pair', entityId: 'eur-usd', conditionType: 'price_cross', threshold: '1.09', status: 'active', createdAt: addDays(-6), lastEvaluation: addHours(-1) },
  { id: 'alert-2', userId: 'user-macro', entityType: 'event', entityId: 'evt-us-cpi', conditionType: 'event_approaching', threshold: '3h', status: 'triggered', createdAt: addDays(-2), lastTriggeredAt: addHours(-1), lastEvaluation: addHours(-1) },
  { id: 'alert-3', userId: 'user-macro', entityType: 'currency', entityId: 'JPY', conditionType: 'macro_risk_change', threshold: 'risk > 75', status: 'active', createdAt: addDays(-4), lastEvaluation: addHours(-2) },
  { id: 'alert-4', userId: 'user-sim', entityType: 'pair', entityId: 'aud-jpy', conditionType: 'volatility_threshold', threshold: 'score > 72', status: 'active', createdAt: addDays(-3), lastEvaluation: addHours(-2) },
  { id: 'alert-5', userId: 'user-portfolio', entityType: 'forecast', entityId: 'fc-usd-jpy', conditionType: 'uncertainty_widening', threshold: 'band > 0.8', status: 'active', createdAt: addDays(-1), lastEvaluation: addHours(-1) },
]

export const notes: Note[] = [
  { id: 'note-1', userId: 'user-beginner', title: 'EUR/USD starter thesis', body: 'Want to stay with the broader USD carry theme, but only with defined stop width. CPI could invalidate quickly.', tags: ['pair thesis', 'usd'], template: 'pair thesis', pinned: true, linkedEntities: [{ entityType: 'pair', entityId: 'eur-usd' }, { entityType: 'currency', entityId: 'USD' }], createdAt: addDays(-6), updatedAt: addDays(-2) },
  { id: 'note-2', userId: 'user-macro', title: 'JPY policy divergence', body: 'BoJ uncertainty is finally large enough to offset some of the spread disadvantage. Need scenario grid for dovish vs hawkish speech.', tags: ['policy divergence', 'boj'], template: 'weekly macro summary', pinned: true, linkedEntities: [{ entityType: 'pair', entityId: 'usd-jpy' }, { entityType: 'currency', entityId: 'JPY' }], createdAt: addDays(-4), updatedAt: addHours(-10) },
  { id: 'note-3', userId: 'user-macro', title: 'US CPI prep', body: 'If core services beat again, the dashboard should show broader USD pressure and tighter EUR/USD downside risk.', tags: ['event prep', 'inflation'], template: 'event prep', pinned: false, linkedEntities: [{ entityType: 'event', entityId: 'evt-us-cpi' }, { entityType: 'currency', entityId: 'USD' }], createdAt: addDays(-2), updatedAt: addHours(-8) },
  { id: 'note-4', userId: 'user-technical', title: 'Sterling breakout structure', body: 'GBP/USD retains cleaner structure than EUR/USD. Momentum works until wages roll over.', tags: ['technical', 'breakout'], template: 'pair thesis', pinned: false, linkedEntities: [{ entityType: 'pair', entityId: 'gbp-usd' }], createdAt: addDays(-3), updatedAt: addDays(-1) },
  { id: 'note-5', userId: 'user-sim', title: 'AUD/JPY leverage stress', body: 'Same directional thesis becomes fragile above 10x leverage. Keep this as a compare example.', tags: ['simulation', 'risk'], template: 'post-simulation review', pinned: true, linkedEntities: [{ entityType: 'simulation', entityId: 'sim-4' }, { entityType: 'pair', entityId: 'aud-jpy' }, { entityType: 'currency', entityId: 'JPY' }], createdAt: addDays(-2), updatedAt: addHours(-4) },
  { id: 'note-6', userId: 'user-portfolio', title: 'USD concentration warning', body: 'The book is increasingly an implicit USD view. Need more cross exposure or smaller gross sizing.', tags: ['risk observation', 'portfolio'], template: 'risk observation', pinned: true, linkedEntities: [{ entityType: 'pair', entityId: 'usd-cad' }, { entityType: 'pair', entityId: 'eur-usd' }], createdAt: addDays(-1), updatedAt: addHours(-6) },
  { id: 'note-7', userId: 'user-portfolio', title: 'Journal: event premium', body: 'Closed GBP/JPY as implied volatility climbed into the BoJ cluster. Carry still attractive but the distribution worsened.', tags: ['journal', 'event risk'], template: 'post-simulation review', pinned: false, linkedEntities: [{ entityType: 'pair', entityId: 'gbp-jpy' }], createdAt: addDays(-5), updatedAt: addDays(-5) },
  { id: 'note-8', userId: 'user-admin', title: 'Demo mutation script', body: 'Use JPY vol spike and AUD sentiment shift to demonstrate cross-page propagation in explorer, forecasts, and dashboard alerts.', tags: ['admin', 'demo'], template: 'weekly macro summary', pinned: true, linkedEntities: [{ entityType: 'currency', entityId: 'JPY' }, { entityType: 'currency', entityId: 'AUD' }], createdAt: addDays(-1), updatedAt: addHours(-2) },
  { id: 'note-9', userId: 'user-unverified', title: 'Pending verification setup', body: 'After verification, default to macro-heavy dashboard with USD and EUR events prioritized.', tags: ['onboarding'], template: 'weekly macro summary', pinned: false, linkedEntities: [{ entityType: 'currency', entityId: 'USD' }], createdAt: addDays(-1), updatedAt: addDays(-1) },
  { id: 'note-10', userId: 'user-beginner', title: 'Risk observation: spread drag', body: 'Short-duration ideas in majors can still be undermined by spread and fee assumptions. Keep using the breakeven panel.', tags: ['risk observation'], template: 'risk observation', pinned: false, linkedEntities: [{ entityType: 'simulation', entityId: 'sim-1' }], createdAt: addDays(-1), updatedAt: addHours(-16) },
]

export const users: User[] = [
  { id: 'user-beginner', role: 'user', status: 'active', email: 'beginner@sovereign.demo', password: 'demo123', displayName: 'Mina Rao', avatarSeed: 'mina', experienceLevel: 'beginner', riskProfile: 'conservative', analysisFocus: 'simulation', defaultAccountCurrency: 'USD', favoriteCurrencies: ['USD', 'EUR'], favoritePairs: ['eur-usd', 'usd-jpy'], dashboardPreset: 'simulation-heavy', settings: defaultSettings({ dashboardMode: 'simulation-heavy', chartDefaults: { chartMode: 'line', timeframe: '1M', overlays: ['ma', 'forecast'] }, favoriteCurrencies: ['USD', 'EUR'], favoritePairs: ['eur-usd', 'usd-jpy'] }), watchlistIds: ['watch-1', 'watch-2'], alertIds: ['alert-1'], noteIds: ['note-1', 'note-10'], portfolioId: 'portfolio-beginner', savedSimulationIds: ['sim-1'], onboardingCompleted: true, verified: true, locked: false },
  { id: 'user-macro', role: 'user', status: 'active', email: 'macro@sovereign.demo', password: 'macro123', displayName: 'Elena Ward', avatarSeed: 'elena', experienceLevel: 'expert', riskProfile: 'balanced', analysisFocus: 'macro', defaultAccountCurrency: 'USD', favoriteCurrencies: ['USD', 'JPY', 'EUR'], favoritePairs: ['usd-jpy', 'eur-usd', 'eur-jpy'], dashboardPreset: 'research-heavy', settings: defaultSettings({ dashboardMode: 'research-heavy', favoriteCurrencies: ['USD', 'JPY', 'EUR'], favoritePairs: ['usd-jpy', 'eur-usd', 'eur-jpy'] }), watchlistIds: ['watch-3', 'watch-4'], alertIds: ['alert-2', 'alert-3'], noteIds: ['note-2', 'note-3'], portfolioId: 'portfolio-macro', savedSimulationIds: ['sim-2', 'sim-7'], onboardingCompleted: true, verified: true, locked: false },
  { id: 'user-technical', role: 'user', status: 'active', email: 'technical@sovereign.demo', password: 'tech123', displayName: 'Jordan Pike', avatarSeed: 'jordan', experienceLevel: 'advanced', riskProfile: 'balanced', analysisFocus: 'technical', defaultAccountCurrency: 'USD', favoriteCurrencies: ['GBP', 'USD'], favoritePairs: ['gbp-usd', 'eur-gbp'], dashboardPreset: 'compact', settings: defaultSettings({ dashboardMode: 'compact', chartDefaults: { chartMode: 'candlestick', timeframe: '6M', overlays: ['ma', 'rsi', 'macd'] }, favoriteCurrencies: ['GBP', 'USD'], favoritePairs: ['gbp-usd', 'eur-gbp'] }), watchlistIds: ['watch-5'], alertIds: [], noteIds: ['note-4'], portfolioId: 'portfolio-technical', savedSimulationIds: ['sim-3'], onboardingCompleted: true, verified: true, locked: false },
  { id: 'user-sim', role: 'user', status: 'active', email: 'simlab@sovereign.demo', password: 'sim123', displayName: 'Priya Sen', avatarSeed: 'priya', experienceLevel: 'advanced', riskProfile: 'aggressive', analysisFocus: 'simulation', defaultAccountCurrency: 'USD', favoriteCurrencies: ['AUD', 'JPY'], favoritePairs: ['aud-jpy', 'nzd-usd'], dashboardPreset: 'simulation-heavy', settings: defaultSettings({ dashboardMode: 'simulation-heavy', favoriteCurrencies: ['AUD', 'JPY'], favoritePairs: ['aud-jpy', 'nzd-usd'] }), watchlistIds: ['watch-6'], alertIds: ['alert-4'], noteIds: ['note-5'], portfolioId: 'portfolio-sim', savedSimulationIds: ['sim-4', 'sim-8'], onboardingCompleted: true, verified: true, locked: false },
  { id: 'user-portfolio', role: 'user', status: 'active', email: 'portfolio@sovereign.demo', password: 'book123', displayName: 'Marcus Hale', avatarSeed: 'marcus', experienceLevel: 'expert', riskProfile: 'balanced', analysisFocus: 'portfolio', defaultAccountCurrency: 'USD', favoriteCurrencies: ['USD', 'CAD', 'JPY'], favoritePairs: ['usd-cad', 'usd-jpy', 'eur-usd'], dashboardPreset: 'research-heavy', settings: defaultSettings({ dashboardMode: 'research-heavy', favoriteCurrencies: ['USD', 'CAD', 'JPY'], favoritePairs: ['usd-cad', 'usd-jpy', 'eur-usd'] }), watchlistIds: ['watch-7', 'watch-8'], alertIds: ['alert-5'], noteIds: ['note-6', 'note-7'], portfolioId: 'portfolio-centric', savedSimulationIds: ['sim-5'], onboardingCompleted: true, verified: true, locked: false },
  { id: 'user-locked', role: 'user', status: 'locked', email: 'locked@sovereign.demo', password: 'locked123', displayName: 'Rina Cole', avatarSeed: 'rina', experienceLevel: 'intermediate', riskProfile: 'balanced', analysisFocus: 'macro', defaultAccountCurrency: 'USD', favoriteCurrencies: ['USD'], favoritePairs: ['eur-usd'], dashboardPreset: 'compact', settings: defaultSettings(), watchlistIds: [], alertIds: [], noteIds: [], portfolioId: 'portfolio-locked', savedSimulationIds: [], onboardingCompleted: true, verified: true, locked: true },
  { id: 'user-unverified', role: 'user', status: 'unverified', email: 'unverified@sovereign.demo', password: 'verify123', displayName: 'Noah Bell', avatarSeed: 'noah', experienceLevel: 'beginner', riskProfile: 'conservative', analysisFocus: 'macro', defaultAccountCurrency: 'USD', favoriteCurrencies: ['USD'], favoritePairs: ['eur-usd'], dashboardPreset: 'compact', settings: defaultSettings({ mock2FAEnabled: true }), watchlistIds: [], alertIds: [], noteIds: ['note-9'], portfolioId: 'portfolio-unverified', savedSimulationIds: [], onboardingCompleted: false, verified: false, locked: false },
  { id: 'user-admin', role: 'admin', status: 'active', email: 'admin@sovereign.demo', password: 'admin123', displayName: 'Demo Inspector', avatarSeed: 'admin', experienceLevel: 'expert', riskProfile: 'balanced', analysisFocus: 'macro', defaultAccountCurrency: 'USD', favoriteCurrencies: ['USD', 'JPY', 'AUD'], favoritePairs: ['usd-jpy', 'aud-jpy', 'eur-usd'], dashboardPreset: 'research-heavy', settings: defaultSettings({ favoriteCurrencies: ['USD', 'JPY', 'AUD'], favoritePairs: ['usd-jpy', 'aud-jpy', 'eur-usd'] }), watchlistIds: ['watch-9', 'watch-10'], alertIds: [], noteIds: ['note-8'], portfolioId: 'portfolio-admin', savedSimulationIds: ['sim-6'], onboardingCompleted: true, verified: true, locked: false },
]

export const seedData: SeedData = {
  users,
  currencies: currencyProfiles,
  pairs,
  priceSeries,
  technicals,
  events,
  news,
  forecasts,
  strategies,
  scenarios,
  simulations,
  portfolios,
  positions,
  orders,
  journals,
  watchlist,
  alerts,
  notes,
}
