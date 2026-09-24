#!/usr/bin/env tsx

/**
 * Test script for enhanced get_forecast functionality
 * Tests hourly granularity and precipitation probability
 * Run with: npx tsx tests/test_enhanced_forecast.ts
 */

import { NOAAService } from '../src/services/noaa.js';

// Test coordinates (San Francisco, CA)
const TEST_LAT = 37.7749;
const TEST_LON = -122.4194;

async function testEnhancedForecast() {
  console.log('🧪 Testing enhanced forecast functionality\n');

  const noaa = new NOAAService({
    userAgent: '(weather-mcp-test, testing@example.com)'
  });

  try {
    // Test 1: Daily forecast (existing functionality)
    console.log('Test 1: Daily forecast (default)...');
    const dailyForecast = await noaa.getForecastByCoordinates(TEST_LAT, TEST_LON);
    console.log('✅ Daily forecast retrieved successfully');
    console.log(`   Periods: ${dailyForecast.properties.periods.length}`);
    console.log(`   First period: ${dailyForecast.properties.periods[0].name}`);
    console.log(`   Temperature: ${dailyForecast.properties.periods[0].temperature}°${dailyForecast.properties.periods[0].temperatureUnit}`);

    const firstPeriod = dailyForecast.properties.periods[0];
    if (firstPeriod.probabilityOfPrecipitation.value !== null) {
      console.log(`   Precipitation probability: ${firstPeriod.probabilityOfPrecipitation.value}%`);
    } else {
      console.log(`   Precipitation probability: Not available`);
    }
    console.log('');

    // Test 2: Hourly forecast (new functionality)
    console.log('Test 2: Hourly forecast...');
    const hourlyForecast = await noaa.getHourlyForecastByCoordinates(TEST_LAT, TEST_LON);
    console.log('✅ Hourly forecast retrieved successfully');
    console.log(`   Total periods: ${hourlyForecast.properties.periods.length}`);
    console.log(`   First hour: ${hourlyForecast.properties.periods[0].name}`);
    console.log(`   Temperature: ${hourlyForecast.properties.periods[0].temperature}°${hourlyForecast.properties.periods[0].temperatureUnit}`);

    const firstHour = hourlyForecast.properties.periods[0];
    if (firstHour.probabilityOfPrecipitation.value !== null) {
      console.log(`   Precipitation probability: ${firstHour.probabilityOfPrecipitation.value}%`);
    }
    if (firstHour.relativeHumidity.value !== null) {
      console.log(`   Humidity: ${firstHour.relativeHumidity.value}%`);
    }
    console.log('');

    // Test 3: Show sample hourly data
    console.log('Test 3: Sample hourly data (next 6 hours)...');
    const next6Hours = hourlyForecast.properties.periods.slice(0, 6);
    console.log('');
    for (const hour of next6Hours) {
      let line = `   ${hour.name.padEnd(20)} ${hour.temperature}°${hour.temperatureUnit}`;
      if (hour.probabilityOfPrecipitation.value !== null) {
        line += ` | Rain: ${hour.probabilityOfPrecipitation.value}%`;
      }
      line += ` | ${hour.shortForecast}`;
      console.log(line);
    }
    console.log('');

    // Test 4: Verify precipitation probability data
    console.log('Test 4: Checking precipitation probability availability...');
    const periodsWithPrecip = dailyForecast.properties.periods.filter(
      p => p.probabilityOfPrecipitation.value !== null
    );
    console.log(`   Daily periods with precip data: ${periodsWithPrecip.length}/${dailyForecast.properties.periods.length}`);

    const hourlyPeriodsWithPrecip = hourlyForecast.properties.periods.filter(
      p => p.probabilityOfPrecipitation.value !== null
    );
    console.log(`   Hourly periods with precip data: ${hourlyPeriodsWithPrecip.length}/${hourlyForecast.properties.periods.length}`);
    console.log('');

    console.log('✅ All enhanced forecast tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testEnhancedForecast().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
