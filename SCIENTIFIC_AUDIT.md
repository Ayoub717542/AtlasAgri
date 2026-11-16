# AtlasAgri — scientific-accuracy audit

This is the closing report for the accuracy review of the AtlasAgri prototype. It records what was
checked, what the numbers trace back to, what was corrected, and what remains a known limitation. It
does not claim the app is scientifically validated: every value in the running demo is simulated.

The review covers the whole front end, and adds two pieces of work done after the first pass: the
map-layer georeferencing fix and the 14-day weather outlook.

## 1. Scope and method

- **Scope.** The analysis builder, the demonstration assumptions, the soil guideline bands, the
  rotation and nitrogen arithmetic, the map layers, and the weather outlook.
- **Method.** Read each calculation at its source, recompute it by hand, and check that the interface
  only shows what the calculation produced. The numbers are then re-checked by scripts that run in CI
  (`npm run check:analysis`, `check:rotations`, `check:map`, `check:forecast`, `check:keys`).
- **Rule applied throughout.** A demonstration assumption is labelled as one, and a screening band is
  never presented as an agronomic or legal standard. Where a real dataset is not connected, the value
  is marked simulated.

## 2. Verified calculations

Every number below was recomputed by hand from the source data and matches the interface.

### 2.1 Seasonal water balance

Source: `src/lib/assumptions.js` → `irrigationGap()`, called from `src/lib/analysis.js`.

| Step | Formula | Beni Mellal example |
| --- | --- | --- |
| Crop water need | from the crop record | 550 mm |
| Rain in the crop's own season | sum of `precip` for the crop's season months | 363 mm |
| Effective rain | `min(need, 0.70 × seasonRain)` | `min(550, 254) = 254 mm` |
| Net irrigation gap | `max(0, need − effectiveRain)` | 296 mm |
| Gross irrigation | `net ÷ 0.85` | 348 mm |
| Volume | `roundTo(gross × 10, 10)` m³/ha | 3,480 m³/ha |

The rain term uses **the crop's own season**, not the calendar year. This was one of the corrections
(§3.1). The 70% effective-rain share and the 85% application efficiency are labelled demonstration
assumptions in the interface and in `assumptions.js`.

### 2.2 Rotation nitrogen and fertiliser saving

Source: `assumptions.js` → `nitrogenCreditKg()`, `nitrogenSavingsMad()`; totals in
`src/data/rotations.json`.

- `nitrogenCreditKg = max(0, altFixedN − currentFixedN) × 0.30`.
- `nitrogenSavingsMad = round(credit × 8 MAD/kg)`.
- The `max(0, …)` guard means a rotation that fixes **less** nitrogen than the current one can never
  be shown as a saving (§3.2).
- The crop-specific fixation total is divided by the **actual number of years in the cycle**, not a
  fixed three (§3.3).

Example: an alternative fixes 12 kg/ha more than the current rotation → credit 12 kg/ha → saving
96 MAD/ha. Both figures appear in the report and reconcile with the data file.

### 2.3 Land score

Source: `analysis.js`. Starts at 78, then applies fixed deductions for low organic matter, low
nitrogen, low phosphorus, high pH, salinity and high calcium; adjusts for the rainfall departure and
hot days; subtracts for very dry soil; and clamps to 30–92. The score is a demonstration index built
from those rules, and is labelled as such — it is not a soil-quality standard.

### 2.4 Soil guideline bands

Source: `analysis.js` → `SOIL_META` and `RULES`. Seven indicators (pH, organic matter, nitrogen,
phosphorus, potassium, salinity, calcium) each have a broad field-crop band and a low/good/high rule.
The bands are described in the interface as demonstration guidelines, and the 2% organic-matter lower
bound is a working value for this demo, not a Moroccan legal threshold or a lab rating (§3.4).

### 2.5 Climate facts

Source: `analysis.js`. Annual rain total against the 2001–2020 normal, days above the hot-day
threshold, and the driest root-zone month. Each is summed or reduced directly from the loaded monthly
records, and the finding text is generated from the same values.

### 2.6 Map layer georeferencing

Source: `src/lib/geo.js`, `src/lib/layers.js`, `src/components/MapPage.jsx`, `FarmMap.jsx`.

Each layer now draws its dataset's **native grid cells** and nothing finer:

| Layer | Dataset | Native cell | Source label |
| --- | --- | --- | --- |
| `rain` | NASA GPM IMERG Final V07 | 0.1° × 0.1° (about 10–11 km) | NASA GPM IMERG Final V07 |
| `temp` | NASA POWER | 0.5° × 0.625° (about 50 km) | NASA POWER |
| `soil` | NASA SMAP L4 (SPL4SMGP.008) | 9 km EASE-Grid 2.0 | SMAP L4 |
| `crop` | FAO GAEZ v5 | 30 arc-sec (about 1 km) | FAO GAEZ |

- The SMAP grid is computed with the exact EASE-Grid 2.0 definition (WGS84 ellipsoidal cylindrical
  equal-area, `lat_ts = 30°`, cell 9008.055210146 m, origin X = −17367530.4451615, Y = 7314540.8306386,
  3856 × 1624). It is implemented without `proj4`.
- Cells are deduplicated by bounds, and the selected study area's cell is highlighted while the others
  are drawn faintly.
- **A cell is never subdivided to look finer.** The overlay card states the source and the cell size,
  and the value shown is the simulated regional value for the demonstration area — not a per-cell
  measurement.

`scripts/check-map.mjs` asserts the four native grids, the 17 demonstration areas and the absence of
cell subdivision.

### 2.7 Weather outlook

Source: `src/lib/forecast.js`, loaded by `loadForecast()` in `src/lib/api.js`.

- 14 days are generated deterministically from the same monthly demonstration records: the day's
  temperature follows the month's normal, rain follows the month's total, and soil water starts from
  the month's root-zone value. The same region and date always give the same outlook, so the panel
  never flickers between renders.
- **This week** = the next 7 days including today; **next week** = days 8–14. `check:forecast`
  verifies the 7 + 7 split and that the week sums come from the correct slices.
- The three status cards use the screening bands below. They are demo screening bands, stated in the
  UI, not agronomic standards.

| Card | Low | Moderate | High | Very high |
| --- | --- | --- | --- | --- |
| Heat (peak afternoon this week) | < 28 °C | 28–34 °C | 35–39 °C | ≥ 40 °C |
| Water pressure | soil ≥ 20%, or ≥ 15% with ≥ 5 mm rain | soil ≥ 10%, or ≥ 5 mm rain | below both | — |
| Rain next week | < 5 mm | 5–20 mm | > 20 mm | — |

`scripts/check-forecast.mjs` checks the day count, determinism, the week split, value ranges, that
each day stays close to its month's record, and every threshold boundary.

## 3. Corrected issues

1. **Seasonal water balance.** The irrigation ledger compared crop need with the whole-year rainfall.
   It now uses rain that falls **during the crop's own season**, which is the agronomically relevant
   window. (Fixed and re-verified; §2.1.)
2. **Fertiliser saving guard.** A rotation with less fixation than the current one could previously be
   shown as a saving. The credit is now `max(0, alt − current)`, so a loss is never counted as a
   saving. (§2.2.)
3. **Rotation nitrogen divisor.** Fixation totals were divided by a fixed three years. They are now
   divided by the **actual cycle length**. (§2.2.)
4. **Soil organic matter wording.** The 2% figure is now described as a working demonstration lower
   bound, not a Moroccan legal threshold or a laboratory rating. (§2.4.)
5. **SMAP wording.** SMAP is described as L-band radiometer observations assimilated into a
   land-surface model — not as radar.
6. **GPM wording.** GPM IMERG is described as Final V07, 0.1° (about 11 km), with a 2001–2020
   (20-year) normal.
7. **Shared assumptions.** Effective-rain share, irrigation efficiency, organic-matter bound,
   nitrogen-credit share and the N price now live in one file, `src/lib/assumptions.js`, so they can
   be replaced in a single place.
8. **Map false precision (this pass).** The old overlays drew decorative subdivided cells from a noise
   function, which implied a resolution the data does not have. They now draw each dataset's native
   grid only, with the source and cell size shown. (§2.6.)
9. **Glossary wording.** Glossary entries were aligned with the corrected descriptions above.

## 4. Remaining limitations

- **All values are simulated.** No NASA POWER, GPM IMERG, SMAP or FAO GAEZ API is connected. The
  `src/lib/api.js` layer reads local JSON behind realistic delays.
- **Regional soil, not field soil.** Soil values come from regional demonstration profiles unless a
  report is attached. The built-in sample lab report is synthetic and is labelled as a demo.
- **One value per area on the map.** Each demonstration area shows the simulated regional value in its
  native cell. There is no per-cell measurement, and neighbouring areas can share a dataset.
- **The outlook is not a forecast.** It has no ensemble, no skill score and no real atmospheric input;
  it is a deterministic walk through the monthly demonstration records.
- **Screening bands are not standards.** The soil bands, land score and the three weather levels are
  demonstration rules chosen for the prototype.
- **Water pressure is a two-term rule.** It combines current root-zone soil water and this week's
  rain. It does not model evapotranspiration, irrigation scheduling or crop growth stage.
- **EASE-Grid 2.0 is implemented for the SMAP layer only.** The hand-rolled projection is valid for
  that native grid; other projections are not supported.
- **The outlook moves with the calendar.** Because it starts from `new Date()`, the dates shift from
  day to day (the values for a given date and region are stable).
- **Suppliers are fictional.** The supplier directory is demo data and is marked unverified.

## 5. Reproduce

```bash
npm run check:analysis   # water balance, soil bands, 17 study areas, en/fr/ar
npm run check:rotations  # cycle length, water and legume nitrogen
npm run check:map        # 4 native grids, no subdivision
npm run check:forecast   # 14 days, 7 + 7 split, thresholds, determinism
npm run check:keys       # dictionary parity across en/fr/ar
npm run lint
npm run smoke            # server-side render of every main screen
npm run build
```
