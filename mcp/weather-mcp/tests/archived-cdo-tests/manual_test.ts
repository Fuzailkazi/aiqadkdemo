#!/usr/bin/env tsx

import { NOAAService } from './src/services/noaa.js';

const LAT = 37.7749;
const LON = -122.4194;

async function testHistoricalDateScenarios() {
  const noaa = new NOAAService({
    userAgent: '(weather-mcp-test, testing@example.com)'
  });

  console.log('Testing Historical Weather with Different Date Scenarios\n');

  try {
    // Scenario 1: Get stations first to confirm we have one
    console.log('Getting stations...');
    const stations = await noaa.getStations(LAT, LON);
    console.log(`Found ${stations.features.length} stations`);
    const stationId = stations.features[0].properties.stationIdentifier;
    console.log(`Using station: ${stationId}\n`);

    // Scenario 2: Last 24 hours
    console.log('Scenario 1: Last 24 hours');
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    console.log(`  From: ${yesterday.toISOString()}`);
    console.log(`  To:   ${now.toISOString()}`);
    
    const obs24 = await noaa.getObservations(stationId, yesterday, now, 50);
    console.log(`  Result: ${obs24.features.length} observations\n`);

    // Scenario 3: Last 7 days
    console.log('Scenario 2: Last 7 days');
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    console.log(`  From: ${weekAgo.toISOString()}`);
    console.log(`  To:   ${now.toISOString()}`);
    
    const obs7d = await noaa.getObservations(stationId, weekAgo, now, 168);
    console.log(`  Result: ${obs7d.features.length} observations\n`);

    // Scenario 4: Just dates (without time)
    console.log('Scenario 3: Date-only format (no time)');
    const startDateOnly = new Date('2025-11-02');
    const endDateOnly = new Date('2025-11-04');
    console.log(`  From: ${startDateOnly.toISOString()}`);
    console.log(`  To:   ${endDateOnly.toISOString()}`);
    
    const obsDateOnly = await noaa.getObservations(stationId, startDateOnly, endDateOnly, 168);
    console.log(`  Result: ${obsDateOnly.features.length} observations\n`);

    // Scenario 5: Future dates (should return nothing or error)
    console.log('Scenario 4: Future dates (should return nothing)');
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
    console.log(`  From: ${tomorrow.toISOString()}`);
    console.log(`  To:   ${dayAfter.toISOString()}`);
    
    const obsFuture = await noaa.getObservations(stationId, tomorrow, dayAfter, 10);
    console.log(`  Result: ${obsFuture.features.length} observations\n`);

    // Scenario 6: Very old dates (should return nothing)
    console.log('Scenario 5: Very old dates (30+ days)');
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twentyNineDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    console.log(`  From: ${twentyNineDaysAgo.toISOString()}`);
    console.log(`  To:   ${thirtyDaysAgo.toISOString()}`);
    
    const obsOld = await noaa.getObservations(stationId, twentyNineDaysAgo, thirtyDaysAgo, 10);
    console.log(`  Result: ${obsOld.features.length} observations\n`);

    console.log('All scenarios completed successfully!');

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

testHistoricalDateScenarios();
