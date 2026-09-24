#!/usr/bin/env tsx

/**
 * Compare daily vs hourly forecasts to show granularity options
 * Run with: npx tsx tests/demo_forecast_comparison.ts
 */

import { NOAAService } from '../src/services/noaa.js';

const SF_LAT = 37.7749;
const SF_LON = -122.4194;

async function compareForecastGranularities() {
  console.log('\n📊 Forecast Granularity Comparison\n');
  console.log('='.repeat(70));
  console.log('\n');

  const noaa = new NOAAService({
    userAgent: '(weather-mcp-demo, demo@example.com)'
  });

  // Get both daily and hourly forecasts
  console.log('Fetching forecasts...\n');
  const [dailyForecast, hourlyForecast] = await Promise.all([
    noaa.getForecastByCoordinates(SF_LAT, SF_LON),
    noaa.getHourlyForecastByCoordinates(SF_LAT, SF_LON)
  ]);

  // Show daily forecast
  console.log('━'.repeat(70));
  console.log('📅 DAILY FORECAST (Traditional)');
  console.log('━'.repeat(70));
  console.log('Best for: Week planning, general weather overview\n');

  const next4Periods = dailyForecast.properties.periods.slice(0, 4);
  for (const period of next4Periods) {
    const icon = period.isDaytime ? '☀️' : '🌙';
    const precipChance = period.probabilityOfPrecipitation.value !== null
      ? `${period.probabilityOfPrecipitation.value}%`
      : 'N/A';

    console.log(`${icon} ${period.name.padEnd(20)} ${period.temperature}°${period.temperatureUnit}`);
    console.log(`   Rain: ${precipChance.padEnd(5)} | ${period.shortForecast}`);
    console.log(`   ${period.detailedForecast.substring(0, 90)}...`);
    console.log('');
  }

  // Show hourly forecast for same time period
  console.log('━'.repeat(70));
  console.log('⏰ HOURLY FORECAST (Detailed)');
  console.log('━'.repeat(70));
  console.log('Best for: Precise timing, hour-by-hour planning\n');

  const next12Hours = hourlyForecast.properties.periods.slice(0, 12);
  console.log('Hour   Temp   Rain   Humid  Wind       Conditions');
  console.log('─'.repeat(70));

  for (const hour of next12Hours) {
    const time = hour.startTime.split('T')[1].substring(0, 5);
    const temp = `${hour.temperature}°${hour.temperatureUnit}`;
    const precip = hour.probabilityOfPrecipitation.value !== null
      ? `${hour.probabilityOfPrecipitation.value}%`
      : 'N/A';
    const humid = hour.relativeHumidity.value !== null
      ? `${Math.round(hour.relativeHumidity.value)}%`
      : 'N/A';
    const wind = `${hour.windSpeed.split(' ')[0]}mph ${hour.windDirection}`;
    const conditions = hour.shortForecast.substring(0, 20);

    console.log(
      `${time}  ${temp.padEnd(5)}  ${precip.padEnd(5)}  ${humid.padEnd(5)}  ${wind.padEnd(10)} ${conditions}`
    );
  }

  console.log('\n');

  // Comparison table
  console.log('━'.repeat(70));
  console.log('📊 FEATURE COMPARISON');
  console.log('━'.repeat(70));
  console.log('');
  console.log('Feature                    Daily          Hourly');
  console.log('─'.repeat(70));
  console.log('Periods available          14             156');
  console.log('Time resolution            12 hours       1 hour');
  console.log('Temperature                ✅             ✅');
  console.log('Precipitation %            ✅             ✅');
  console.log('Wind speed/direction       ✅             ✅');
  console.log('Humidity                   ✅             ✅');
  console.log('Detailed description       ✅             ❌');
  console.log('Short description          ✅             ✅');
  console.log('');
  console.log('Use cases:');
  console.log('  Daily:  "What\'s the weather this week?"');
  console.log('          "Should I plan outdoor activities this weekend?"');
  console.log('  Hourly: "When will the rain start?"');
  console.log('          "What time should I leave to avoid the storm?"');
  console.log('');

  console.log('━'.repeat(70));
  console.log('✅ Granularity comparison complete!');
  console.log('━'.repeat(70));
  console.log('\nKey benefits of v0.3.0 granularity parameter:');
  console.log('  • Choose the right level of detail for your needs');
  console.log('  • Daily: Week planning with rich descriptions');
  console.log('  • Hourly: Precise timing with 156 hours of data');
  console.log('  • Both include precipitation probability by default');
  console.log('  • Backward compatible - daily is the default\n');
}

compareForecastGranularities().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
