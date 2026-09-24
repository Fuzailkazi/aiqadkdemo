#!/usr/bin/env tsx

import 'dotenv/config';
import axios from 'axios';

async function debugCDO() {
  const token = process.env.NOAA_CDO_TOKEN;
  const baseURL = 'https://www.ncei.noaa.gov/cdo-web/api/v2';

  console.log('CDO API Debug Test\n');
  console.log('Token configured:', !!token);

  const client = axios.create({
    baseURL,
    headers: {
      'token': token,
      'Accept': 'application/json'
    }
  });

  try {
    // Test 1: Get datasets
    console.log('\n=== Test 1: Available Datasets ===');
    const datasets = await client.get('/datasets');
    console.log('Datasets:', datasets.data.results?.slice(0, 3).map((d: any) => ({
      id: d.id,
      name: d.name,
      mindate: d.mindate,
      maxdate: d.maxdate
    })));

    // Test 2: Try location search with locationcategoryid
    console.log('\n=== Test 2: Search by state (DC area) ===');
    try {
      const locations = await client.get('/locations', {
        params: {
          locationcategoryid: 'CITY',
          limit: 5
        }
      });
      console.log('Found locations:', locations.data.results?.length || 0);
      if (locations.data.results) {
        for (const loc of locations.data.results.slice(0, 3)) {
          console.log(`  - ${loc.id}: ${loc.name}`);
        }
      }
    } catch (error: any) {
      console.log('Location search error:', error.response?.data || error.message);
    }

    // Test 3: Try finding stations by ZIP code area
    console.log('\n=== Test 3: Stations search (no filters) ===');
    try {
      const stations = await client.get('/stations', {
        params: {
          datasetid: 'GHCND',
          limit: 5
        }
      });
      console.log('Found stations:', stations.data.results?.length || 0);
      if (stations.data.results) {
        for (const station of stations.data.results) {
          console.log(`  - ${station.id}: ${station.name}`);
          console.log(`    Lat/Lon: ${station.latitude}, ${station.longitude}`);
          console.log(`    Dates: ${station.mindate} to ${station.maxdate}`);
        }
      }
    } catch (error: any) {
      console.log('Stations search error:', error.response?.data || error.message);
    }

    // Test 4: Try with extent parameter (the way we're currently using it)
    console.log('\n=== Test 4: Stations by extent (DC coordinates) ===');
    const lat = 38.9072;
    const lon = -77.0369;
    const extent = `${lon},${lat},${lon},${lat}`;

    try {
      const stations = await client.get('/stations', {
        params: {
          extent,
          datasetid: 'GHCND',
          startdate: '2024-09-01',
          enddate: '2024-09-30',
          limit: 5
        }
      });
      console.log('Extent:', extent);
      console.log('Found stations:', stations.data.results?.length || 0);
      if (stations.data.results) {
        for (const station of stations.data.results) {
          console.log(`  - ${station.id}: ${station.name}`);
        }
      }
    } catch (error: any) {
      console.log('Extent search error:', error.response?.data || error.message);
    }

    // Test 5: Try with a bounding box instead of a point
    console.log('\n=== Test 5: Stations by extent (bounding box around DC) ===');
    const extent2 = `${lon - 0.5},${lat - 0.5},${lon + 0.5},${lat + 0.5}`;

    try {
      const stations = await client.get('/stations', {
        params: {
          extent: extent2,
          datasetid: 'GHCND',
          startdate: '2024-09-01',
          enddate: '2024-09-30',
          limit: 10
        }
      });
      console.log('Extent (bounding box):', extent2);
      console.log('Found stations:', stations.data.results?.length || 0);
      if (stations.data.results) {
        for (const station of stations.data.results) {
          console.log(`  - ${station.id}: ${station.name}`);
          console.log(`    Lat/Lon: ${station.latitude}, ${station.longitude}`);
        }
      }
    } catch (error: any) {
      console.log('Bounding box search error:', error.response?.data || error.message);
    }

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugCDO();
