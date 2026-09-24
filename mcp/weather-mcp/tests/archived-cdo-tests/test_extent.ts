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

const lat = 38.9072;
const lon = -77.0369;
const buffer = 0.7;
const extent = `${lon - buffer},${lat - buffer},${lon + buffer},${lat + buffer}`;

console.log('Testing extent:', extent);

client.get('/stations', {
  params: {
    extent,
    limit: '25',
    datasetid: 'GHCND'
  }
}).then(response => {
  console.log('Found stations:', response.data.results?.length || 0);
  if (response.data.results) {
    for (const station of response.data.results.slice(0, 10)) {
      console.log(`  ${station.id}: ${station.name}`);
      console.log(`    Lat/Lon: ${station.latitude}, ${station.longitude}`);
    }
  }
}).catch(error => {
  console.error('Error:', error.response?.data || error.message);
});
