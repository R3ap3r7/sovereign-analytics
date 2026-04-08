# 3. Relational Schema Mapping

**Project:** Sovereign Analytics — AI Forex Risk Management Platform | **Roll No:** 24011101045

## users
| Attribute | Data Type | Primary Key | Not Null | Unique |
| :--- | :--- | :--- | :--- | :--- |
| id | text | Yes | Yes | Yes |
| email | text | | Yes | Yes |
| password | text | | Yes | |
| display_name | text | | Yes | |
| role | text | | Yes | |
| risk_profile | text | | Yes | |
| settings | jsonb | | Yes | |

## pairs
| Attribute | Data Type | Primary Key | Not Null | Unique |
| :--- | :--- | :--- | :--- | :--- |
| id | text | Yes | Yes | Yes |
| payload | jsonb | | Yes | |

## pair_daily_rates
| Attribute | Data Type | Primary Key | Not Null | Unique |
| :--- | :--- | :--- | :--- | :--- |
| pair_id | text | Yes | Yes | |
| traded_on | date | Yes | Yes | |
| close_rate | numeric(18,8) | | Yes | |

## lstm_features
| Attribute | Data Type | Primary Key | Not Null | Unique |
| :--- | :--- | :--- | :--- | :--- |
| pair_id | text | Yes | Yes | |
| traded_on | date | Yes | Yes | |
| close_rate | numeric(18,8) | | | |
| daily_return | numeric(18,8) | | | |
| ma_10 | numeric(18,8) | | | |
| ma_20 | numeric(18,8) | | | |
| volatility_20 | numeric(18,8) | | | |
| rsi_14 | numeric(18,8) | | | |
| high_impact_eur_ratio | numeric(18,8) | | | |
| high_impact_usd_ratio | numeric(18,8) | | | |
| target | numeric(18,8) | | | |

## news
| Attribute | Data Type | Primary Key | Not Null | Unique |
| :--- | :--- | :--- | :--- | :--- |
| id | text | Yes | Yes | Yes |
| payload | jsonb | | Yes | |

## simulations
| Attribute | Data Type | Primary Key | Not Null | Unique |
| :--- | :--- | :--- | :--- | :--- |
| id | text | Yes | Yes | Yes |
| user_id | text | | Yes | |
| pair_id | text | | Yes | |
| created_at | timestamptz | | Yes | |
| updated_at | timestamptz | | Yes | |
| payload | jsonb | | Yes | |

## portfolios
| Attribute | Data Type | Primary Key | Not Null | Unique |
| :--- | :--- | :--- | :--- | :--- |
| id | text | Yes | Yes | Yes |
| user_id | text | | Yes | |
| payload | jsonb | | Yes | |

## positions
| Attribute | Data Type | Primary Key | Not Null | Unique |
| :--- | :--- | :--- | :--- | :--- |
| id | text | Yes | Yes | Yes |
| pair_id | text | | Yes | |
| status | text | | Yes | |
| payload | jsonb | | Yes | |

## user_sessions
| Attribute | Data Type | Primary Key | Not Null | Unique |
| :--- | :--- | :--- | :--- | :--- |
| token | text | Yes | Yes | Yes |
| user_id | text | | Yes | |
| expires_at | timestamptz | | Yes | |

## alerts
| Attribute | Data Type | Primary Key | Not Null | Unique |
| :--- | :--- | :--- | :--- | :--- |
| id | text | Yes | Yes | Yes |
| user_id | text | | Yes | |
| entity_type | text | | Yes | |
| entity_id | text | | Yes | |
| status | text | | Yes | |
| created_at | timestamptz | | Yes | |
| payload | jsonb | | Yes | |
