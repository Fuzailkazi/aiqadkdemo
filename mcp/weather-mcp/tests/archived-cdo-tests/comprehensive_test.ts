#!/usr/bin/env tsx

import axios from 'axios';

const LAT = 37.7749;
const LON = -122.4194;
const baseURL = 'https://api.weather.gov';
const userAgent = '(weather-mcp-test, testing@example.com)';

async function testRawAPI() {
  console.log('Testing Raw NOAA API for Edge Cases\n');

  try {
    // Get stations
    const stationsResponse = await axios.get(
      `${baseURL}/points/${LAT.toFixed(4)},${LON.toFixed(4)}/stations`,
      { headers: { 'User-Agent': userAgent } }
    );
    const stationId = stationsResponse.data.features[0].properties.stationIdentifier;
    console.log(`Using station: ${stationId}\n`);

    // Test 1: Missing date parameters completely
    console.log('Test 1: No date parameters (should return recent data)');
    const res1 = await axios.get(
      `${baseURL}/stations/${stationId}/observations?limit=5`,
      { headers: { 'User-Agent': userAgent } }
    );
    console.log(`  Result: ${res1.data.features.length} observations`);
    if (res1.data.features.length > 0) {
      console.log(`  First timestamp: ${res1.data.features[0].properties.timestamp}`);
    }
    console.log();

    // Test 2: Only start date, no end date
    console.log('Test 2: Only start date (no end date)');
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const res2 = await axios.get(
      `${baseURL}/stations/${stationId}/observations?start=${yesterday.toISOString()}&limit=5`,
      { headers: { 'User-Agent': userAgent } }
    );
    console.log(`  Result: ${res2.data.features.length} observations`);
    console.log();

    // Test 3: Only end date, no start date
    console.log('Test 3: Only end date (no start date)');
    const res3 = await axios.get(
      `${baseURL}/stations/${stationId}/observations?end=${now.toISOString()}&limit=5`,
      { headers: { 'User-Agent': userAgent } }
    );
    console.log(`  Result: ${res3.data.features.length} observations`);
    console.log();

    // Test 4: Inverted date range (start > end)
    console.log('Test 4: Inverted dates (start > end)');
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const res4 = await axios.get(
      `${baseURL}/stations/${stationId}/observations?start=${tomorrow.toISOString()}&end=${now.toISOString()}&limit=5`,
      { headers: { 'User-Agent': userAgent } }
    );
    console.log(`  Result: ${res4.data.features.length} observations`);
    console.log(`  This is problematic! No error, just 0 results.`);
    console.log();

    // Test 5: Very large limit
    console.log('Test 5: Limit > 500 (should be capped)');
    const res5 = await axios.get(
      `${baseURL}/stations/${stationId}/observations?limit=1000`,
      { headers: { 'User-Agent': userAgent } }
    );
    console.log(`  Result: ${res5.data.features.length} observations (should be at most 500)`);
    console.log();

    // Test 6: Limit = 0 (invalid)
    console.log('Test 6: Limit = 0 (invalid)');
    try {
      const res6 = await axios.get(
        `${baseURL}/stations/${stationId}/observations?limit=0`,
        { headers: { 'User-Agent': userAgent } }
      );
      console.log(`  Result: ${res6.data.features ? res6.data.features.length : 'N/A'} observations`);
    } catch (error: any) {
      console.log(`  Error: ${error.response?.status} - ${error.response?.data?.detail}`);
    }
    console.log();

    // Test 7: Empty date strings
    console.log('Test 7: Empty date strings');
    try {
      const res7 = await axios.get(
        `${baseURL}/stations/${stationId}/observations?start=&end=`,
        { headers: { 'User-Agent': userAgent } }
      );
      console.log(`  Result: ${res7.data.features?.length || 0} observations`);
    } catch (error: any) {
      console.log(`  Error: ${error.response?.status}`);
    }
    console.log();

    // Test 8: Malformed dates
    console.log('Test 8: Malformed date strings');
    try {
      const res8 = await axios.get(
        `${baseURL}/stations/${stationId}/observations?start=not-a-date&end=also-not&limit=5`,
        { headers: { 'User-Agent': userAgent } }
      );
      console.log(`  Result: ${res8.data.features?.length || 0} observations`);
    } catch (error: any) {
      console.log(`  Error: ${error.response?.status} - ${error.response?.data?.detail}`);
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testRawAPI();
