import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import json
import numpy as np
from netCDF4 import Dataset
from pyhdf.SD import SD, SDC
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from swaths import extract_airs, extract_sentinel
spec=importlib.util.spec_from_file_location('swath_updater',Path(__file__).resolve().parents[1]/'scripts/update-earthdata.py')
updater=importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


class SwathTests(unittest.TestCase):
    def test_airs_rejects_invalid_quality_and_converts_kelvin(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'AIRS.2026.11.14.001.L2.RetSup_IR.hdf'
            d=SD(str(source),SDC.WRITE|SDC.CREATE)
            for key, values in {
                'Latitude': [[0,1,2],[3,4,5]], 'Longitude': [[-50,-51,-52],[-53,-54,999]],
                'TSurfAir': [[293.15,303.15,293.15],[293.15,-9999,293.15]],
                'TSurfAir_QC': [[0,1,-9999],[2,0,0]]}.items():
                v=d.create(key,SDC.FLOAT64,(2,3));v[:]=np.asarray(values,dtype=float);v.endaccess()
            d.end()
            processed=Path(directory)/'airs.npz'
            result=extract_airs(source,'2026-11-14T00:00:00Z / 2026-11-14T00:06:00Z',processed)
            metric=result['metrics']['TSurfAir']
            self.assertEqual(metric['stats']['count'],2)
            self.assertEqual([p[2] for p in metric['points']],[20,30])
            with np.load(processed) as grid:
                self.assertEqual(grid['valid'].sum(),2)
                self.assertTrue(np.isnan(grid['TSurfAir'][0,2]))
            with self.assertRaisesRegex(ValueError,'date'):
                extract_airs(source,'2026-11-15')
            d=SD(str(source),SDC.WRITE);d.select('TSurfAir').units='unexpected';d.end()
            with self.assertRaisesRegex(ValueError,'unit'):
                extract_airs(source,'2026-11-14')

    def test_ozone_filters_masks_quality_and_coordinates_before_dobson_conversion(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'source.nc'
            period='2026-11-10T22:00:00Z / 2026-11-10T23:00:00Z'
            with Dataset(source,'w') as d:
                d.time_coverage_start,d.time_coverage_end=period.split(' / ')
                g=d.createGroup('PRODUCT')
                for name,size in [('time',1),('scanline',24),('ground_pixel',24)]:g.createDimension(name,size)
                for name in ['latitude','longitude','ozone_total_vertical_column','qa_value']:
                    v=g.createVariable(name,'f8',('time','scanline','ground_pixel'),fill_value=-9999)
                    v[:]= {'latitude':0,'longitude':-50,'ozone_total_vertical_column':300*4.4615e-4,'qa_value':.5}[name]
                g['ozone_total_vertical_column'].units='mol m-2'
                g['qa_value'][0,0,0]=.49
                g['ozone_total_vertical_column'][0,1,1]=-9999
                g['latitude'][0,2,2]=91
                g['qa_value'][0,3,3]=1.1
                g['qa_value'][0,4,4]=np.nan
                g['latitude'][0,5,5]=-9999
            output=Path(directory)/'ozone.npz'
            result=extract_sentinel(source,period,output)
            self.assertEqual(result['metrics']['ozone']['stats']['count'],570)
            self.assertEqual(len(result['metrics']['ozone']['points']),3)
            self.assertEqual(result['metrics']['ozone']['stats']['mean'],300)
            self.assertEqual(result['validBrazilBoundingBoxPixels'],570)
            with np.load(output) as grid:
                self.assertEqual(grid['ozone'].shape,(24,24))
                self.assertTrue(np.isnan(grid['ozone'][1,1]))
            with self.assertRaisesRegex(ValueError,'time'):
                extract_sentinel(source,'2026-11-11T22:00:00Z / 2026-11-11T23:00:00Z')
            with Dataset(source,'a') as d:d.groups['PRODUCT']['ozone_total_vertical_column'].units='DU'
            with self.assertRaisesRegex(ValueError,'unit'):
                extract_sentinel(source,period)

    def test_snapshot_selection_keeps_newer_local_data_and_rechecks_revisions(self):
        current={'period':'2026-11-09'}
        old={'id':'G1-GES_DISC','time_start':'2026-11-08T00:00:00Z','time_end':'2026-11-08T01:00:00Z','updated':'r1'}
        latest={**old,'id':'G2-GES_DISC','time_start':'2026-11-10T00:00:00Z','time_end':'2026-11-10T01:00:00Z'}
        with patch.object(updater,'catalog_page',return_value=[old]):
            self.assertEqual(updater.swath_candidates('c',current,{},'2026-11-15T00:00:00Z'),[])
        with patch.object(updater,'catalog_page',return_value=[latest]),patch.object(updater,'catalog',return_value=[{**old,'updated':'r2'}]):
            selected=updater.swath_candidates('c',current,{old['id']:{'revision':'r1'}},'2026-11-15T00:00:00Z')
            self.assertEqual([g['id'] for g,p in selected],['G1-GES_DISC','G2-GES_DISC'])
        with patch.object(updater,'catalog_page',return_value=[latest]):
            self.assertEqual(updater.swath_candidates('c',current,{latest['id']:{'revision':'r1'}},'2026-11-10T00:30:00Z'),[])

    def test_snapshot_download_links_support_hdf_and_nc_without_untrusted_hosts(self):
        for extension in ['.hdf','.nc']:
            granule={'links':[{'rel':'https://example/data#','href':'https://data.gesdisc.earthdata.nasa.gov/source'+extension}]}
            self.assertTrue(updater.data_url(granule,(extension,)).endswith(extension))
            granule['links'][0]['href']='https://nasa.gov.example/source'+extension
            with self.assertRaises(ValueError):updater.data_url(granule,(extension,))

    def test_failure_in_second_instrument_does_not_replace_candidate_observations(self):
        root=Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            destination=Path(directory)
            evidence=destination/'src/data/earthdata-demo.json'
            evidence.parent.mkdir(parents=True)
            before=(root/'src/data/earthdata-demo.json').read_bytes();evidence.write_bytes(before)
            granule={'id':'G1-GES_DISC','time_start':'2026-11-14T00:00:00Z','time_end':'2026-11-14T01:00:00Z','updated':'r1'}
            with patch.object(updater,'catalog',side_effect=[[{'id':'airs'}],[{'id':'sentinel'}]]),patch.object(updater,'swath_candidates',return_value=[(granule,granule['time_start']+' / '+granule['time_end'])]),patch.object(updater,'process_granule',side_effect=[None,ValueError('bad ozone')]),patch.dict('os.environ',{'EARTHDATA_TOKEN':'test'}):
                with self.assertRaisesRegex(ValueError,'bad ozone'):updater.update_swaths(destination)
            self.assertEqual(evidence.read_bytes(),before)
            self.assertFalse((destination/'data/processed/manifest.json').exists())


if __name__=='__main__':unittest.main()
