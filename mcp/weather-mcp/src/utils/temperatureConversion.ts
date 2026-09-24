/**
 * Temperature conversion utilities
 * Centralized to avoid duplication across handlers
 */

import { celsiusToFahrenheit } from './units.js';

/**
 * Convert temperature value to Fahrenheit based on unit code
 * @param value - Temperature value (can be null)
 * @param unitCode - Unit code from NOAA API (e.g., "wmoUnit:degC", "wmoUnit:degF")
 * @returns Temperature in Fahrenheit, or null if value is null
 */
export function convertToFahrenheit(value: number | null, unitCode: string): number | null {
  if (value === null) return null;
  return unitCode.includes('degC') ? celsiusToFahrenheit(value) : value;
}
