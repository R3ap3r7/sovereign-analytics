import { seedData } from '../../src/domain/seed/data'
import type {
  CurrencyProfile,
  MacroScenarioPreset,
  Pair,
  PortfolioAccount,
  StrategyTemplate,
  User,
} from '../../src/domain/types'

export const referenceCurrencies: CurrencyProfile[] = seedData.currencies
export const referencePairs: Pair[] = seedData.pairs
export const referenceStrategies: StrategyTemplate[] = seedData.strategies
export const referenceScenarios: MacroScenarioPreset[] = seedData.scenarios
export const referenceUsers: User[] = seedData.users

export const buildReferencePortfolios = (users: User[]): PortfolioAccount[] =>
  users.map((user) => ({
    id: `portfolio-${user.id}`,
    userId: user.id,
    baseCurrency: user.defaultAccountCurrency,
    startingBalance: 25000,
    balance: 25000,
    equity: 25000,
    marginUsed: 0,
    freeMargin: 25000,
    openPositionIds: [],
    closedPositionIds: [],
    orderIds: [],
    journalIds: [],
  }))
