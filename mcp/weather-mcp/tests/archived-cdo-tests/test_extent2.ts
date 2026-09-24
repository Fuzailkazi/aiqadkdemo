#!/usr/bin/env tsx

import 'dotenv/config';
import axios from 'axios';

const token = process.env.NOAA_CDO_TOKEN;
const client = axios.create({
  baseURL: 'https://www.ncei.noaa.gov/cdo-web/api/v2',
  headers: {
    'token': token,
    'Accept': 'application/json'
  }
});

async function test() {
  // Test 1: Very large extent (whole eastern US)
  console.log('=== Test 1: Eastern US extent ===');
  let extent = '-85,35,-70,45';
  console.log('Extent:', extent);

  let response = await client.get('/stations', {
    params: { extent, limit: '10', datasetid: 'GHCND' }
  });

  console.log('Found:', response.data.results?.length || 0);

  // Test 2: Whole continental US
  console.log('\n=== Test 2: Continental US extent ===');
  extent = '-125,25,-65,50';
  console.log('Extent:', extent);

  response = await client.get('/stations', {
    params: { extent, limit: '10', datasetid: 'GHCND' }
  });

  console.log('Found:', response.data.results?.length || 0);
  if (response.data.results) {
    for (const s of response.data.results.slice(0, 5)) {
      console.log(`  ${s.id}: ${s.name} (${s.latitude}, ${s.longitude})`);
    }
  }

  // Test 3: No extent at all - just get some stations
  console.log('\n=== Test 3: No extent filter ===');

  response = await client.get('/stations', {
    params: { limit: '10', datasetid: 'GHCND' }
  });

  console.log('Found:', response.data.results?.length || 0);
  if (response.data.results) {
    for (const s of response.data.results.slice(0, 5)) {
      console.log(`  ${s.id}: ${s.name} (${s.latitude}, ${s.longitude})`);
    }
  }
}

test().catch(console.error);
