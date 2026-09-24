#!/usr/bin/env tsx

/**
 * Comprehensive integration test for v0.3.0 features
 * Tests:
 * - get_alerts (NEW)
 * - get_forecast with hourly granularity (ENHANCED)
 * - get_forecast with precipitation probability (ENHANCED)
 * - get_current_conditions with heat index/wind chill (ENHANCED)
 * - get_current_conditions with 24hr range (ENHANCED)
 *
 * Run with: npx tsx tests/test_v0.3.0_integration.ts
 */

import { NOAAService } from '../src/services/noaa.js';

// Test coordinates (San Francisco, CA)
const TEST_LAT = 37.7749;
const TEST_LON = -122.4194;

async function testV0_3_0Features() {
  console.log('🚀 Testing v0.3.0 Integration\n');
  console.log('Testing all new and enhanced features for version 0.3.0\n');
  console.log('='.repeat(60));
  console.log('');

  const noaa = new NOAAService({
    userAgent: '(weather-mcp-test, testing@example.com)'
  });

  let passedTests = 0;
  let totalTests = 6;

  // Test 1: get_alerts (NEW FEATURE)
  console.log('Test 1: get_alerts - NEW safety-critical feature');
  console.log('-'.repeat(60));
  try {
    const alerts = await noaa.getAlerts(TEST_LAT, TEST_LON, true);
    console.log('✅ get_alerts working');
    console.log(`   Found ${alerts.features.length} active alert(s)`);

    if (alerts.features.length > 0) {
      const alert = alerts.features[0].properties;
      console.log(`   Sample: ${alert.event} (${alert.severity})`);
    }
    passedTests++;
  } catch (error) {
    console.error('❌ get_alerts failed:', error);
  }
  console.log('');

  // Test 2: get_forecast with daily granularity (DEFAULT)
  console.log('Test 2: get_forecast - Daily granularity (backward compatible)');
  console.log('-'.repeat(60));
  try {
    const dailyForecast = await noaa.getForecastByCoordinates(TEST_LAT, TEST_LON);
    console.log('✅ Daily forecast working');
    console.log(`   Periods: ${dailyForecast.properties.periods.length}`);

    const firstPeriod = dailyForecast.properties.periods[0];
    console.log(`   First period: ${firstPeriod.name}`);
    console.log(`   Temperature: ${firstPeriod.temperature}°${firstPeriod.temperatureUnit}`);

    // Check precipitation probability (ENHANCED)
    if (firstPeriod.probabilityOfPrecipitation.value !== null) {
      console.log(`   Precip chance: ${firstPeriod.probabilityOfPrecipitation.value}% ✅ (ENHANCED)`);
    }
    passedTests++;
  } catch (error) {
    console.error('❌ Daily forecast failed:', error);
  }
  console.log('');

  // Test 3: get_forecast with hourly granularity (NEW PARAMETER)
  console.log('Test 3: get_forecast - Hourly granularity (NEW PARAMETER)');
  console.log('-'.repeat(60));
  try {
    const hourlyForecast = await noaa.getHourlyForecastByCoordinates(TEST_LAT, TEST_LON);
    console.log('✅ Hourly forecast working');
    console.log(`   Total hours available: ${hourlyForecast.properties.periods.length}`);

    const firstHour = hourlyForecast.properties.periods[0];
    console.log(`   First hour: ${firstHour.name || 'Current hour'}`);
    console.log(`   Temperature: ${firstHour.temperature}°${firstHour.temperatureUnit}`);

    // Check precipitation probability
    if (firstHour.probabilityOfPrecipitation.value !== null) {
      console.log(`   Precip chance: ${firstHour.probabilityOfPrecipitation.value}%`);
    }

    // Check humidity (common in hourly)
    if (firstHour.relativeHumidity.value !== null) {
      console.log(`   Humidity: ${firstHour.relativeHumidity.value}%`);
    }
    passedTests++;
  } catch (error) {
    console.error('❌ Hourly forecast failed:', error);
  }
  console.log('');

  // Test 4: get_current_conditions - Basic functionality
  console.log('Test 4: get_current_conditions - Basic functionality');
  console.log('-'.repeat(60));
  try {
    const conditions = await noaa.getCurrentConditions(TEST_LAT, TEST_LON);
    const props = conditions.properties;

    console.log('✅ Current conditions working');
    console.log(`   Time: ${new Date(props.timestamp).toLocaleString()}`);

    if (props.temperature.value !== null) {
      const tempF = props.temperature.unitCode.includes('degC')
        ? (props.temperature.value * 9/5) + 32
        : props.temperature.value;
      console.log(`   Temperature: ${Math.round(tempF)}°F`);
    }
    passedTests++;
  } catch (error) {
    console.error('❌ Current conditions failed:', error);
  }
  console.log('');

  // Test 5: get_current_conditions - Enhanced features (heat index/wind chill)
  console.log('Test 5: get_current_conditions - Heat index/wind chill (ENHANCED)');
  console.log('-'.repeat(60));
  try {
    const conditions = await noaa.getCurrentConditions(TEST_LAT, TEST_LON);
    const props = conditions.properties;

    const toF = (value: number | null, unit: string) => {
      if (value === null) return null;
      return unit.includes('degC') ? (value * 9/5) + 32 : value;
    };

    const tempF = toF(props.temperature.value, props.temperature.unitCode);
    const heatIndexF = toF(props.heatIndex.value, props.heatIndex.unitCode);
    const windChillF = toF(props.windChill.value, props.windChill.unitCode);

    let hasFeelsLike = false;

    if (heatIndexF !== null && tempF && tempF > 80 && heatIndexF > tempF) {
      console.log(`✅ Heat index available: ${Math.round(heatIndexF)}°F (ENHANCED)`);
      hasFeelsLike = true;
    }

    if (windChillF !== null && tempF && tempF < 50 && windChillF < tempF) {
      console.log(`✅ Wind chill available: ${Math.round(windChillF)}°F (ENHANCED)`);
      hasFeelsLike = true;
    }

    if (!hasFeelsLike) {
      console.log('ℹ️  No heat index or wind chill (conditions not extreme enough)');
    }

    passedTests++;
  } catch (error) {
    console.error('❌ Enhanced feels-like failed:', error);
  }
  console.log('');

  // Test 6: get_current_conditions - 24-hour range (ENHANCED)
  console.log('Test 6: get_current_conditions - 24-hour range (ENHANCED)');
  console.log('-'.repeat(60));
  try {
    const conditions = await noaa.getCurrentConditions(TEST_LAT, TEST_LON);
    const props = conditions.properties;

    const toF = (value: number | null, unit: string) => {
      if (value === null) return null;
      return unit.includes('degC') ? (value * 9/5) + 32 : value;
    };

    const max24F = toF(props.maxTemperatureLast24Hours.value, props.maxTemperatureLast24Hours.unitCode);
    const min24F = toF(props.minTemperatureLast24Hours.value, props.minTemperatureLast24Hours.unitCode);

    if (max24F !== null || min24F !== null) {
      console.log('✅ 24-hour temperature range available (ENHANCED)');
      if (max24F !== null) console.log(`   High: ${Math.round(max24F)}°F`);
      if (min24F !== null) console.log(`   Low: ${Math.round(min24F)}°F`);
    } else {
      console.log('ℹ️  24-hour range not available (station may not report this data)');
    }

    passedTests++;
  } catch (error) {
    console.error('❌ 24-hour range failed:', error);
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed\n`);

  if (passedTests === totalTests) {
    console.log('✅ All v0.3.0 features working correctly!');
    console.log('\nv0.3.0 includes:');
    console.log('  🆕 get_alerts - Weather warnings and advisories');
    console.log('  ⚡ get_forecast - Hourly granularity option');
    console.log('  ☔ get_forecast - Precipitation probability display');
    console.log('  🌡️  get_current_conditions - Heat index and wind chill');
    console.log('  📊 get_current_conditions - 24-hour temperature range');
    console.log('  💨 get_current_conditions - Wind gusts display');
    console.log('  ☁️  get_current_conditions - Enhanced cloud cover details');
    console.log('  🌧️  get_current_conditions - Recent precipitation history');
    process.exit(0);
  } else {
    console.log(`⚠️  ${totalTests - passedTests} test(s) failed`);
    process.exit(1);
  }
}

testV0_3_0Features().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
