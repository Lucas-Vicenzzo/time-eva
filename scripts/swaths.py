"""Extract quality-filtered satellite swaths without implying global coverage."""
from datetime import datetime, timezone
from pathlib import Path
import re
import numpy as np
from merra import stats


def iso_time(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def coordinates(latitude, longitude):
    lat = np.ma.asarray(latitude, dtype=float).filled(np.nan)
    lon = np.ma.asarray(longitude, dtype=float).filled(np.nan)
    if lat.shape != lon.shape or lat.ndim != 2:
        raise ValueError('Expected matching two-dimensional swath coordinates')
    valid = np.isfinite(lat) & np.isfinite(lon) & (abs(lat) <= 90) & (abs(lon) <= 180)
    return lat, lon, valid


def points(lat, lon, values, valid):
    return [[round(float(x), 4), round(float(y), 4), round(float(v), 3)]
            for x, y, v in zip(lon[valid], lat[valid], values[valid])]


def extract_airs(source, period, processed=None, source_name=None):
    from pyhdf.SD import SD, SDC
    name = source_name or Path(source).name
    match = re.search(r'AIRS\.(\d{4})\.(\d{2})\.(\d{2})\.', name)
    if not match or '-'.join(match.groups()) != period[:10]:
        raise ValueError('AIRS filename date differs from catalog')
    dataset = SD(str(source), SDC.READ)
    try:
        temperature = dataset.select('TSurfAir')
        # AIRS2SUP V7 specifies kelvin but omits the per-variable units attribute.
        units = str(temperature.attributes().get('units', 'K')).strip()
        if units.lower() not in ('k', 'kelvin'):
            raise ValueError('Unexpected AIRS temperature unit')
        lat, lon, valid = coordinates(dataset.select('Latitude')[:], dataset.select('Longitude')[:])
        kelvin = np.asarray(temperature[:], dtype=float)
        quality = np.asarray(dataset.select('TSurfAir_QC')[:])
        if kelvin.shape != lat.shape or quality.shape != lat.shape:
            raise ValueError('AIRS measurements do not match coordinates')
        valid &= np.isin(quality, [0, 1]) & np.isfinite(kelvin) & (kelvin > 100) & (kelvin < 400)
        values = kelvin - 273.15
        summary = stats(values[valid])
        if processed:
            Path(processed).parent.mkdir(parents=True, exist_ok=True)
            np.savez_compressed(processed, latitude=lat, longitude=lon,
                TSurfAir=np.where(valid, values, np.nan), quality=quality, valid=valid,
                units='°C', sourceUnits=units, period=period)
        return {'id': 'airs', 'name': 'AIRS / Aqua', 'source': name,
            'period': period, 'coverage': 'single-swath',
            'url': 'https://airs.jpl.nasa.gov/data/about-the-data/',
            'sampling': 'All valid TSurfAir footprints with TSurfAir_QC equal to 0 or 1; kelvin converted to degrees Celsius. One granule, no spatial interpolation.',
            'metrics': {'TSurfAir': {'label': {'pt': 'Temperatura do ar na superfície', 'en': 'Surface air temperature'},
                'unit': '°C', 'sourceUnit': units, 'points': points(lat, lon, values, valid), 'stats': summary}}}
    finally:
        dataset.end()


def extract_sentinel(source, period, processed=None, source_name=None):
    from netCDF4 import Dataset
    with Dataset(source) as dataset:
        actual = f'{dataset.time_coverage_start} / {dataset.time_coverage_end}'
        for observed, expected in zip(actual.split(' / '), period.split(' / ')):
            if iso_time(observed) != iso_time(expected):
                raise ValueError('Sentinel-5P observation time differs from catalog')
        product = dataset.groups['PRODUCT']
        ozone = product['ozone_total_vertical_column']
        if str(ozone.units).strip() not in ('mol m-2', 'mol/m2', 'mol m^-2'):
            raise ValueError('Unexpected Sentinel-5P ozone unit')
        if ozone.ndim != 3 or ozone.shape[0] != 1:
            raise ValueError('Expected one Sentinel-5P swath')
        lat, lon, valid = coordinates(product['latitude'][0], product['longitude'][0])
        values = np.ma.asarray(ozone[0], dtype=float).filled(np.nan) / 4.4615e-4
        quality = np.ma.asarray(product['qa_value'][0], dtype=float).filled(np.nan)
        if values.shape != lat.shape or quality.shape != lat.shape:
            raise ValueError('Sentinel-5P measurements do not match coordinates')
        valid &= np.isfinite(values) & np.isfinite(quality) & (quality >= .5) & (quality <= 1)
        summary = stats(values[valid])
        stride = np.zeros(valid.shape, dtype=bool)
        stride[::12, ::12] = True
        sample = valid & stride
        if not sample.any():
            raise ValueError('No valid Sentinel-5P display samples')
        bbox = np.isfinite(lat) & np.isfinite(lon) & (lat >= -34) & (lat <= 6) & (lon >= -74) & (lon <= -34)
        if processed:
            Path(processed).parent.mkdir(parents=True, exist_ok=True)
            np.savez_compressed(processed, latitude=lat, longitude=lon,
                ozone=np.where(valid, values, np.nan), quality=quality, valid=valid,
                units='DU', sourceUnits=str(ozone.units), period=actual)
        return {'id': 'sentinel5p', 'name': 'Sentinel-5P / TROPOMI',
            'source': source_name or str(source), 'period': actual, 'coverage': 'single-swath',
            'url': 'https://www.tropomi.eu/data-products/total-ozone-column',
            'sampling': 'Every 12th scanline and ground pixel with qa_value >= 0.5. Statistics use all valid footprints. 1 DU = 4.4615e-4 mol/m².',
            'brazilBoundingBoxPixels': int(bbox.sum()),
            'validBrazilBoundingBoxPixels': int((bbox & valid).sum()),
            'metrics': {'ozone': {'label': {'pt': 'Coluna total de ozônio', 'en': 'Total ozone column'},
                'unit': 'DU', 'sourceUnit': str(ozone.units),
                'points': points(lat, lon, values, sample), 'stats': summary}}}
