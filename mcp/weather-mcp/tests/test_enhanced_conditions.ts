#!/usr/bin/env tsx

/**
 * Test script for enhanced get_current_conditions functionality
 * Tests heat index, wind chill, 24hr range, precipitation, cloud cover
 * Run with: npx tsx tests/test_enhanced_conditions.ts
 */

import { NOAAService } from '../src/services/noaa.js';

// Test coordinates (various climates)
const TEST_LOCATIONS = [
  { name: 'San Francisco, CA', lat: 37.7749, lon: -122.4194 },
  { name: 'Phoenix, AZ (hot)', lat: 33.4484, lon: -112.0740 },
  { name: 'Miami, FL (humid)', lat: 25.7617, lon: -80.1918 },
  { name: 'Minneapolis, MN (cold)', lat: 44.9778, lon: -93.2650 }
];

async function testEnhancedConditions() {
  console.log('🧪 Testing enhanced current conditions functionality\n');

  const noaa = new NOAAService({
    userAgent: '(weather-mcp-test, testing@example.com)'
  });

  for (const location of TEST_LOCATIONS) {
    try {
      console.log(`Testing ${location.name}...`);

      const observation = await noaa.getCurrentConditions(location.lat, location.lon);
      const props = observation.properties;

      // Helper function
      const toF = (value: number | null, unit: string) => {
        if (value === null) return null;
        return unit.includes('degC') ? (value * 9/5) + 32 : value;
      };

      console.log('✅ Observation retrieved');
      console.log(`   Time: ${new Date(props.timestamp).toLocaleString()}`);

      // Temperature
      const tempF = toF(props.temperature.value, props.temperature.unitCode);
      if (tempF !== null) {
        console.log(`   Temperature: ${Math.round(tempF)}°F`);
      }

      // Heat Index
      const heatIndexF = toF(props.heatIndex.value, props.heatIndex.unitCode);
      if (heatIndexF !== null && tempF && tempF > 80 && heatIndexF > tempF) {
        console.log(`   ☀️ Heat Index: ${Math.round(heatIndexF)}°F`);
      }

      // Wind Chill
      const windChillF = toF(props.windChill.value, props.windChill.unitCode);
      if (windChillF !== null && tempF && tempF < 50 && windChillF < tempF) {
        console.log(`   ❄️ Wind Chill: ${Math.round(windChillF)}°F`);
      }

      // 24-hour range
      const max24F = toF(props.maxTemperatureLast24Hours.value, props.maxTemperatureLast24Hours.unitCode);
      const min24F = toF(props.minTemperatureLast24Hours.value, props.minTemperatureLast24Hours.unitCode);
      if (max24F !== null || min24F !== null) {
        let range = '   24hr Range:';
        if (max24F !== null) range += ` High ${Math.round(max24F)}°F`;
        if (max24F !== null && min24F !== null) range += ' /';
        if (min24F !== null) range += ` Low ${Math.round(min24F)}°F`;
        console.log(range);
      }

      // Wind with gusts
      if (props.windSpeed.value !== null) {
        const windMph = props.windSpeed.unitCode.includes('km_h')
          ? props.windSpeed.value * 0.621371
          : props.windSpeed.value * 2.23694;
        let windStr = `   Wind: ${Math.round(windMph)} mph`;

        if (props.windGust.value !== null) {
          const gustMph = props.windGust.unitCode.includes('km_h')
            ? props.windGust.value * 0.621371
            : props.windGust.value * 2.23694;
          if (gustMph > windMph * 1.2) {
            windStr += `, gusting to ${Math.round(gustMph)} mph`;
          }
        }
        console.log(windStr);
      }

      // Cloud cover
      if (props.cloudLayers && props.cloudLayers.length > 0) {
        const layers = props.cloudLayers.filter(l => l.amount).map(l => l.amount);
        if (layers.length > 0) {
          console.log(`   Clouds: ${layers.join(', ')}`);
        }
      }

      // Visibility
      if (props.visibility.value !== null) {
        const visMiles = props.visibility.value * 0.000621371;
        console.log(`   Visibility: ${visMiles.toFixed(1)} miles`);
      }

      // Precipitation (optional fields)
      const precip1h = props.precipitationLastHour?.value;
      const precip3h = props.precipitationLast3Hours?.value;
      const precip6h = props.precipitationLast6Hours?.value;

      if (precip1h !== null && precip1h !== undefined ||
          precip3h !== null && precip3h !== undefined ||
          precip6h !== null && precip6h !== undefined) {
        console.log('   Recent precipitation:');
        if (precip1h !== null && precip1h !== undefined && props.precipitationLastHour) {
          const precipIn = props.precipitationLastHour.unitCode.includes('mm')
            ? precip1h * 0.0393701
            : precip1h;
          console.log(`     Last 1hr: ${precipIn.toFixed(2)} in`);
        }
        if (precip3h !== null && precip3h !== undefined && props.precipitationLast3Hours) {
          const precipIn = props.precipitationLast3Hours.unitCode.includes('mm')
            ? precip3h * 0.0393701
            : precip3h;
          console.log(`     Last 3hr: ${precipIn.toFixed(2)} in`);
        }
        if (precip6h !== null && precip6h !== undefined && props.precipitationLast6Hours) {
          const precipIn = props.precipitationLast6Hours.unitCode.includes('mm')
            ? precip6h * 0.0393701
            : precip6h;
          console.log(`     Last 6hr: ${precipIn.toFixed(2)} in`);
        }
      }

      console.log('');
    } catch (error) {
      console.error(`❌ Error testing ${location.name}:`, error);
      console.log('');
    }
  }

  console.log('✅ Enhanced conditions testing complete!');
}

testEnhancedConditions().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
