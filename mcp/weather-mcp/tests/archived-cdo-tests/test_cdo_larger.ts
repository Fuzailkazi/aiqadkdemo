#!/usr/bin/env tsx

import 'dotenv/config';
import axios from 'axios';

async function testCDOLarger() {
  const token = process.env.NOAA_CDO_TOKEN;
  const baseURL = 'https://www.ncei.noaa.gov/cdo-web/api/v2';

  const client = axios.create({
    baseURL,
    headers: {
      'token': token,
      'Accept': 'application/json'
    }
  });

  try {
    // Test 1: Try with a MUCH larger extent (whole eastern US)
    console.log('=== Test 1: Large extent (eastern US) ===');
    const largeExtent = '-80,35,-75,40'; // Covers DC area with large buffer

    const stations1 = await client.get('/stations', {
      params: {
        extent: largeExtent,
        datasetid: 'GHCND',
        limit: 10
      }
    });

    console.log('Extent:', largeExtent);
    console.log('Found stations:', stations1.data.results?.length || 0);
    if (stations1.data.results) {
      for (const station of stations1.data.results) {
        console.log(`  ${station.id}: ${station.name} (${station.latitude}, ${station.longitude})`);
      }
    }

    // Test 2: Try searching by location ID
    console.log('\n=== Test 2: Search by locationid (FIPS code for DC) ===');
    try {
      const stations2 = await client.get('/stations', {
        params: {
          locationid: 'FIPS:11', // District of Columbia
          datasetid: 'GHCND',
          limit: 10
        }
      });

      console.log('Found stations:', stations2.data.results?.length || 0);
      if (stations2.data.results) {
        for (const station of stations2.data.results) {
          console.log(`  ${station.id}: ${station.name}`);
        }
      }
    } catch (error: any) {
      console.log('Error:', error.response?.data || error.message);
    }

    // Test 3: Try searching by state
    console.log('\n=== Test 3: Search for MD stations (Maryland - near DC) ===');
    try {
      const stations3 = await client.get('/stations', {
        params: {
          locationid: 'FIPS:24', // Maryland
          datasetid: 'GHCND',
          limit: 10
        }
      });

      console.log('Found stations:', stations3.data.results?.length || 0);
      if (stations3.data.results) {
        for (const station of stations3.data.results.slice(0, 5)) {
          console.log(`  ${station.id}: ${station.name}`);
          console.log(`    Lat/Lon: ${station.latitude}, ${station.longitude}`);
          console.log(`    Dates: ${station.mindate} to ${station.maxdate}`);
        }
      }

      // If we found stations, try to get data
      if (stations3.data.results && stations3.data.results.length > 0) {
        const stationId = stations3.data.results[0].id;
        console.log(`\n=== Getting data from ${stationId} ===`);

        const data = await client.get('/data', {
          params: {
            datasetid: 'GHCND',
            stationid: stationId,
            startdate: '2024-09-15',
            enddate: '2024-09-21',
            datatypeid: 'TMAX,TMIN,PRCP',
            limit: 50,
            units: 'standard'
          }
        });

        console.log('Got observations:', data.data.results?.length || 0);
        if (data.data.results) {
          for (const obs of data.data.results.slice(0, 10)) {
            console.log(`  ${obs.date}: ${obs.datatype} = ${obs.value}`);
          }
        }
      }
    } catch (error: any) {
      console.log('Error:', error.response?.data || error.message);
    }

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCDOLarger();
