import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {feature} from 'topojson-client';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('src/js/01b_geography.js','utf8'),ctx);
const countries=feature(JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-110m.json','utf8')), 'countries').features.map(ctx.prepareCountry);
test('country attribution distinguishes land, ocean, holes and the dateline',()=>{
 assert.equal(ctx.countryAt(-60,-4.5,countries).feature.properties.name,'Brazil');
 assert.equal(ctx.countryAt(2.35,48.85,countries).feature.properties.name,'France');
 assert.equal(ctx.countryAt(-140,0,countries),null);
 const polygon=ctx.prepareCountry({id:'test',geometry:{type:'Polygon',coordinates:[[[170,-10],[-170,-10],[-170,10],[170,10],[170,-10]],[[178,-2],[-178,-2],[-178,2],[178,2],[178,-2]]]}});
 assert.ok(ctx.countryAt(175,0,[polygon]));assert.ok(ctx.countryAt(-175,0,[polygon]));assert.equal(ctx.countryAt(179,0,[polygon]),null);assert.equal(ctx.countryAt(0,0,[polygon]),null);
});
test('country colors average only available samples, omit missing data, and retain sample counts',()=>{
 const points=[[-60,-4.5,10],[-47,-15,20],[2.35,48.85,99],[-140,0,500]];
 const groups=ctx.countrySampleGroups(points,[10,20,NaN,500],countries);
 assert.equal(groups.length,1);assert.equal(groups[0].country.feature.properties.name,'Brazil');assert.equal(groups[0].count,2);assert.equal(groups[0].value,15);
});
