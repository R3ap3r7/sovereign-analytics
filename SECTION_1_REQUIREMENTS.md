# 1. Functional & Non-Functional Requirements

**Project:** Sovereign Analytics — AI Forex Risk Management Platform | **Roll No:** 24011101045

## Functional Requirements

- The system shall store historical EUR/USD price data in a relational PostgreSQL database with daily granularity, indexed by pair and date for efficient time-series retrieval.
- The system shall ingest and persist Forex economic calendar news events including currency, event name, actual value, forecast value, previous value, and impact classification.
- The system shall compute and store derived technical features — daily return, 10-day MA, 20-day MA, 20-day rolling volatility, and 14-day RSI — in a dedicated lstm_features table via a feature engineering pipeline.
- The system shall train an LSTM neural network on the engineered feature set to predict the next-day pip movement for EUR/USD using a 60-day sliding window input sequence.
- The system shall expose a REST API endpoint POST /simulate-risk that accepts trade parameters and returns a margin call probability computed via Monte Carlo simulation using the LSTM drift prediction.
- The system shall run 10,000 Monte Carlo simulation paths and return the margin call probability, risk classification (LOW / MEDIUM / HIGH), predicted pip move, margin required, and 200 sampled paths for chart rendering.
- The system shall expose a GET /health endpoint allowing the frontend to verify ML server availability before initiating simulation requests.
- The system shall support user authentication, session management, portfolio tracking, watchlists, alerts, notes, and journaling through the Express backend and PostgreSQL schema.
- The frontend shall display simulation results including a risk status badge, margin call probability percentage, stat cards, and a Monte Carlo path distribution chart.
- The system shall support an interactive SQL CLI tool for executing ad-hoc PostgreSQL queries against the live database with formatted tabular output.

## Non-Functional Requirements

- **Performance:** The /simulate-risk endpoint shall complete LSTM inference and 10,000-path Monte Carlo simulation within 3 seconds on local hardware with GPU acceleration enabled.
- **Scalability:** The feature engineering pipeline and database schema shall accommodate at minimum 10 years of daily OHLCV data (~2,500 rows) without schema modification.
- **Reliability:** The FastAPI server shall load the trained model into memory at startup so that inference does not reload model weights on every request.
- **Data Integrity:** All seed and feature engineering INSERT operations shall use ON CONFLICT DO NOTHING to ensure idempotency — re-running pipeline scripts shall not produce duplicate records.
- **Security:** Database credentials shall be stored exclusively in .env files excluded from version control; no credentials shall be hardcoded in source files.
- **Portability:** The ML backend shall be reproducible on any machine by running seed_db.py, feature_engineering.py, and train.py in sequence, with all dependencies declared in requirements.txt.
- **Maintainability:** The Python ML backend and Node.js Express backend shall operate as independent services sharing only the PostgreSQL database.
- **Usability:** The frontend risk simulation panel shall clearly communicate ML server online/offline status and disable the simulation button when the server is unreachable.
