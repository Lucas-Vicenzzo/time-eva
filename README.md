# EVA Classroom

Interactive climate exploration for the classroom, with a satellite-textured 3D globe, real environmental observations, historical charts and EVA, an educational assistant powered by Gemini.

**Live website:** https://evaclassroom.vercel.app

**Start the demo:** https://evaclassroom.vercel.app/demo/

**Interactive student join preview:** `/demo/join/` — tap or focus each field to fill example values, enter a simulated waiting room, then choose an answer when the quiz question appears. It does not submit data or create a real classroom.

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

## Monthly data updates

The `Monthly climate data` GitHub Actions workflow runs on the fifth day of each
month at 06:23 UTC (03:23 in São Paulo), or manually with `workflow_dispatch`.
It requires the repository secret `EARTHDATA_TOKEN` (an Earthdata bearer token
with access to GES DISC downloads) and permission for GitHub Actions to open pull
requests. Credentials are never stored in application data.

After this workflow is merged into `main`, run it manually from GitHub:
**Actions → Monthly climate data → Run workflow → main → Run workflow**.
The equivalent GitHub CLI command is:

```sh
gh workflow run monthly-data.yml --ref main
gh run list --workflow monthly-data.yml
gh run watch RUN_ID
```

Open a run to follow each step and its logs. A successful run with changed data
opens a pull request; a run without changes does not create a commit or pull request.
Manual runs on other branches validate the candidate only and do not create data
branches or pull requests.

Automated sources are NASA POWER annual histories, MERRA-2 `M2SMNXEDI`
version 2 monthly extreme indices, AIRS `AIRS2SUP` version 7.0 surface air
temperature and Sentinel-5P `S5P_L2__O3_TOT_HiR` version 3 total ozone. All
Earthdata products are discovered through GES DISC using the same token.

To prepare a candidate locally, install `scripts/requirements-nasa.txt` in a Python
environment, set `EARTHDATA_TOKEN` in that environment, and run:

```sh
npm run data:refresh -- /absolute/path/to/empty-candidate-directory
```

The npm command loads `.env.local` when present; keep `EARTHDATA_TOKEN` there for local runs.
Set `PYTHON` to the desired Python executable if necessary. The candidate directory
must be separate from the checkout and empty. The command copies existing datasets,
refreshes POWER, discovers new or revised MERRA-2 monthly files through all CMR
result pages, and writes changes only to the candidate. It never publishes or
modifies the application source datasets. An error makes the candidate unsuitable
for publication; discard it and retry in an empty directory.

MERRA-2 discovery starts at the existing snapshot (or earliest retained processed
month). Historical months before that point are not backfilled. Every run checks
revisions for all retained months. Raw NetCDF downloads exist only in a temporary
directory and are deleted on success or failure. Full processed metric grids,
coordinates, units and missing-value masks are retained as compressed NumPy `.npz`
files under `data/processed/merra2/`. The manifest records source URLs, granule IDs,
revisions, hashes, periods and processor version. These full grids are excluded
from the Vercel deployment; display samples keep the existing application format.

POWER retains complete calendar years only and refuses to remove existing annual
coverage. Identical time series do not cause a rewrite. A monthly check does not
imply monthly source availability or add a partial year to annual charts.

For AIRS and Sentinel-5P, each monthly run selects the latest completed available
swath without replacing a newer local observation with an older catalog result.
Previously processed swaths are checked for revisions. This preserves the app's
single-swath view: these are individual passes, not monthly/global averages or a
download of every pass during the month. Full processed arrays, coordinates, quality
flags and validity masks are retained under `data/processed/airs/` and
`data/processed/sentinel5p/`. Raw HDF/NetCDF files are deleted after processing,
including on failure. Source versions are pinned; changing versions requires
validation of the parser and quality rules. Sentinel-5P is Copernicus/ESA data
distributed by NASA GES DISC. The quiz derives its coverage answer from the
available valid observations inside the approximate Brazil bounding box.

The workflow validates the candidate with the Python processing tests, application
build and Node tests, then opens a pull request containing only processed data.
It does not merge or deploy automatically. Merge the validated update to publish
through the repository's Vercel integration; revert that update to recover the
previous data. GitHub scheduling is best-effort, not a strict time guarantee.

Run processing checks with `npm run test:data` in the Python environment and
application checks with `npm run build` followed by `npm test`.
