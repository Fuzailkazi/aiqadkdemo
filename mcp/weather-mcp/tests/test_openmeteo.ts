#!/usr/bin/env npx tsx
/**
 * Quick test script to verify Open-Meteo Historical Weather API integration
 */

import { OpenMeteoService } from './src/services/openmeteo.js';

async function testOpenMeteo() {
  console.log('Testing Open-Meteo Historical Weather API integration...\n');

  const service = new OpenMeteoService();

  try {
    // Test 1: Recent historical data (hourly)
    console.log('Test 1: Recent historical data for San Francisco (hourly)');
    console.log('Fetching data for 10 days ago...');
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const startDate = tenDaysAgo.toISOString().split('T')[0];
    const endDate = tenDaysAgo.toISOString().split('T')[0];

    const recentData = await service.getHistoricalWeather(
      37.7749, // San Francisco
      -122.4194,
      startDate,
      endDate,
      true // hourly
    );

    console.log(`✓ Success! Got ${recentData.hourly?.time.length || 0} hourly observations`);
    console.log(`  Location: ${recentData.latitude.toFixed(4)}°N, ${Math.abs(recentData.longitude).toFixed(4)}°W`);
    console.log(`  Elevation: ${recentData.elevation}m`);
    if (recentData.hourly?.temperature_2m?.[0] !== undefined) {
      console.log(`  First temperature reading: ${Math.round(recentData.hourly.temperature_2m[0])}°F`);
    }
    console.log();

    // Test 2: Historical data from a year ago (daily summaries)
    console.log('Test 2: Historical data for London from January 2024 (daily)');
    const yearAgoStart = '2024-01-01';
    const yearAgoEnd = '2024-01-07';

    const oldData = await service.getHistoricalWeather(
      51.5074, // London
      -0.1278,
      yearAgoStart,
      yearAgoEnd,
      false // daily summaries
    );

    console.log(`✓ Success! Got ${oldData.daily?.time.length || 0} daily summaries`);
    console.log(`  Location: ${oldData.latitude.toFixed(4)}°N, ${Math.abs(oldData.longitude).toFixed(4)}°W`);
    console.log(`  Elevation: ${oldData.elevation}m`);
    if (oldData.daily?.temperature_2m_max?.[0] !== undefined) {
      console.log(`  First day high: ${Math.round(oldData.daily.temperature_2m_max[0])}°F`);
    }
    if (oldData.daily?.temperature_2m_min?.[0] !== undefined) {
      console.log(`  First day low: ${Math.round(oldData.daily.temperature_2m_min[0])}°F`);
    }
    console.log();

    // Test 3: Test weather description mapping
    console.log('Test 3: Weather code descriptions');
    console.log(`  Code 0: ${service.getWeatherDescription(0)}`);
    console.log(`  Code 61: ${service.getWeatherDescription(61)}`);
    console.log(`  Code 95: ${service.getWeatherDescription(95)}`);
    console.log();

    console.log('✅ All tests passed! Open-Meteo integration is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testOpenMeteo();
