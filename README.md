# AtlasAgri

A mobile-first climate-smart farming prototype for Morocco. A farmer picks a field on an interactive
map, sees climate and soil context for the surrounding agricultural area, optionally attaches a soil
laboratory report, and gets a plain-language analysis: what the land needs, why, how to act, and what
to grow next. The interface is fully translated into English, French and Arabic (with RTL layout).

**This is a demonstration.** Climate, soil, crop-suitability, supplier and laboratory values are
simulated. They resemble the formats of NASA POWER, GPM IMERG, SMAP, FAO GAEZ and a soil lab, but
they are not live measurements and must not guide real farm decisions.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build          # production build
npm run lint           # oxlint
npm run check:keys      # en/fr/ar dictionary parity + every used key exists
npm run check:analysis  # build the report in 3 languages, with and without a lab report
npm run check:rotations # recompute rotation water/N from crops and cycle length
npm run smoke           # server-render the main screens for runtime/data errors
```

Shareable links can pin a language at load time: `/?lang=ar`, `#/dashboard/map?loc=ouled-ayad&lang=fr`.
The choice is then persisted in `localStorage`.

## The demo flow

1. The landing page opens the platform with a seasonal rainfall strip and a plain explanation of the
   four data sources.
2. **Map** is the home screen. Use the browser location button, tap the map to place the farm, or pick
   one of the nearby *agricultural study areas* (not city centres). The farmer's reference pin and the
   selected study area use different markers.
3. Switch map layers: rainfall, temperature, soil moisture and crop suitability. Each layer has
   coloured grid cells, a legend and a note that cells are simulated climate zones, not field borders.
   A separate toggle shows demonstration suppliers.
4. **My farm** explains where the numbers come from, shows the optional PDF slot, and runs the analysis.
   The run takes about ten seconds and walks through five named stages. It works without a PDF; with a
   PDF it uses sample laboratory values and says so explicitly instead of pretending to parse the file.
5. The report answers four questions in plain language — **what / why / how / solution** — then shows
   the farm score, soil indicators with target ranges, crop cards, ordered actions, a suggested
   rotation, and the inputs and confidence behind the result.
6. **Weather** shows local conditions, rainfall against a normal year, soil moisture and findings, all
   titled by meaning rather than API name.
7. **Crops** lists suitability cards with water need, season, soil benefit, nitrogen fixation and risks.
8. **Rotations** compares the current rotation with alternatives A and B, including a month-by-month
   timeline and a recommendation.
9. **Suppliers** lists fictional nearby seed, fertiliser, irrigation, supply and service providers with
   category, approximate distance and demo contact details, clearly marked unverified.
10. The chat helper answers questions about water, soil and crops using the same loaded values. Where
    the browser supports speech recognition, the microphone shows a transcript before sending;
    otherwise it explains that voice input is unavailable.

## What is simulated

| Screen | Source in this demo |
| --- | --- |
| Temperature | `src/data/nasa-power.json` |
| Rainfall | `src/data/gpm-imerg.json` |
| Soil moisture | `src/data/smap.json` |
| Crop suitability | `src/data/gaez.json` |
| Rotations | `src/data/rotations.json` |
| Agricultural study areas | `src/data/study-areas.json` |
| Suppliers | `src/data/suppliers.json` (fictional listings) |
| Soil report example | `public/soil-report-beni-mellal.pdf` |
| Built-in sample lab values | `src/lib/lab.js` |

There are five base climate datasets (Béni Mellal, Meknès, Settat, Marrakech, Errachidia). The 17 study
areas borrow the dataset of their region through a `dataKey`. Months are relabelled to the current year
at load time, so the interface shows the live year (2026 at the time of writing) while the values remain
simulated samples.

The mock API layer in `src/lib/api.js` adds realistic delays so loading, empty and error states can be
tested. Errachidia's rainfall request fails once on purpose, to exercise the retry state. The analysis
itself is composed locally by `src/lib/analysis.js` from the loaded records and optional lab values, so
it re-renders correctly when the language changes and works for every study area.

## Demonstration assumptions

These are explicit screening assumptions, not measurements or recommendations. They live in
`src/lib/assumptions.js` so they can be replaced in one place.

- **Seasonal water gap** = crop water need − min(need, 0.70 × rain in the crop's own season).
  Gross irrigation = net gap ÷ 0.85, and 1 mm over 1 ha = 10 m³/ha. Stored soil water is not modelled.
- **Legume-N credit** = max(0, legume N fixed by the alternative − legume N fixed by the current
  rotation) × 0.30. The credit is valued at an assumed 8 MAD/kg N. It is not a market price or a
  fertilizer recommendation.
- **Rotation nitrogen** is the crop-specific fixation total divided by the actual number of years in
  the cycle. A four-year cycle is not divided by three.
- **Soil organic matter** uses a 2% working lower bound for this demo's guideline bands. It is not a
  Moroccan legal threshold or a laboratory rating.
- **GPM IMERG** is described as Final V07, 0.1° (about 11 km), with a 2001–2020 (20-year) normal.
  **SMAP** is described as L-band radiometer observations assimilated into a land-surface model, not
  as radar. All displayed values remain simulated.

## Project layout

```text
src/
  components/    shell, map, farm, weather, crops, rotations, suppliers, chat
  data/          simulated NASA/FAO/lab/supplier data and photo credits
  i18n/          en.js, fr.js, ar.js dictionaries
  lib/           mock API, analysis builder, geo, layers, places, lab, formatting
  pages/         landing and dashboard
  i18n.jsx       language provider, `t()`, `pick()`, `number()`
public/
  crops/         crop photos (Wikimedia Commons, credits in src/data/photo-credits.json)
  soil-report-beni-mellal.pdf
```

## Backend-dependent work

Real deployment still needs live data ingestion and accounts: authenticated soil-lab uploads and OCR,
NASA POWER / GPM IMERG / SMAP / FAO GAEZ API clients with caching, a verified supplier directory with
geocoding and opening hours, and persistence for farms, analyses and language preferences. The current
app is a complete front-end prototype with deterministic mock data behind the same seams.
