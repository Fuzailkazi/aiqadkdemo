#!/usr/bin/env tsx

import 'dotenv/config';
import axios from 'axios';

async function testCDOFix() {
  const token = process.env.NOAA_CDO_TOKEN;
  const baseURL = 'https://www.ncei.noaa.gov/cdo-web/api/v2';

  console.log('CDO API Fix Test\n');

  const client = axios.create({
    baseURL,
    headers: {
      'token': token,
      'Accept': 'application/json'
    }
  });

  const lat = 38.9072;
  const lon = -77.0369;
  const extent = `${lon - 0.5},${lat - 0.5},${lon + 0.5},${lat + 0.5}`;

  try {
    // Search for stations WITHOUT date filters
    console.log('=== Searching for stations near DC (no date filter) ===');
    const stations = await client.get('/stations', {
      params: {
        extent,
        datasetid: 'GHCND',
        limit: 10
      }
    });

    console.log('Found stations:', stations.data.results?.length || 0);
    if (stations.data.results) {
      for (const station of stations.data.results) {
        console.log(`\n  ${station.id}: ${station.name}`);
        console.log(`    Lat/Lon: ${station.latitude}, ${station.longitude}`);
        console.log(`    Dates: ${station.mindate} to ${station.maxdate}`);
        console.log(`    Data coverage: ${station.datacoverage}`);
      }

      // Now try to get data from the first station
      const stationId = stations.data.results[0].id;
      console.log(`\n\n=== Getting data from ${stationId} ===`);

      const data = await client.get('/data', {
        params: {
          datasetid: 'GHCND',
          stationid: stationId,
          startdate: '2024-09-15',
          enddate: '2024-09-21',
          limit: 50,
          units: 'standard'
        }
      });

      console.log('Got observations:', data.data.results?.length || 0);
      if (data.data.results) {
        const grouped = new Map<string, any[]>();
        for (const obs of data.data.results) {
          const date = obs.date.split('T')[0];
          if (!grouped.has(date)) {
            grouped.set(date, []);
          }
          grouped.get(date)!.push(obs);
        }

        console.log('\nData by date:');
        for (const [date, obs] of grouped) {
          console.log(`\n  ${date}:`);
          for (const o of obs) {
            console.log(`    ${o.datatype}: ${o.value}`);
          }
        }
      }
    }

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCDOFix();
