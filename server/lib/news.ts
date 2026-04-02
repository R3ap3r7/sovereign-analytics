import { createHash } from 'node:crypto'
import { XMLParser } from 'fast-xml-parser'
import type { Pool } from 'pg'
import type { EventType, ImpactLevel, MacroEvent, NewsItem, Pair } from '../../src/domain/types'
import { withTransaction } from './db'
import { config } from './config'

type FeedEntry = {
  title: string
  link: string
  description: string
  publisher: string
  publishedAt: string
}

type FeedSource = {
  id: string
  url: string
  source: string
  region: string
  currencyCodes: string[]
  includeAsEvents?: boolean
  maxAgeDays: number
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
})

const OFFICIAL_FEEDS: FeedSource[] = [
  {
    id: 'fed',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    source: 'Federal Reserve',
    region: 'United States',
    currencyCodes: ['USD'],
    includeAsEvents: true,
    maxAgeDays: 21,
  },
  {
    id: 'ecb',
    url: 'https://www.ecb.europa.eu/rss/press.xml',
    source: 'European Central Bank',
    region: 'Euro Area',
    currencyCodes: ['EUR'],
    includeAsEvents: true,
    maxAgeDays: 21,
  },
  {
    id: 'boe',
    url: 'https://www.bankofengland.co.uk/rss/news',
    source: 'Bank of England',
    region: 'United Kingdom',
    currencyCodes: ['GBP'],
    includeAsEvents: true,
    maxAgeDays: 21,
  },
  {
    id: 'boc',
    url: 'https://www.bankofcanada.ca/feed/?content_type=press',
    source: 'Bank of Canada',
    region: 'Canada',
    currencyCodes: ['CAD'],
    includeAsEvents: true,
    maxAgeDays: 21,
  },
]

const googleNewsUrl = (query: string) => {
  const params = new URLSearchParams({
    q: query,
    hl: config.googleNewsLanguage,
    gl: config.googleNewsRegion,
    ceid: config.googleNewsEdition,
  })
  return `https://news.google.com/rss/search?${params.toString()}`
}

const SEARCH_FEEDS: FeedSource[] = [
  {
    id: 'jpy',
    url: googleNewsUrl('JPY Bank of Japan forex when:7d'),
    source: 'Google News',
    region: 'Japan',
    currencyCodes: ['JPY'],
    maxAgeDays: 8,
  },
  {
    id: 'aud',
    url: googleNewsUrl('AUD Reserve Bank of Australia forex when:7d'),
    source: 'Google News',
    region: 'Australia',
    currencyCodes: ['AUD'],
    maxAgeDays: 8,
  },
  {
    id: 'nzd',
    url: googleNewsUrl('NZD Reserve Bank of New Zealand forex when:7d'),
    source: 'Google News',
    region: 'New Zealand',
    currencyCodes: ['NZD'],
    maxAgeDays: 8,
  },
  {
    id: 'chf',
    url: googleNewsUrl('CHF Swiss National Bank forex when:7d'),
    source: 'Google News',
    region: 'Switzerland',
    currencyCodes: ['CHF'],
    maxAgeDays: 8,
  },
  {
    id: 'cny',
    url: googleNewsUrl('CNY People Bank of China yuan forex when:7d'),
    source: 'Google News',
    region: 'China',
    currencyCodes: ['CNY'],
    maxAgeDays: 8,
  },
  {
    id: 'inr',
    url: googleNewsUrl('INR Reserve Bank of India rupee forex when:7d'),
    source: 'Google News',
    region: 'India',
    currencyCodes: ['INR'],
    maxAgeDays: 8,
  },
]

const toArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

const textOf = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return textOf(value[0])
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return (
      textOf(record['#text'])
      || textOf(record.__cdata)
      || textOf(record['dc:date'])
      || Object.values(record).map(textOf).find(Boolean)
      || ''
    )
  }
  return ''
}

const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

const stripHtml = (value: string) =>
  decodeHtml(value)
    .replace(/<a [^>]*>/gi, '')
    .replace(/<\/a>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeDate = (value: string) => {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString()
}

const slug = (prefix: string, seed: string) =>
  `${prefix}-${createHash('sha1').update(seed).digest('hex').slice(0, 12)}`

const inferImpact = (headline: string, source: FeedSource): ImpactLevel => {
  const text = headline.toLowerCase()
  if (/(rate|policy|cpi|inflation|gdp|payroll|employment|pmi|minutes|decision)/.test(text)) return 'high'
  if (source.includeAsEvents || /(speech|interview|statement|report|summary|deliberations)/.test(text)) return 'medium'
  return 'low'
}

const inferEventType = (headline: string, description: string): EventType => {
  const text = `${headline} ${description}`.toLowerCase()
  if (/(rate|policy rate|monetary policy|bank rate)/.test(text)) return 'rate decision'
  if (/(cpi|inflation)/.test(text)) return 'CPI'
  if (/\bgdp\b/.test(text)) return 'GDP'
  if (/(employment|payroll|labor|labour|jobs)/.test(text)) return 'employment'
  if (/trade/.test(text)) return 'trade balance'
  if (/manufacturing/.test(text)) return 'manufacturing PMI'
  if (/services/.test(text)) return 'services PMI'
  if (/intervention/.test(text)) return 'intervention concern'
  if (/(war|geopolitical|sanction|tariff)/.test(text)) return 'geopolitical incident'
  return 'speech'
}

const computeUrgency = (timestamp: string) => {
  const ageHours = Math.max(0, (Date.now() - Date.parse(timestamp)) / 36e5)
  if (ageHours <= 6) return 96
  if (ageHours <= 24) return 88
  if (ageHours <= 72) return 72
  if (ageHours <= 7 * 24) return 58
  return 44
}

const relatedPairIds = (pairs: Pair[], currencyCodes: string[]) =>
  pairs
    .filter((pair) => currencyCodes.includes(pair.baseCode) || currencyCodes.includes(pair.quoteCode))
    .map((pair) => pair.id)
    .slice(0, 6)

const parseFeedItems = (xml: string): FeedEntry[] => {
  const parsed = parser.parse(xml) as Record<string, unknown>
  const rssItems = toArray(((parsed.rss as Record<string, unknown> | undefined)?.channel as Record<string, unknown> | undefined)?.item)
  const rdfItems = toArray((parsed['rdf:RDF'] as Record<string, unknown> | undefined)?.item)
  const rawItems = rssItems.length ? rssItems : rdfItems
  return rawItems
    .map((item) => {
      const record = item as Record<string, unknown>
      const title = textOf(record.title).trim()
      const link = textOf(record.link || record.guid || record['@_rdf:about']).trim()
      const description = stripHtml(textOf(record.description)).trim()
      const publisher = textOf(record.source).trim()
      const publishedAt = normalizeDate(textOf(record.pubDate || record['dc:date'] || record.date))
      return { title, link, description, publisher, publishedAt }
    })
    .filter((item) => item.title && item.link)
}

const fetchFeed = async (source: FeedSource) => {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 SovereignAnalytics/1.0',
      Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
  })
  if (!response.ok) {
    throw new Error(`${source.id} feed failed with ${response.status}`)
  }
  return parseFeedItems(await response.text()).filter(
    (entry) => Date.now() - Date.parse(entry.publishedAt) <= source.maxAgeDays * 24 * 60 * 60 * 1000,
  )
}

const mapToRecords = (source: FeedSource, entry: FeedEntry, pairs: Pair[]) => {
  const pairIds = relatedPairIds(pairs, source.currencyCodes)
  const impact = inferImpact(entry.title, source)
  const eventId = source.includeAsEvents ? slug('evt', `${source.id}:${entry.link}`) : null
  const summary = entry.description || undefined
  const sourceName = entry.publisher || source.source

  const news: NewsItem = {
    id: slug('news', `${source.id}:${entry.link}`),
    headline: entry.title,
    source: sourceName,
    timestamp: entry.publishedAt,
    currencyCodes: source.currencyCodes,
    pairIds,
    eventIds: eventId ? [eventId] : [],
    sentiment: 'neutral',
    impact,
    summary,
    url: entry.link,
    evaluated: false,
  }

  const event: MacroEvent | null = eventId
    ? {
        id: eventId,
        title: entry.title,
        type: inferEventType(entry.title, entry.description),
        currencyCodes: source.currencyCodes,
        pairIds,
        region: source.region,
        impact,
        status: 'released',
        scheduledAt: entry.publishedAt,
        prior: '—',
        forecast: '—',
        actual: 'Released',
        urgency: computeUrgency(entry.publishedAt),
        summary,
        source: sourceName,
        sourceUrl: entry.link,
      }
    : null

  return { news, event }
}

export const syncNewsAndEvents = async (_database: Pool, pairs: Pair[]) => {
  const sources = [...OFFICIAL_FEEDS, ...SEARCH_FEEDS]
  const settled = await Promise.allSettled(sources.map(async (source) => ({ source, entries: await fetchFeed(source) })))

  const newsItems = new Map<string, NewsItem>()
  const eventItems = new Map<string, MacroEvent>()

  for (const result of settled) {
    if (result.status !== 'fulfilled') {
      console.error('News sync source failed:', result.reason)
      continue
    }
    for (const entry of result.value.entries) {
      const { news, event } = mapToRecords(result.value.source, entry, pairs)
      newsItems.set(news.id, news)
      if (event) eventItems.set(event.id, event)
    }
  }

  const newsRows = [...newsItems.values()].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
  const eventRows = [...eventItems.values()].sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt))

  await withTransaction(async (client) => {
    await client.query('delete from news')
    await client.query('delete from events')
    await client.query('delete from forecasts')

    for (const item of newsRows) {
      await client.query('insert into news (id, payload) values ($1, $2)', [item.id, item])
    }

    for (const item of eventRows) {
      await client.query('insert into events (id, payload) values ($1, $2)', [item.id, item])
    }
  })

  return { newsCount: newsRows.length, eventCount: eventRows.length }
}
