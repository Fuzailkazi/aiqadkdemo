#!/usr/bin/env tsx

/**
 * Demonstrate enhanced conditions in different climates
 * Shows heat index, wind chill, and other enhanced features
 * Run with: npx tsx tests/demo_extreme_conditions.ts
 */

import { NOAAService } from '../src/services/noaa.js';

const LOCATIONS = [
  { name: 'Phoenix, AZ (Hot)', lat: 33.4484, lon: -112.0740 },
  { name: 'Miami, FL (Humid)', lat: 25.7617, lon: -80.1918 },
  { name: 'Minneapolis, MN (Cold)', lat: 44.9778, lon: -93.2650 },
  { name: 'Denver, CO (High altitude)', lat: 39.7392, lon: -104.9903 }
];

async function demonstrateExtremeConditions() {
  console.log('\n🌡️  Enhanced Current Conditions - Multi-Climate Demo\n');
  console.log('='.repeat(70));
  console.log('\n');

  const noaa = new NOAAService({
    userAgent: '(weather-mcp-demo, demo@example.com)'
  });

  const toF = (value: number | null, unit: string) => {
    if (value === null) return null;
    return unit.includes('degC') ? (value * 9/5) + 32 : value;
  };

  for (const location of LOCATIONS) {
    console.log(`📍 ${location.name}`);
    console.log('─'.repeat(70));

    try {
      const observation = await noaa.getCurrentConditions(location.lat, location.lon);
      const props = observation.properties;

      console.log(`   ⏰ ${new Date(props.timestamp).toLocaleString()}\n`);

      // Temperature with feels-like
      const tempF = toF(props.temperature.value, props.temperature.unitCode);
      if (tempF !== null) {
        console.log(`   🌡️  Temperature: ${Math.round(tempF)}°F`);

        const heatIndexF = toF(props.heatIndex.value, props.heatIndex.unitCode);
        const windChillF = toF(props.windChill.value, props.windChill.unitCode);

        if (heatIndexF !== null && tempF > 80 && heatIndexF > tempF) {
          const diff = Math.round(heatIndexF - tempF);
          console.log(`   ☀️  Feels Like (Heat Index): ${Math.round(heatIndexF)}°F (+${diff}°F)`);
          console.log(`       ⚠️  Heat index makes it feel ${diff}°F hotter!`);
        } else if (windChillF !== null && tempF < 50 && windChillF < tempF) {
          const diff = Math.round(tempF - windChillF);
          console.log(`   ❄️  Feels Like (Wind Chill): ${Math.round(windChillF)}°F (-${diff}°F)`);
          console.log(`       ⚠️  Wind chill makes it feel ${diff}°F colder!`);
        } else {
          console.log(`   ✅ Feels-like temperature: comfortable (no heat index or wind chill)`);
        }
      }

      // 24-hour range
      const max24F = toF(props.maxTemperatureLast24Hours.value, props.maxTemperatureLast24Hours.unitCode);
      const min24F = toF(props.minTemperatureLast24Hours.value, props.minTemperatureLast24Hours.unitCode);
      if (max24F !== null || min24F !== null) {
        console.log('   📊 24-Hour Range:');
        if (max24F !== null) console.log(`       High: ${Math.round(max24F)}°F`);
        if (min24F !== null) console.log(`       Low: ${Math.round(min24F)}°F`);
        if (max24F !== null && min24F !== null) {
          const range = Math.round(max24F - min24F);
          console.log(`       Daily swing: ${range}°F`);
        }
      }

      // Humidity
      if (props.relativeHumidity.value !== null) {
        const humidity = Math.round(props.relativeHumidity.value);
        let humidityNote = '';
        if (humidity > 70) humidityNote = ' (humid)';
        else if (humidity < 30) humidityNote = ' (dry)';
        console.log(`   💧 Humidity: ${humidity}%${humidityNote}`);
      }

      // Wind with gusts
      if (props.windSpeed.value !== null) {
        const windMph = props.windSpeed.unitCode.includes('km_h')
          ? props.windSpeed.value * 0.621371
          : props.windSpeed.value * 2.23694;

        if (props.windGust.value !== null) {
          const gustMph = props.windGust.unitCode.includes('km_h')
            ? props.windGust.value * 0.621371
            : props.windGust.value * 2.23694;
          if (gustMph > windMph * 1.2) {
            console.log(`   💨 Wind: ${Math.round(windMph)} mph, gusting to ${Math.round(gustMph)} mph`);
            console.log(`       ⚠️  Gusts ${Math.round((gustMph - windMph) / windMph * 100)}% stronger than sustained wind!`);
          } else {
            console.log(`   💨 Wind: ${Math.round(windMph)} mph (no significant gusts)`);
          }
        } else {
          console.log(`   💨 Wind: ${Math.round(windMph)} mph`);
        }
      }

      // Visibility
      if (props.visibility.value !== null) {
        const visMiles = props.visibility.value * 0.000621371;
        let visNote = '';
        if (visMiles < 0.25) visNote = ' (⚠️  dense fog!)';
        else if (visMiles < 1) visNote = ' (⚠️  fog)';
        else if (visMiles < 3) visNote = ' (haze/mist)';
        else if (visMiles >= 10) visNote = ' (excellent)';
        console.log(`   👁️  Visibility: ${visMiles.toFixed(1)} miles${visNote}`);
      }

      // Cloud cover
      if (props.cloudLayers && props.cloudLayers.length > 0) {
        const layers = props.cloudLayers
          .filter(l => l.amount)
          .map(l => {
            const cloudDescriptions: { [key: string]: string } = {
              'FEW': 'Few',
              'SCT': 'Scattered',
              'BKN': 'Broken',
              'OVC': 'Overcast',
              'CLR': 'Clear',
              'SKC': 'Clear'
            };
            return cloudDescriptions[l.amount] || l.amount;
          });
        if (layers.length > 0) {
          console.log(`   ☁️  Sky: ${layers.join(', ')}`);
        }
      }

      console.log('');
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  console.log('='.repeat(70));
  console.log('\n✅ Enhanced conditions demo complete!\n');
  console.log('Key enhancements shown:');
  console.log('  • Heat index and wind chill with delta calculations');
  console.log('  • 24-hour temperature range with daily swing');
  console.log('  • Humidity comfort levels');
  console.log('  • Wind gust percentage increases');
  console.log('  • Visibility hazard warnings');
  console.log('  • Enhanced cloud cover descriptions\n');
}

demonstrateExtremeConditions().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
