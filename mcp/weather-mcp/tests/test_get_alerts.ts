#!/usr/bin/env tsx

/**
 * Test script for get_alerts functionality
 * Run with: npx tsx tests/test_get_alerts.ts
 */

import { NOAAService } from '../src/services/noaa.js';

// Test coordinates
// Using locations that might have active alerts
const TEST_LOCATIONS = [
  { name: 'San Francisco, CA', lat: 37.7749, lon: -122.4194 },
  { name: 'Miami, FL', lat: 25.7617, lon: -80.1918 },
  { name: 'Tornado Alley, OK', lat: 35.4676, lon: -97.5164 },
  { name: 'Denver, CO', lat: 39.7392, lon: -104.9903 }
];

async function testGetAlerts() {
  console.log('🧪 Testing get_alerts functionality\n');

  const noaa = new NOAAService({
    userAgent: '(weather-mcp-test, testing@example.com)'
  });

  for (const location of TEST_LOCATIONS) {
    try {
      console.log(`Testing ${location.name} (${location.lat}, ${location.lon})...`);

      const alertsData = await noaa.getAlerts(location.lat, location.lon, true);
      const alerts = alertsData.features;

      if (alerts.length === 0) {
        console.log('✅ No active alerts for this location');
      } else {
        console.log(`⚠️  Found ${alerts.length} active alert${alerts.length > 1 ? 's' : ''}:`);

        for (const alert of alerts) {
          const props = alert.properties;
          console.log(`   - ${props.event} (${props.severity})`);
          console.log(`     Area: ${props.areaDesc}`);
          console.log(`     Expires: ${new Date(props.expires).toLocaleString()}`);

          if (props.headline) {
            console.log(`     Headline: ${props.headline}`);
          }
        }
      }
      console.log('');
    } catch (error) {
      console.error(`❌ Error testing ${location.name}:`, error);
      console.log('');
    }
  }

  console.log('\n📊 Testing alert data structure...');

  try {
    const testData = await noaa.getAlerts(TEST_LOCATIONS[0].lat, TEST_LOCATIONS[0].lon, true);

    console.log('✅ Alert response structure:');
    console.log(`   Type: ${testData.type}`);
    console.log(`   Features count: ${testData.features.length}`);

    if (testData.features.length > 0) {
      const firstAlert = testData.features[0].properties;
      console.log(`\n   First alert properties:`);
      console.log(`   - Event: ${firstAlert.event}`);
      console.log(`   - Severity: ${firstAlert.severity}`);
      console.log(`   - Urgency: ${firstAlert.urgency}`);
      console.log(`   - Certainty: ${firstAlert.certainty}`);
      console.log(`   - Effective: ${firstAlert.effective}`);
      console.log(`   - Expires: ${firstAlert.expires}`);
      console.log(`   - Area: ${firstAlert.areaDesc}`);
      console.log(`   - Response: ${firstAlert.response}`);
    }
  } catch (error) {
    console.error('❌ Error testing alert structure:', error);
  }

  console.log('\n✅ Alert testing complete!');
}

testGetAlerts().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
