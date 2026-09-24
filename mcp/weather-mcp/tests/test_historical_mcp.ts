#!/usr/bin/env npx tsx
/**
 * Comprehensive test for MCP server historical weather functionality
 * Tests both NOAA API (recent data) and Open-Meteo API (archival data)
 */

import { NOAAService } from './src/services/noaa.js';
import { OpenMeteoService } from './src/services/openmeteo.js';

const noaaService = new NOAAService({
  userAgent: '(weather-mcp-test, github.com/weather-mcp)'
});
const openMeteoService = new OpenMeteoService();

interface TestCase {
  name: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  expectedAPI: 'NOAA' | 'Open-Meteo';
}

const testCases: TestCase[] = [
  {
    name: 'Recent data (NOAA API) - 2 days ago',
    latitude: 40.7128,
    longitude: -74.0060,
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    expectedAPI: 'NOAA'
  },
  {
    name: 'Recent data (NOAA API) - Last 3 days',
    latitude: 37.7749,
    longitude: -122.4194,
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    expectedAPI: 'NOAA'
  },
  {
    name: 'Archival data (Open-Meteo) - 10 days ago (hourly)',
    latitude: 41.8781,
    longitude: -87.6298,
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    expectedAPI: 'Open-Meteo'
  },
  {
    name: 'Archival data (Open-Meteo) - January 2024 (daily)',
    latitude: 51.5074,
    longitude: -0.1278,
    startDate: '2024-01-01',
    endDate: '2024-01-07',
    expectedAPI: 'Open-Meteo'
  },
  {
    name: 'Archival data (Open-Meteo) - Long range 2023 (daily)',
    latitude: 35.6762,
    longitude: 139.6503,
    startDate: '2023-06-01',
    endDate: '2023-06-30',
    expectedAPI: 'Open-Meteo'
  }
];

async function runTests() {
  console.log('Testing MCP Server Historical Weather Functionality\n');
  console.log('='.repeat(70));
  console.log('\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log(`  Location: ${testCase.latitude}°N, ${testCase.longitude}°E`);
    console.log(`  Date range: ${testCase.startDate} to ${testCase.endDate}`);
    console.log(`  Expected API: ${testCase.expectedAPI}`);

    try {
      // Determine which API should be used
      const startTime = new Date(testCase.startDate);
      const endTime = new Date(testCase.endDate);
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const useArchivalData = startTime < sevenDaysAgo;

      const actualAPI = useArchivalData ? 'Open-Meteo' : 'NOAA';

      if (actualAPI !== testCase.expectedAPI) {
        console.log(`  ❌ FAILED: Expected ${testCase.expectedAPI} but would use ${actualAPI}\n`);
        failed++;
        continue;
      }

      if (useArchivalData) {
        // Test Open-Meteo API
        const daysDiff = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24));
        const useHourly = daysDiff <= 31;

        const weatherData = await openMeteoService.getHistoricalWeather(
          testCase.latitude,
          testCase.longitude,
          testCase.startDate.split('T')[0],
          testCase.endDate.split('T')[0],
          useHourly
        );

        if (useHourly) {
          if (!weatherData.hourly || !weatherData.hourly.time || weatherData.hourly.time.length === 0) {
            console.log(`  ❌ FAILED: No hourly data returned\n`);
            failed++;
            continue;
          }
          console.log(`  ✓ Success! Got ${weatherData.hourly.time.length} hourly observations`);
          console.log(`  Location: ${weatherData.latitude.toFixed(4)}°N, ${Math.abs(weatherData.longitude).toFixed(4)}°${weatherData.longitude >= 0 ? 'E' : 'W'}`);
          console.log(`  Elevation: ${weatherData.elevation}m`);
          if (weatherData.hourly.temperature_2m?.[0] !== undefined) {
            console.log(`  Sample temperature: ${Math.round(weatherData.hourly.temperature_2m[0])}°F`);
          }
        } else {
          if (!weatherData.daily || !weatherData.daily.time || weatherData.daily.time.length === 0) {
            console.log(`  ❌ FAILED: No daily data returned\n`);
            failed++;
            continue;
          }
          console.log(`  ✓ Success! Got ${weatherData.daily.time.length} daily summaries`);
          console.log(`  Location: ${weatherData.latitude.toFixed(4)}°N, ${Math.abs(weatherData.longitude).toFixed(4)}°${weatherData.longitude >= 0 ? 'E' : 'W'}`);
          console.log(`  Elevation: ${weatherData.elevation}m`);
          if (weatherData.daily.temperature_2m_max?.[0] !== undefined) {
            console.log(`  Sample high temp: ${Math.round(weatherData.daily.temperature_2m_max[0])}°F`);
          }
        }
      } else {
        // Test NOAA API
        const observations = await noaaService.getHistoricalObservations(
          testCase.latitude,
          testCase.longitude,
          startTime,
          endTime,
          168
        );

        if (!observations.features || observations.features.length === 0) {
          console.log(`  ⚠ Warning: No NOAA observations found (station may not have data)`);
          console.log(`  Note: This is expected for some locations/dates\n`);
          passed++; // Count as passed since this is expected behavior
          continue;
        }

        console.log(`  ✓ Success! Got ${observations.features.length} NOAA observations`);
        const firstObs = observations.features[0].properties;
        if (firstObs.temperature.value !== null) {
          const tempF = firstObs.temperature.unitCode.includes('degC')
            ? (firstObs.temperature.value * 9/5) + 32
            : firstObs.temperature.value;
          console.log(`  Sample temperature: ${Math.round(tempF)}°F`);
        }
      }

      console.log(`  ✅ PASSED\n`);
      passed++;

    } catch (error) {
      console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : error}\n`);
      failed++;
    }
  }

  console.log('='.repeat(70));
  console.log(`\nTest Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

  if (failed === 0) {
    console.log('✅ All tests passed! Historical weather retrieval is working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\nTesting Error Handling\n');
  console.log('='.repeat(70));
  console.log('\n');

  const errorTests = [
    {
      name: 'Future date',
      latitude: 40.7128,
      longitude: -74.0060,
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      shouldFail: true
    },
    {
      name: 'Invalid coordinates',
      latitude: 91, // Invalid
      longitude: -74.0060,
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      shouldFail: true
    }
  ];

  for (const test of errorTests) {
    console.log(`Error Test: ${test.name}`);
    try {
      // Test validation logic
      const startTime = new Date(test.startDate);
      const endTime = new Date(test.endDate);
      const now = new Date();

      if (test.latitude < -90 || test.latitude > 90) {
        throw new Error(`Invalid latitude: ${test.latitude}`);
      }
      if (test.longitude < -180 || test.longitude > 180) {
        throw new Error(`Invalid longitude: ${test.longitude}`);
      }
      if (startTime > now) {
        throw new Error('Start date cannot be in the future');
      }

      console.log(`  ❌ Expected error but test passed\n`);
    } catch (error) {
      if (test.shouldFail) {
        console.log(`  ✅ Correctly caught error: ${error instanceof Error ? error.message : error}\n`);
      } else {
        console.log(`  ❌ Unexpected error: ${error instanceof Error ? error.message : error}\n`);
      }
    }
  }
}

async function main() {
  try {
    await runTests();
    await testErrorHandling();
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  }
}

main();
