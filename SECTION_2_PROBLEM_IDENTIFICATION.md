# 2. Problem Identification

**Project:** Sovereign Analytics — AI Forex Risk Management Platform | **Roll No:** 24011101045

## Problem Domain
Retail Forex traders routinely face catastrophic margin calls due to inadequate pre-trade risk assessment. Existing platforms provide static calculators that compute margin requirements based solely on current price and leverage, with no probabilistic modelling of adverse price movements. Traders entering positions without understanding the distribution of possible outcomes are systematically exposed to ruin risk that could be quantified and communicated before trade execution.

## Problem Statement
Design and implement a database-backed AI risk management platform that ingests historical Forex price and economic news data into a relational schema, engineers predictive features via SQL and Python, trains an LSTM model to forecast next-day pip movement, and delivers a probabilistic margin call risk score to end users through a REST API integrated with a React frontend dashboard.

## Why Existing Solutions Are Insufficient
Standard margin calculators are deterministic — they tell a trader how much margin is required but not the probability that the market will move against them sufficiently to trigger that margin call. No freely available tool combines historical pattern learning (LSTM), stochastic simulation (Monte Carlo), and real-time user parameterisation in a single integrated pipeline accessible through a consumer web interface.

## Database Management Challenges Addressed
The project addresses several core DBMS problems: efficient storage and retrieval of large time-series datasets using composite primary keys and descending indexes; joining heterogeneous data sources (price tables and JSONB news event documents) for feature computation; maintaining referential integrity between lookup tables (pairs) and dependent time-series tables (pair_daily_rates, lstm_features); and designing an idempotent seeding pipeline that supports reproducible database initialisation from raw CSV sources.

## Scope and Constraints
The system is scoped to EUR/USD daily data spanning 2018–2025 (approximately 2,500 trading days). It operates entirely on local infrastructure with no cloud dependency, using PostgreSQL as the relational engine, Python/TensorFlow for ML, and FastAPI as the inference server. The Monte Carlo simulation runs 10,000 paths using LSTM-predicted drift and historically derived volatility. The system is not designed for live trading execution and does not claim to provide financial advice.
