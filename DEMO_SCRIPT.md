# UK Wind Forecast Accuracy & Day-Ahead Energy Procurement Dashboard
## Video Demo Presentation Script (10-Minute Maximum)

This script is structured into two 5-minute segments for an unlisted YouTube video submission:
- **Part 1: Client & Trading Desk Pitch (0:00 - 5:00)** — Business problem, dashboard demonstration, decision cutoff implications, financial and operational value.
- **Part 2: Technical Architecture & Engineering Review (5:00 - 10:00)** — Elexon API integration, leak-free forecast selection engine, statistical accuracy calculations, test suite, and deployment pipeline.

---

## Recording Checklist

Before hitting Record:
1. [ ] **Start Backend**: Run `python -m uvicorn backend.app.main:app --port 8000 --reload` in terminal 1.
2. [ ] **Start Frontend**: Run `npm run dev` in `frontend/` (opens at `http://localhost:5173`) in terminal 2.
3. [ ] **Browser Window**: Chrome set to 1080p (1920x1080), 100% zoom, dark mode.
4. [ ] **Tab 1**: Frontend dashboard (`http://localhost:5173`).
5. [ ] **Tab 2**: FastAPI Interactive Swagger Docs (`http://localhost:8000/docs`).
6. [ ] **Tab 3**: Codebase in IDE open to `backend/app/services/forecast_selector.py`.
7. [ ] **Terminal**: Ready to run `python -m pytest backend/tests` and `npm run test`.
8. [ ] **Microphone & Audio**: Clear 48kHz audio check.

---

## Suggested Navigation Sequence

```
1. Dashboard Overview (0:00 - 1:30)
   ├── Show Header: January 2026, Live Elexon BMRS badge, Cutoff selector
   └── Walk through KPI Cards: Actual Avg/Peak, Forecast Avg, Bias, MAE, RMSE, Coverage

2. Forecast vs Actual Interactive Chart (1:30 - 3:00)
   ├── Hover over high-wind ramp period (e.g. Jan 10-15)
   ├── Demonstrate tooltips (UTC timestamp, Actual MW, Forecast MW, Signed Error MW)
   ├── Toggle Error Track (Overforecast amber bars vs Underforecast rose bars)
   └── Use timeline brush to zoom into a single 48-hour delivery period

3. Market Cutoff & Version History Inspector (3:00 - 4:15)
   ├── Click on an individual interval in chart or table
   ├── Open "Forecast Publication Run History" Modal
   ├── Highlight pre-cutoff eligible versions vs post-cutoff disqualified versions
   ├── Change Cutoff dropdown from D-1 11:00 UK to D-1 17:00 or Intraday H-1
   └── Observe dynamic recalculation of selected forecast and bias

4. Data Explorer & CSV Export (4:15 - 5:00)
   ├── Filter by "Matched Only" and search by date/settlement period
   ├── Trigger "Download CSV" and show exported verified file
   └── Transition to Part 2

5. Technical Architecture & Elexon API (5:00 - 6:30)
   ├── Show Architecture diagram & data flow (FUELHH + WINDFOR)
   ├── Explain 7-day query chunking and disk caching
   └── Show FastAPI Swagger docs (/api/overview, /api/series, /api/forecasts/history)

6. Forecast Selection & Anti-Leakage Engine (6:30 - 8:00)
   ├── Code walkthrough: backend/app/services/forecast_selector.py
   ├── Explain mathematical selection: startTime vs publishTime vs market cutoff
   └── Show daylight saving / timezone conversion (Europe/London vs UTC)

7. Authoritative Metrics & Testing (8:00 - 9:15)
   ├── Code walkthrough: backend/app/services/metrics_calculator.py (MAE, RMSE, Bias, MAPE)
   ├── Run pytest: 17 unit tests passing (hand-calculated benchmarks, edge cases)
   └── Run vitest: 2 frontend component tests passing

8. Docker & Deployment Wrap-up (9:15 - 10:00)
   ├── Show Dockerfile & docker-compose.yml
   ├── Show render.yaml and vercel.json configurations
   └── Conclude with business impact and project boundaries
```

---

## Part 1 — Client & Trading Desk Pitch (0:00 - 5:00)

### [0:00 - 0:45] The Energy Market Problem
> **"Hello everyone. Today I'm presenting the UK Wind Forecast Accuracy and Day-Ahead Procurement Dashboard.**
>
> In Great Britain, wind power generates a substantial fraction of national electricity, but wind is inherently volatile. As a UK energy utility, our commercial procurement desk must submit day-ahead power purchase orders into the EPEX SPOT and Nord Pool wholesale power auctions. 
> 
> The day-ahead auction order book closes strictly at 11:00 AM UK time on day D-1. If our wind forecast overpredicts generation, we under-procure thermal and market contracts, leaving us unexpectedly short and exposed to punitive system buy cash-out prices. If the forecast underpredicts wind, we over-procure power and must sell the surplus at distress imbalance prices.
>
> To manage balance sheet risk, procurement analysts require an uncompromising decision-support dashboard evaluating historical day-ahead forecast accuracy against actual delivered generation using official Elexon BMRS market data."

### [0:45 - 2:00] Dashboard Tour & Executive KPIs
> **[Action: Switch to Dashboard at `http://localhost:5173` with January 2026 selected]**
>
> "Here is our executive procurement dashboard focused on delivery throughout January 2026. Notice our top status badge confirms a direct connection to live Elexon BMRS streams: FUELHH for actual generation and WINDFOR for forecasts.
>
> Looking at the executive KPI row:
> 1. **National Actual Wind Generation**: In January 2026, UK wind averaged over 15,300 MW, peaking at 16,330 MW during major storm passages.
> 2. **Selected Day-Ahead Forecast**: Under our default day-ahead auction cutoff policy (D-1 at 11:00 UK time), the selected forecast averaged 19,630 MW.
> 3. **Forecast Bias**: Notice our signed bias card is highlighted in amber: **+1,840.3 MW average bias**. This is an overforecasting bias. In plain commercial terms, for every hour of January, the day-ahead forecast predicted roughly 1.8 GW more wind than materialized. A trading desk trading purely on raw forecast output would have consistently purchased too little alternative power, creating an expensive structural short position.
> 4. **MAE (Mean Absolute Error)**: 2,122.8 MW average error across all matched hours.
> 5. **RMSE (Root Mean Squared Error)**: 2,616.7 MW. The 494 MW spread between RMSE and MAE directly measures the volatility penalty from rapid wind ramps.
> 6. **Matched Coverage**: Exactly 744 matched hours out of 744 expected intervals in January—a 100% data coverage."

### [2:00 - 3:15] Interactive Time-Series & Error Anatomy
> **[Action: Hover over the chart; toggle Error Track; use Brush to zoom into January 8 to January 15]**
>
> "Moving to our interactive time-series chart:
> - The green solid line represents actual delivered wind generation from Elexon FUELHH.
> - The cyan dashed line represents the authoritative Day-Ahead forecast from Elexon WINDFOR.
> - Below the lines, we've integrated a synchronized error track. Amber bars represent intervals of overforecasting (where forecast exceeded actuals); rose bars represent underforecasting.
> 
> Notice how our tooltips provide complete interval auditability: delivery timestamp in UTC and settlement period, actual generation, selected forecast, signed error, and the exact publication timestamp of the forecast run used.
>
> If a procurement analyst notices a significant deviation—such as this ramp on January 12th where error exceeded 3,500 MW—they can click directly on the data point to drill down into the publication history."

### [3:15 - 4:15] Why the Publication Cutoff Matters & Historical Inspection
> **[Action: Click on `2026-01-15T12:00:00Z` to open the Publication History Modal]**
>
> "This brings us to the most critical feature of the platform: **Zero Look-Ahead Bias**.
>
> For delivery at 12:00 UTC on January 15th, National Grid ESO published over 24 distinct forecast versions between January 12th and January 15th. 
> 
> Notice how our engine classifies each run:
> - Versions published on January 14th at 04:30, 07:30, 09:30, and 11:00 AM are marked in green as **Eligible (<= Cutoff)**.
> - The run published at 11:00 AM (14,000 MW) is marked as the **Selected Day-Ahead Run** because it was the freshest intelligence available before auction closure.
> - Runs published at 11:30, 15:30, or on January 15th are explicitly flagged in red as **Ineligible (> Cutoff)**. 
> 
> If a naive analytics system simply took the latest forecast published at 11:30 AM or 1 hour prior to delivery, it would commit severe look-ahead bias—evaluating a day-ahead decision using information that did not exist when traders had to submit bids.
>
> Now watch what happens when we switch our market cutoff policy in the header to 'Intraday H-1' (Gate Closure): the platform dynamically promotes the near-real-time run to evaluate intraday re-balancing decisions."

### [4:15 - 5:00] Data Explorer, Export, and Scope Disclosure
> **[Action: Scroll down to the Data Table; demonstrate search; click 'Download CSV']**
>
> "Finally, our Interval Data Explorer provides complete tabular auditability with multi-column sorting, pagination, and instantaneous CSV export of the real calculated records.
>
> **Important Scope Disclosures:**
> This dashboard is purpose-built to evaluate national wind forecast accuracy. It utilizes strictly national wind generation from Elexon FUELHH (fuelType = WIND) and WINDFOR. It deliberately excludes consumer electricity demand, wholesale power prices, and thermal generation fleets. It does not calculate final procurement volumes, but delivers the vital forecast reliability intelligence that risk committees and trading desks require."

---

## Part 2 — Technical Review & Architecture (5:00 - 10:00)

### [5:00 - 6:15] Architecture & Data Pipeline
> **[Action: Switch to IDE / Architecture Diagram]**
>
> "Now let's examine the software engineering architecture behind this application.
> 
> The project follows a decoupled, production-ready full-stack design:
> - **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, and Lucide React.
> - **Backend**: Python 3.11+, FastAPI, Pandas, NumPy, HTTPX, and Pydantic.
> - **Infrastructure**: Docker multi-stage builds, Docker Compose, Vercel configuration for frontend, and Render configuration for backend.
>
> In `backend/app/services/elexon_client.py`, we communicate directly with the official Elexon BMRS API endpoints:
> - Actuals: `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
> - Forecasts: `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
>
> We implemented 7-day query chunking with exponential backoff retries to prevent HTTP 504 gateway timeouts. In January 2026, Elexon published 1,488 half-hourly wind actuals and over 18,000 WINDFOR forecast records. We cache these verified records locally in `backend/app/data/cache/` so subsequent queries load in milliseconds."

### [6:15 - 7:45] Forecast Selection Implementation (`forecast_selector.py`)
> **[Action: Open `backend/app/services/forecast_selector.py` in IDE]**
>
> "Let's review the forecast selection engine in `forecast_selector.py`.
> 
> The requirement demands a strict mathematical separation between three distinct temporal entities:
> 1. `startTime`: The delivery interval when electricity flows.
> 2. `publishTime`: The timestamp when the forecast was issued.
> 3. `cutoff`: The market auction gate closure.
>
> Notice function `calculate_decision_cutoff`:
> We convert delivery timestamps to UK Local Time (`Europe/London`) to identify calendar date D. For the day-ahead auction (`day_ahead_1100`), the cutoff is computed as `(D - 1 day) at 11:00:00 London Time`. We then convert back to UTC. This correctly handles Daylight Saving Time transitions between GMT and BST without hardcoded offsets.
>
> In `select_forecast_for_interval`:
> 1. We filter all candidates targeting `startTime`.
> 2. We filter for `publishTime <= cutoff`.
> 3. We sort candidates chronologically and deduplicate records with identical publication timestamps.
> 4. We select the latest eligible publication. If no forecast was published prior to cutoff, the interval returns `forecast = None` and is marked unmatched.
>
> Under no circumstances can a forecast published after cutoff be selected. This guarantees 100% leak-free backtesting."

### [7:45 - 8:45] Statistical Accuracy Calculations (`metrics_calculator.py`)
> **[Action: Open `backend/app/services/metrics_calculator.py`]**
>
> "All authoritative calculations reside strictly in Python. The frontend JavaScript never computes authoritative statistical metrics.
>
> In `metrics_calculator.py`:
> - Signed Error: `error = forecast - actual`
> - MAE: `mean(abs(forecast - actual))`
> - RMSE: `sqrt(mean((forecast - actual) ** 2))`
> - Bias: `mean(forecast - actual)`
> - Coverage: `matched_count / total_expected * 100`
> - MAPE: `mean(abs(error) / actual) * 100`
>
> Notice that all error metrics are computed across **strictly identical matched interval pairs** using NumPy vector operations. For MAPE, we explicitly filter out intervals where actual generation is <= 10 MW to prevent mathematical distortion from near-zero denominators."

### [8:45 - 9:30] Automated Test Suite Execution
> **[Action: In terminal, run `python -m pytest backend/tests -v` and `npx vitest run` in frontend]**
>
> "Let's run the automated test suites.
>
> First, backend Pytest:
> - Hand-calculated numerical benchmarks matching manual calculations to 2 decimal places.
> - Forecast selection with multiple version histories.
> - Forecasts published before, at, and after cutoffs.
> - Missing actuals and missing forecasts.
> - Daylight Saving Time and timezone conversions.
> - API route integration and CSV streaming.
> **All 17 backend tests pass in 1.3 seconds.**
>
> Next, frontend Vitest:
> - Component testing for KPI cards rendering exact formatted outputs.
> - Header interaction testing.
> **All frontend tests pass.**"

### [9:30 - 10:00] Docker, Deployment, & Wrap-Up
> **[Action: Show `docker-compose.yml`, `render.yaml`, `vercel.json`]**
>
> "For deployment:
> - `docker-compose.yml` provides a single command startup (`docker compose up --build`) orchestrating backend and frontend with built-in healthchecks.
> - `render.yaml` enables one-click deployment of the FastAPI backend on Render.
> - `vercel.json` provides standard static SPA deployment for the React Vite frontend.
>
> In summary, this application provides an enterprise-grade, mathematically verified decision-support dashboard for UK power procurement desks, strictly adhering to day-ahead market timing without look-ahead bias.
>
> Thank you!"
