# 🌎 E.V.A · Ask the planet

**NASA satellite data, real statistics and plain-language explanations for high school students.**

[Landing page](https://lucas-vicenzzo.github.io/time-eva/) · [Project Drive](https://drive.google.com/drive/u/2/folders/1assPWxWg7m0SatUudmoIxkNvh6jZY6Td)

## About

Climate data is public but hard to find and interpret, which keeps high school students away from real evidence of how the planet is changing.

With E.V.A, a student asks a question or picks a place on the globe. The system selects the relevant variables (rain, temperature, vegetation, pollution), builds the region's time series and answers **what is changing, where, how much, and whether the change is statistically significant or just chance**.

An AI explains the result in simple language but **never calculates**: numbers come from code and are checked by a verifier. When there is no data, the planet says "no data" instead of making something up.

## How it works

| Step | Done by | What happens |
|---|---|---|
| 1. Collect | Code | Fetches the region's series from NASA products |
| 2. Analyze | Code | Mann-Kendall test, Sen's slope, confidence intervals |
| 3. Explain | AI | Turns the result into plain language, without generating numbers |
| 4. Verify | Verifier | Checks every number in the text against the code output |

**Data sources:** [MODIS](https://modis.gsfc.nasa.gov/), [GPM IMERG](https://gpm.nasa.gov/data/imerg), [OMI](https://aura.gsfc.nasa.gov/omi.html), [MERRA-2](https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/) and [NASA POWER](https://power.larc.nasa.gov/), obtained through [NASA Earthdata](https://www.earthdata.nasa.gov/).

## Features

- **Play with the Planet:** a sandbox where students fire "lasers" (a volcano, deforestation, switching off a city) and see what real data showed when something similar actually happened.
- **Classroom mode:** the teacher projects the globe and the class bets and investigates together, even without phones, using voting cards.

## Validation

> "It's important to bring NASA, something so distant, close to students."
> — Sandra Miranda, principal, Prof. Paulina Gaya School

> "Being able to investigate a real phenomenon, choose a place on the planet, raise hypotheses and test them against scientific data can be very engaging for teenagers."
> — Milena, school leader, Happy Balneário Camboriú

## Status

E.V.A is a **prototype** using data from NASA Earthdata. This repository hosts the bilingual (PT/EN) landing page.

## Landing page

Static site, no build step: `index.html`, `i18n.js` (translations), `assets/` (images) and `docs/` (downloadable files).

```bash
python -m http.server 5510
```

Items still to fill in are marked `EDITAR` in `index.html` (YouTube video, documents, team photos and names).

---

<sub>Data provided by NASA. E.V.A is not affiliated with or endorsed by NASA.</sub>
