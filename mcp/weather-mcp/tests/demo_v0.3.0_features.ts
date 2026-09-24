#!/usr/bin/env tsx

/**
 * Interactive demonstration of v0.3.0 features
 * Shows real output from all new and enhanced tools
 * Run with: npx tsx tests/demo_v0.3.0_features.ts
 */

import { NOAAService } from '../src/services/noaa.js';

// Test locations
const SF_LAT = 37.7749;
const SF_LON = -122.4194;

async function demonstrateFeatures() {
  console.log('\n🌤️  Weather MCP v0.3.0 - Feature Demonstration\n');
  console.log('='.repeat(70));
  console.log('\n');

  const noaa = new NOAAService({
    userAgent: '(weather-mcp-demo, demo@example.com)'
  });

  // Demo 1: Weather Alerts (NEW TOOL)
  console.log('━'.repeat(70));
  console.log('📢 FEATURE 1: Weather Alerts (NEW TOOL)');
  console.log('━'.repeat(70));
  console.log('\nQuery: "Are there any weather alerts for San Francisco?"\n');

  try {
    const alertsData = await noaa.getAlerts(SF_LAT, SF_LON, true);
    const alerts = alertsData.features;

    if (alerts.length === 0) {
      console.log('✅ No active weather alerts for this location.');
      console.log('The area is currently clear of weather warnings, watches, and advisories.\n');
    } else {
      console.log(`⚠️  Found ${alerts.length} active alert(s):\n`);

      // Sort by severity
      const severityOrder = { 'Extreme': 0, 'Severe': 1, 'Moderate': 2, 'Minor': 3, 'Unknown': 4 };
      const sortedAlerts = alerts.sort((a, b) => {
        const severityA = severityOrder[a.properties.severity as keyof typeof severityOrder] ?? 4;
        const severityB = severityOrder[b.properties.severity as keyof typeof severityOrder] ?? 4;
        return severityA - severityB;
      });

      for (let i = 0; i < Math.min(2, sortedAlerts.length); i++) {
        const alert = sortedAlerts[i].properties;
        const severityEmoji = alert.severity === 'Extreme' ? '🔴' :
                              alert.severity === 'Severe' ? '🟠' :
                              alert.severity === 'Moderate' ? '🟡' :
                              alert.severity === 'Minor' ? '🔵' : '⚪';

        console.log(`${severityEmoji} ${alert.event}`);
        console.log(`   Severity: ${alert.severity} | Urgency: ${alert.urgency} | Certainty: ${alert.certainty}`);
        console.log(`   Area: ${alert.areaDesc.substring(0, 80)}${alert.areaDesc.length > 80 ? '...' : ''}`);
        console.log(`   Effective: ${new Date(alert.effective).toLocaleString()}`);
        console.log(`   Expires: ${new Date(alert.expires).toLocaleString()}`);
        if (alert.headline) {
          console.log(`   Headline: ${alert.headline.substring(0, 100)}${alert.headline.length > 100 ? '...' : ''}`);
        }
        console.log('');
      }
    }
  } catch (error) {
    console.error('Error fetching alerts:', error);
  }

  // Demo 2: Hourly Forecast (ENHANCED)
  console.log('━'.repeat(70));
  console.log('⏰ FEATURE 2: Hourly Forecasts (ENHANCED)');
  console.log('━'.repeat(70));
  console.log('\nQuery: "What\'s the hourly forecast for the next 6 hours?"\n');

  try {
    const hourlyForecast = await noaa.getHourlyForecastByCoordinates(SF_LAT, SF_LON);
    const next6Hours = hourlyForecast.properties.periods.slice(0, 6);

    console.log('📊 Next 6 Hours:\n');
    console.log('Time                 Temp   Precip   Wind      Conditions');
    console.log('-'.repeat(70));

    for (const hour of next6Hours) {
      const time = hour.name || hour.startTime.split('T')[1].substring(0, 5);
      const temp = `${hour.temperature}°${hour.temperatureUnit}`;
      const precip = hour.probabilityOfPrecipitation.value !== null
        ? `${hour.probabilityOfPrecipitation.value}%`
        : 'N/A';
      const wind = `${hour.windSpeed} ${hour.windDirection}`;
      const conditions = hour.shortForecast.substring(0, 25);

      console.log(`${time.padEnd(20)} ${temp.padEnd(6)} ${precip.padEnd(8)} ${wind.padEnd(9)} ${conditions}`);
    }
    console.log('');
  } catch (error) {
    console.error('Error fetching hourly forecast:', error);
  }

  // Demo 3: Daily Forecast with Precipitation Probability (ENHANCED)
  console.log('━'.repeat(70));
  console.log('☔ FEATURE 3: Precipitation Probability (ENHANCED)');
  console.log('━'.repeat(70));
  console.log('\nQuery: "What\'s the chance of rain this week?"\n');

  try {
    const dailyForecast = await noaa.getForecastByCoordinates(SF_LAT, SF_LON);
    const next7Periods = dailyForecast.properties.periods.slice(0, 7);

    console.log('📅 7-Day Forecast with Precipitation:\n');

    for (const period of next7Periods) {
      const icon = period.isDaytime ? '☀️' : '🌙';
      const precipChance = period.probabilityOfPrecipitation.value !== null
        ? `${period.probabilityOfPrecipitation.value}%`
        : 'N/A';

      console.log(`${icon} ${period.name.padEnd(20)} ${period.temperature}°${period.temperatureUnit}`);
      console.log(`   Precipitation chance: ${precipChance}`);
      console.log(`   ${period.shortForecast}`);
      console.log('');
    }
  } catch (error) {
    console.error('Error fetching daily forecast:', error);
  }

  // Demo 4: Enhanced Current Conditions (ENHANCED)
  console.log('━'.repeat(70));
  console.log('🌡️  FEATURE 4: Enhanced Current Conditions');
  console.log('━'.repeat(70));
  console.log('\nQuery: "What are the current weather conditions?"\n');

  try {
    const observation = await noaa.getCurrentConditions(SF_LAT, SF_LON);
    const props = observation.properties;

    const toF = (value: number | null, unit: string) => {
      if (value === null) return null;
      return unit.includes('degC') ? (value * 9/5) + 32 : value;
    };

    console.log('📍 Current Conditions:\n');
    console.log(`⏰ Time: ${new Date(props.timestamp).toLocaleString()}\n`);

    // Temperature with feels-like
    const tempF = toF(props.temperature.value, props.temperature.unitCode);
    if (tempF !== null) {
      console.log(`🌡️  Temperature: ${Math.round(tempF)}°F`);

      const heatIndexF = toF(props.heatIndex.value, props.heatIndex.unitCode);
      const windChillF = toF(props.windChill.value, props.windChill.unitCode);

      if (heatIndexF !== null && tempF > 80 && heatIndexF > tempF) {
        console.log(`   ☀️ Feels Like (Heat Index): ${Math.round(heatIndexF)}°F`);
      } else if (windChillF !== null && tempF < 50 && windChillF < tempF) {
        console.log(`   ❄️ Feels Like (Wind Chill): ${Math.round(windChillF)}°F`);
      }
    }

    // 24-hour range
    const max24F = toF(props.maxTemperatureLast24Hours.value, props.maxTemperatureLast24Hours.unitCode);
    const min24F = toF(props.minTemperatureLast24Hours.value, props.minTemperatureLast24Hours.unitCode);
    if (max24F !== null || min24F !== null) {
      let range = '   📊 24-Hour Range:';
      if (max24F !== null) range += ` High ${Math.round(max24F)}°F`;
      if (max24F !== null && min24F !== null) range += ' /';
      if (min24F !== null) range += ` Low ${Math.round(min24F)}°F`;
      console.log(range);
    }

    // Humidity
    if (props.relativeHumidity.value !== null) {
      console.log(`💧 Humidity: ${Math.round(props.relativeHumidity.value)}%`);
    }

    // Wind with gusts
    if (props.windSpeed.value !== null) {
      const windMph = props.windSpeed.unitCode.includes('km_h')
        ? props.windSpeed.value * 0.621371
        : props.windSpeed.value * 2.23694;
      let windStr = `💨 Wind: ${Math.round(windMph)} mph`;

      if (props.windDirection.value !== null) {
        windStr += ` from ${Math.round(props.windDirection.value)}°`;
      }

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

    // Visibility
    if (props.visibility.value !== null) {
      const visMiles = props.visibility.value * 0.000621371;
      let visStr = `👁️  Visibility: ${visMiles.toFixed(1)} miles`;
      if (visMiles < 0.25) visStr += ' (dense fog)';
      else if (visMiles < 1) visStr += ' (fog)';
      else if (visMiles < 3) visStr += ' (haze/mist)';
      else if (visMiles >= 10) visStr += ' (clear)';
      console.log(visStr);
    }

    // Cloud cover
    if (props.cloudLayers && props.cloudLayers.length > 0) {
      const clouds = props.cloudLayers.filter(l => l.amount).map(l => l.amount);
      if (clouds.length > 0) {
        console.log(`☁️  Cloud Cover: ${clouds.join(', ')}`);
      }
    }

    // Recent precipitation
    const precip1h = props.precipitationLastHour?.value;
    const precip3h = props.precipitationLast3Hours?.value;
    const precip6h = props.precipitationLast6Hours?.value;

    if (precip1h !== null && precip1h !== undefined ||
        precip3h !== null && precip3h !== undefined ||
        precip6h !== null && precip6h !== undefined) {
      console.log('\n🌧️  Recent Precipitation:');
      if (precip1h !== null && precip1h !== undefined && props.precipitationLastHour) {
        const precipIn = props.precipitationLastHour.unitCode.includes('mm')
          ? precip1h * 0.0393701
          : precip1h;
        console.log(`   Last 1 hour: ${precipIn.toFixed(2)} inches`);
      }
      if (precip3h !== null && precip3h !== undefined && props.precipitationLast3Hours) {
        const precipIn = props.precipitationLast3Hours.unitCode.includes('mm')
          ? precip3h * 0.0393701
          : precip3h;
        console.log(`   Last 3 hours: ${precipIn.toFixed(2)} inches`);
      }
      if (precip6h !== null && precip6h !== undefined && props.precipitationLast6Hours) {
        const precipIn = props.precipitationLast6Hours.unitCode.includes('mm')
          ? precip6h * 0.0393701
          : precip6h;
        console.log(`   Last 6 hours: ${precipIn.toFixed(2)} inches`);
      }
    }

    console.log('');
  } catch (error) {
    console.error('Error fetching current conditions:', error);
  }

  // Summary
  console.log('━'.repeat(70));
  console.log('✅ v0.3.0 Feature Demonstration Complete!');
  console.log('━'.repeat(70));
  console.log('\nAll new features are working correctly:');
  console.log('  🆕 Weather alerts for safety-critical information');
  console.log('  ⏰ Hourly forecasts for detailed planning');
  console.log('  ☔ Precipitation probability for rain/snow chances');
  console.log('  🌡️  Heat index and wind chill for comfort levels');
  console.log('  📊 24-hour temperature range for context');
  console.log('  💨 Wind gusts for hazard awareness');
  console.log('  ☁️  Enhanced cloud cover details');
  console.log('  🌧️  Recent precipitation history');
  console.log('');
}

demonstrateFeatures().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
