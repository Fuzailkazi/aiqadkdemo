#!/usr/bin/env tsx

import 'dotenv/config';
import { CDOService } from './src/services/cdo.js';

async function testCDO() {
  console.log('Testing CDO API...\n');
  console.log('Token configured:', !!process.env.NOAA_CDO_TOKEN);

  const cdoService = new CDOService({
    token: process.env.NOAA_CDO_TOKEN
  });

  // Test 1: Find stations near Washington DC
  const lat = 38.9072;
  const lon = -77.0369;
  const startDate = '2024-09-01';
  const endDate = '2024-09-30';

  try {
    console.log(`\nTest 1: Finding stations near (${lat}, ${lon})`);
    console.log(`Date range: ${startDate} to ${endDate}`);

    const stations = await cdoService.findStationsByLocation(
      lat,
      lon,
      startDate,
      endDate,
      5
    );

    console.log(`\nFound ${stations.results?.length || 0} stations:`);
    if (stations.results) {
      for (const station of stations.results) {
        console.log(`  - ${station.id}: ${station.name}`);
        console.log(`    Elevation: ${station.elevation}m`);
        console.log(`    Data coverage: ${station.datacoverage}`);
        console.log(`    Min date: ${station.mindate}, Max date: ${station.maxdate}`);
      }
    }

    // Test 2: Try to get data from the first station
    if (stations.results && stations.results.length > 0) {
      const stationId = stations.results[0].id;
      console.log(`\n\nTest 2: Getting data from station ${stationId}`);

      const data = await cdoService.getDailySummaries(
        stationId,
        startDate,
        endDate,
        ['TMAX', 'TMIN', 'TAVG', 'PRCP', 'SNOW'],
        50
      );

      console.log(`\nGot ${data.results?.length || 0} observations`);
      if (data.results && data.results.length > 0) {
        console.log('\nFirst few observations:');
        for (const obs of data.results.slice(0, 5)) {
          console.log(`  ${obs.date}: ${obs.datatype} = ${obs.value} ${obs.attributes || ''}`);
        }
      }
    }

    // Test 3: Use the convenience method
    console.log('\n\nTest 3: Using getHistoricalData convenience method');
    const historicalData = await cdoService.getHistoricalData(
      lat,
      lon,
      startDate,
      endDate,
      100
    );

    console.log(`Got ${historicalData.results?.length || 0} data points`);

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

testCDO();
