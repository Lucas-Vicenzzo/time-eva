# EVA Classroom

Interactive climate exploration for the classroom, with a satellite-textured 3D globe, real environmental observations, historical charts and EVA, an educational assistant powered by Gemini.

**Live website:** https://evaclassroom.vercel.app

**Start the demo:** https://evaclassroom.vercel.app/demo/

## Run locally

Requires Node.js 22 and npm.

```sh
npm ci
cp .env.example .env.local
npm run build
npm start
```

Open http://localhost:3000. Set `GEMINI_API_KEY` in `.env.local` to enable Gemini. `GEMINI_MODEL` is optional. Never commit real credentials. When Gemini is unavailable, the interface identifies its local fallback responses.

`npm run dev` rebuilds files when the source changes; run the local server in another terminal. `npm test` runs the automated checks after the build.

## What is included

- Portuguese and English interfaces, official EVA branding and animated expressions.
- Landing page with a clear demo CTA and an investigating-EVA loading transition.
- Interactive globe with country colors, observation layers, region selection and camera zoom.
- Temperature and precipitation timelines, annual charts and a file explorer with dates and coverage.
- Gemini explanations grounded in the selected observations, with possible causes presented as hypotheses.
- A classroom quiz demonstration. Shared rooms and live multi-device student participation are not implemented yet.

## Data and interpretation

`src/data/earthdata-demo.json` contains traceable, quality-filtered samples extracted from the supplied challenge files: MERRA-2 precipitation and heat indicators, AIRS/Aqua temperature and Sentinel-5P ozone. These are observations for specific dates and footprints, not complete global time series.

`src/data/climate-history.json` contains annual temperature and precipitation histories for 24 global sample points, from 1981 to 2025, obtained through NASA POWER/MERRA-2. Additional points can be requested through `/api/climate`. Country colors summarize available samples; they are not national averages. The project does not infer proven causes or statistical significance from those samples.

The satellite globe texture is historical NASA Blue Marble imagery, not live satellite imagery. Its provenance is recorded in `src/assets/NASA-IMAGERY.txt`.

The derived data needed for the demo is included. Original large Earthdata files are excluded from Git. To regenerate the challenge samples, place the originals in `NASA Data/`, install `scripts/requirements-nasa.txt` in a Python virtual environment, and run `scripts/export-nasa.py`. Run `node scripts/fetch-history.mjs` from the project root to refresh the historical sample dataset.

## Project structure

- `src/landing/`: landing page and shared demo loading screen.
- `src/index.html` and `src/js/`: interactive demo.
- `src/assets/`: logo, mascot, imagery, styles and landing assets.
- `src/data/`: prepared environmental datasets and provenance.
- `api/` and `lib/`: Gemini and climate endpoints, validation and data processing.
- `scripts/`: build, local server and data preparation.
- `tests/`: automated checks.

The original team landing page has been integrated into `src/landing/`; the team interviews and photographs are retained in `src/assets/landing/`.

## Vercel

Import this repository, use Node.js 22 and the settings in `vercel.json`, and configure `GEMINI_API_KEY` as a server-side environment variable. The build produces the landing at `/` and the demo at `/demo/`. API routes remain server-side; no API key is embedded in the client build.
