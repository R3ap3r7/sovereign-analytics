-- 1-5: Currencies and Pairs
SELECT code FROM currencies LIMIT 5;
SELECT id, payload->>'symbol' as symbol FROM pairs WHERE (payload->>'pipPrecision')::numeric > 0.0001;
SELECT COUNT(*) FROM news;
SELECT payload->>'headline' as title, payload->>'timestamp' as published_at FROM news ORDER BY (payload->>'timestamp')::timestamptz DESC LIMIT 5;
SELECT pair_id, AVG(close_rate) FROM pair_daily_rates GROUP BY pair_id;

-- 6-10: Pairs and Events
SELECT payload->>'symbol' as symbol, payload->>'displayPrecision' as precision FROM pairs ORDER BY (payload->>'eventRiskBase')::numeric DESC LIMIT 3;
SELECT id, payload->>'title' as title FROM events WHERE (payload->>'impactScore')::numeric > 60 OR (payload->>'urgency')::numeric > 60;
SELECT code, payload->>'name' as name FROM currencies WHERE (payload->>'riskScore')::numeric > 50;
SELECT e.payload->>'title' as title, e.payload->>'scheduledAt' as event_date, p.payload->>'symbol' as symbol FROM events e JOIN pairs p ON p.id = ANY(ARRAY(SELECT jsonb_array_elements_text(e.payload->'pairIds'))) LIMIT 5;
SELECT payload->>'source' as source, COUNT(*) as num_articles FROM news GROUP BY payload->>'source' ORDER BY num_articles DESC;

-- 11-15: History and News
SELECT * FROM pair_daily_rates ORDER BY traded_on DESC LIMIT 5;
SELECT COUNT(DISTINCT pair_id) FROM pair_daily_rates;
SELECT p.payload->>'symbol' as symbol, e.payload->>'title' as title FROM pairs p JOIN events e ON p.id = ANY(ARRAY(SELECT jsonb_array_elements_text(e.payload->'pairIds'))) LIMIT 5;
SELECT MAX(close_rate), MIN(close_rate) FROM pair_daily_rates WHERE pair_id = 'eur-usd';
SELECT id, payload->>'sentiment' as sentiment FROM news WHERE payload->>'sentiment' = 'negative' LIMIT 5;

-- 16-20: Users and Sessions
SELECT c.payload->>'name' as name, COUNT(p.id) as num_pairs FROM currencies c JOIN pairs p ON c.code = p.payload->>'baseCode' GROUP BY c.payload->>'name';
SELECT id, email, display_name FROM users LIMIT 5;
SELECT email, role FROM users ORDER BY id DESC LIMIT 10;
SELECT COUNT(*) FROM user_sessions;
SELECT display_name, role FROM users WHERE role = 'admin' OR role = 'pro';

-- 21-25: Portfolios and Features
SELECT id, user_id FROM portfolios WHERE (payload->>'balance')::numeric > 10000;
SELECT user_id, COUNT(*) FROM portfolios GROUP BY user_id;
SELECT id, payload->>'baseCode' as base FROM pairs WHERE (payload->>'displayPrecision')::numeric = 4;
SELECT * FROM lstm_features LIMIT 5;
SELECT pair_id, ma_20 FROM lstm_features WHERE ma_20 > 0 LIMIT 5;

-- 26-30: Admin and Events
SELECT * FROM admin_state;
SELECT payload->>'title' as title, payload->>'sentimentScore' as sentiment FROM events WHERE (payload->>'sentimentScore')::numeric > 0.5 ORDER BY (payload->>'scheduledAt')::timestamptz ASC LIMIT 5;
SELECT code, payload->>'baseRate' as rate FROM currencies ORDER BY (payload->>'baseRate')::numeric DESC LIMIT 5;
SELECT id, pair_id, status FROM positions WHERE status = 'open' LIMIT 5;
SELECT payload->>'portfolioId' as portfolio_id, SUM((payload->>'pnl')::numeric) as total_pnl FROM positions GROUP BY payload->>'portfolioId';

-- 31-35: Orders and Strategies
SELECT id, pair_id FROM orders WHERE payload->>'type' = 'limit' AND payload->>'status' = 'pending' LIMIT 5;
SELECT id, payload->>'name' as name FROM strategies LIMIT 5;
SELECT payload->>'name' as name, payload->>'timeframe' as timeframe FROM strategies WHERE payload->>'riskLevel' = 'high';
SELECT COUNT(*) FROM scenarios;
SELECT id, payload->>'name' as name, payload->>'triggerEvent' as trigger FROM scenarios LIMIT 5;

-- 36-40: Watchlist and Alerts
SELECT user_id, entity_id FROM watchlist WHERE entity_type = 'pair' LIMIT 5;
SELECT COUNT(*) FROM alerts WHERE status = 'active' OR status = 'triggered';
SELECT user_id, payload->>'targetPrice' as target FROM alerts ORDER BY created_at DESC LIMIT 5;
SELECT id, pair_id, created_at FROM journals LIMIT 5;
SELECT payload->>'title' as title FROM notes WHERE pinned = true LIMIT 3;

-- 41-45: Simulations and Aggregates
SELECT id, pair_id, user_id FROM simulations LIMIT 5;
SELECT pair_id, payload->>'capital' as capital FROM simulations WHERE payload->>'direction' = 'long' LIMIT 5;
SELECT AVG((payload->>'eventRiskBase')::numeric) FROM pairs;
SELECT SUM((payload->>'baseRate')::numeric) FROM currencies;
SELECT MAX((payload->>'urgency')::numeric) FROM events;

-- 46-50: Advanced filters
SELECT payload->>'headline' as title FROM news WHERE payload->>'sentiment' = 'bullish' LIMIT 5;
SELECT COUNT(*) FROM lstm_features WHERE pair_id = 'EURUSD' OR pair_id = 'eur-usd';
SELECT id, payload->>'symbol' as symbol FROM pairs WHERE id = 'gbp-usd';
SELECT payload->>'title' as title FROM events WHERE payload->>'title' ILIKE '%rate%' LIMIT 5;
SELECT COUNT(*) as exact_count FROM news WHERE payload->>'headline' ILIKE '%fomc%';
