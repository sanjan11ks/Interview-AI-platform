# Rental Property Decision Dashboard

A self-contained, offline-friendly dashboard for comparing rental properties and deciding where to stay.

## How to use

Just open `index.html` in any browser — no server, build step, or internet connection needed:

```
open rental-dashboard/index.html        # macOS
xdg-open rental-dashboard/index.html    # Linux
start rental-dashboard\index.html       # Windows
```

## What it does

- **Add properties** with all the parameters that matter:
  - Rent, deposit, maintenance charges, estimated power bill / backup charges
  - Wi-Fi availability, power backup, water supply, pet friendliness
  - Star ratings for maintenance service & staff behaviour, safety & neighbourhood, commute, ventilation & light, peace & quiet
  - Carpet area (sq.ft), furnishing level, free-form notes
- **Saves automatically** to the browser's localStorage — close the tab and your data is still there. Export/Import JSON buttons let you back up or move data between devices.
- **Spider (radar) chart** overlays up to 4 properties across 10 axes (affordability, space, Wi-Fi, power, water, maintenance, pets, safety, commute, comfort) so you can see strengths and gaps at a glance.
- **Weighted scoring (0–100)** ranks every property. Adjust the "What matters to you?" sliders to match your priorities — pet owners can crank up the pet-friendly weight, remote workers the Wi-Fi weight — and the ranking updates live.
- **Decision helper** names the best pick, its top strengths, its weakest area, and flags close calls with the runner-up.
- **Side-by-side table** highlights the best (green) and worst (red) property for every parameter.

Affordability and space scores are relative: the cheapest property among your saved ones gets full marks on affordability, the largest gets full marks on space.
