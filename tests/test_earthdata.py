import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
from netCDF4 import Dataset

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from merra import extract_merra
spec = importlib.util.spec_from_file_location('update_earthdata', Path(__file__).resolve().parents[1] / 'scripts/update-earthdata.py')
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


def granule(ident='G1-GES_DISC', start='2026-09-01', revision='2026-10-01'):
    return {'id': ident, 'time_start': start+'T00:00:00Z', 'updated': revision,
            'producer_granule_id': 'MERRA2.statM_2d_edi_Nx.v2_1.202609.nc4',
            'links': [{'rel': 'http://esipfed.org/ns/fedsearch/1.1/data#',
                       'href': 'https://data.gesdisc.earthdata.nasa.gov/source.nc4'}]}


class EarthdataTests(unittest.TestCase):
    def test_selection_handles_revisions_and_incomplete_months(self):
        known = {'G1-GES_DISC': {'revision': '2026-10-01'}}
        self.assertEqual(updater.eligible([granule()], '2026-09', known, '2026-11-15'), [])
        self.assertEqual(len(updater.eligible([granule(revision='2026-11-01')], '2026-09', known, '2026-11-15')), 1)
        self.assertEqual(updater.eligible([granule(start='2026-11-01')], '2026-09', {}, '2026-11-15'), [])
        self.assertEqual(updater.eligible([granule(start='2026-08-01')], '2026-09', {}, '2026-11-15'), [])

    def test_download_links_must_be_supported_nasa_files(self):
        self.assertTrue(updater.data_url(granule()).endswith('.nc4'))
        bad = granule()
        bad['links'][0]['href'] = 'https://other.example/source.nc4'
        with self.assertRaises(ValueError):
            updater.data_url(bad)

    def test_catalog_reads_all_pages(self):
        class Response:
            def __init__(self, data): self.data = data
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self): return json.dumps({'feed': {'entry': self.data}}).encode()
        with patch.object(updater, 'urlopen', side_effect=[Response([{}]*2000), Response([{'id': 'last'}])]) as fetch:
            result = updater.catalog('granules', collection_concept_id='c1')
        self.assertEqual(len(result), 2001)
        self.assertIn('page_num=2', fetch.call_args.args[0].full_url)

    def test_processing_preserves_full_grid_and_validates_source_units(self):
        with tempfile.TemporaryDirectory() as directory:
            source, processed = Path(directory)/'source.nc4', Path(directory)/'processed.npz'
            with Dataset(source, 'w') as d:
                for key, size in [('time', 1), ('lat', 16), ('lon', 16)]: d.createDimension(key, size)
                t=d.createVariable('time', 'f8', ('time',))
                t.units='days since 2026-09-01 00:00:00'
                t[:]=0
                d.createVariable('lat', 'f4', ('lat',))[:] = np.linspace(-90, 90, 16)
                d.createVariable('lon', 'f4', ('lon',))[:] = np.linspace(-180, 180, 16)
                for key, units in [('drydays', 'count'), ('RX1Day', 'mm day-1'), ('HWD', 'days')]:
                    v=d.createVariable(key, 'i4' if key=='drydays' else 'f4', ('time','lat','lon'), fill_value=-999)
                    v.units, v.long_name = units, key
                    v[:]=np.arange(256).reshape(1,16,16)
                    v[0,0,0]=-999
                    if key == 'HWD': v[0,7,5]=-999
            result = extract_merra(source, '2026-09-01 / 2026-09-30', processed)
            self.assertEqual(result['metrics']['drydays']['stats']['count'],255)
            self.assertIsNone(result['metrics']['HWD']['regions']['amazonia']['value'])
            self.assertEqual(result['metrics']['HWD']['stats']['count'],254)
            self.assertEqual(len(result['metrics']['drydays']['points']),3)
            with np.load(processed) as full:
                self.assertEqual(full['drydays'].shape,(16,16))
                self.assertTrue(np.isnan(full['drydays'][0,0]))
            with Dataset(source, 'a') as d: d['RX1Day'].units='unexpected'
            with self.assertRaisesRegex(ValueError,'units'):
                extract_merra(source,'2026-09-01 / 2026-09-30')

    def test_success_retains_other_sources_and_skips_unchanged_revision(self):
        root=Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            destination=Path(directory)
            evidence=destination/'src/data/earthdata-demo.json'
            evidence.parent.mkdir(parents=True)
            original=json.loads((root/'src/data/earthdata-demo.json').read_text())
            evidence.write_text(json.dumps(original))
            downloads=[]
            def fake_download(url, target, token):
                target.write_bytes(b'source')
                downloads.append(target)
            def extract(source, period, processed, name):
                processed.parent.mkdir(parents=True,exist_ok=True)
                processed.write_bytes(b'processed-grid')
                dataset=next(d.copy() for d in original['datasets'] if d['id']=='merra2')
                dataset.update(period=period,source=name)
                return dataset
            with patch.object(updater,'catalog',side_effect=[[{'id':'c1'}],[granule()],[{'id':'c1'}],[granule()]]), patch.object(updater,'download',side_effect=fake_download) as fetch, patch.object(updater,'extract_merra',side_effect=extract), patch.dict('os.environ',{'EARTHDATA_TOKEN':'test'}):
                updater.update_merra(destination)
                first=evidence.read_bytes()
                updater.update_merra(destination)
            self.assertEqual(fetch.call_count,1)
            self.assertEqual(evidence.read_bytes(),first)
            self.assertFalse(downloads[0].exists())
            result=json.loads(first)
            for ident in ['airs','sentinel5p']:
                self.assertEqual(next(d for d in result['datasets'] if d['id']==ident),next(d for d in original['datasets'] if d['id']==ident))
            self.assertTrue((destination/'data/processed/merra2/2026-09.npz').exists())
            self.assertEqual(result['uniqueFiles'],3)

    def test_failed_processing_does_not_replace_published_data(self):
        root=Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            destination=Path(directory)
            evidence=destination/'src/data/earthdata-demo.json'
            evidence.parent.mkdir(parents=True)
            original=(root/'src/data/earthdata-demo.json').read_bytes()
            evidence.write_bytes(original)
            def fake_download(url, target, token): target.write_bytes(b'invalid')
            with patch.object(updater,'catalog',side_effect=[[{'id':'c1'}],[granule()]]), patch.object(updater,'download',side_effect=fake_download), patch.object(updater,'extract_merra',side_effect=ValueError('bad source')), patch.dict('os.environ',{'EARTHDATA_TOKEN':'test'}):
                with self.assertRaisesRegex(ValueError,'bad source'):
                    updater.update_merra(destination)
            self.assertEqual(evidence.read_bytes(),original)
            self.assertFalse((destination/'data/processed/manifest.json').exists())


if __name__ == '__main__':
    unittest.main()
