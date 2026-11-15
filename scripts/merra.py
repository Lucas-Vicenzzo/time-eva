"""Quality-filter MERRA-2 monthly indices; keep full grids for future analyses."""
from pathlib import Path
import hashlib
import numpy as np

REGIONS = {'amazonia': (-4.5, -60), 'cerrado': (-15, -47.5), 'nordeste': (-7.5, -39),
           'pantanal': (-17.8, -56.7), 'sudeste': (-22, -44.6), 'sul': (-28.4, -51.4)}
METRICS = [('drydays', 'days', 'Dias secos', 'Dry days'),
           ('RX1Day', 'mm/day', 'Maior chuva em um dia', 'Maximum one-day rainfall'),
           ('HWD', 'days', 'Duração da maior onda de calor', 'Longest heatwave')]


def stats(values):
    values = np.ma.asarray(values).compressed()
    values = values[np.isfinite(values)]
    if not values.size:
        raise ValueError('No valid observations')
    return {'count': int(values.size), 'min': round(float(values.min()), 3),
            'max': round(float(values.max()), 3), 'mean': round(float(values.mean()), 3)}


def extract_merra(source, period, processed=None, source_name=None):
    from netCDF4 import Dataset, num2date
    metrics, grids = {}, {}
    with Dataset(source) as dataset:
        observed = num2date(dataset['time'][0], dataset['time'].units)
        if f'{observed.year:04d}-{observed.month:02d}' != period[:7]:
            raise ValueError('Observation month differs from catalog')
        lat, lon = dataset['lat'][:], dataset['lon'][:]
        if lat.ndim != 1 or lon.ndim != 1 or not np.all(np.isfinite(lat)) or not np.all(np.isfinite(lon)):
            raise ValueError('Invalid coordinates')
        if np.any(abs(lat) > 90) or np.any(abs(lon) > 180):
            raise ValueError('Coordinates out of bounds')
        xx, yy = np.meshgrid(lon[::8], lat[::8])
        for key, unit, pt, en in METRICS:
            variable = dataset[key]
            if variable.shape != (1, len(lat), len(lon)) or str(variable.units).strip() not in {'drydays': ('count', 'days'), 'RX1Day': ('mm day-1', 'mm/day'), 'HWD': ('days',)}[key]:
                raise ValueError(f'Unexpected dimensions or units: {key}')
            values = np.ma.masked_invalid(np.ma.asarray(variable[0], dtype=float))
            if np.any(values.compressed() < 0):
                raise ValueError(f'Negative index: {key}')
            sample = values[::8, ::8]
            valid = ~np.ma.getmaskarray(sample)
            cells = {}
            for region, (la, lo) in REGIONS.items():
                i, j = int(np.argmin(abs(lat-la))), int(np.argmin(abs(lon-lo)))
                value = values[i, j]
                cells[region] = {'lat': float(lat[i]), 'lon': float(lon[j]),
                                 'value': None if np.ma.is_masked(value) else round(float(value), 3)}
            # The quiz compares dry-day cells; other metrics may legitimately be missing.
            if key == 'drydays' and any(c['value'] is None for c in cells.values()):
                raise ValueError(f'Missing classroom reference cells: {key}')
            metrics[key] = {'label': {'pt': pt, 'en': en}, 'unit': unit,
                'description': str(variable.long_name), 'sourceUnit': str(variable.units),
                'points': [[round(float(x), 4), round(float(y), 4), round(float(v), 3)]
                           for x, y, v in zip(xx[valid], yy[valid], sample[valid])],
                'stats': stats(values), 'regions': cells}
            # Preserve the full processed grid and mask, not only the display sample.
            grids[key] = values.filled(np.nan)
            grids[key + '_units'] = unit
        grids.update(latitude=lat, longitude=lon, period=period)
        if processed:
            Path(processed).parent.mkdir(parents=True, exist_ok=True)
            np.savez_compressed(processed, **grids)
    return {'id': 'merra2', 'name': 'MERRA-2', 'source': source_name or str(source),
        'period': period, 'coverage': 'global-grid',
        'url': 'https://gmao.gsfc.nasa.gov/pubs/docs/Collow1466.pdf',
        'sampling': 'Every 8th latitude and longitude cell; no interpolation. Statistics use all valid cells (unweighted). Regional values are single nearest grid cells, not regional averages.',
        'metrics': metrics}


def file_hash(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()
