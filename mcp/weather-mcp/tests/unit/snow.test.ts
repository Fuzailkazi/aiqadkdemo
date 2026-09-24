/**
 * Unit tests for snow/ice utilities
 */

import { describe, it, expect } from 'vitest';
import {
  extractSnowDepth,
  extractSnowfallForecast,
  extractIceAccumulation,
  formatSnowData,
  hasWinterWeather,
  type SnowData
} from '../../src/utils/snow.js';
import type { ObservationProperties, GridpointProperties } from '../../src/types/noaa.js';

describe('Snow/Ice Utilities', () => {
  describe('extractSnowDepth', () => {
    it('should extract snow depth from centimeters', () => {
      const observation = {
        snowDepth: {
          value: 10, // 10 cm = ~3.9 inches
          unitCode: 'wmoUnit:cm'
        }
      } as ObservationProperties;

      const result = extractSnowDepth(observation);

      expect(result).toBeDefined();
      expect(result?.value).toBeCloseTo(3.9, 1);
      expect(result?.unit).toBe('in');
    });

    it('should extract snow depth from millimeters', () => {
      const observation = {
        snowDepth: {
          value: 254, // 254 mm = 10 inches
          unitCode: 'wmoUnit:mm'
        }
      } as ObservationProperties;

      const result = extractSnowDepth(observation);

      expect(result).toBeDefined();
      expect(result?.value).toBe(10);
      expect(result?.unit).toBe('in');
    });

    it('should extract snow depth from meters', () => {
      const observation = {
        snowDepth: {
          value: 0.5, // 0.5 m = ~19.7 inches
          unitCode: 'wmoUnit:m'
        }
      } as ObservationProperties;

      const result = extractSnowDepth(observation);

      expect(result).toBeDefined();
      expect(result?.value).toBeCloseTo(19.7, 1);
      expect(result?.unit).toBe('in');
    });

    it('should return undefined for null snow depth', () => {
      const observation = {
        snowDepth: {
          value: null,
          unitCode: 'wmoUnit:cm'
        }
      } as ObservationProperties;

      const result = extractSnowDepth(observation);

      expect(result).toBeUndefined();
    });

    it('should return undefined for missing snow depth', () => {
      const observation = {} as ObservationProperties;

      const result = extractSnowDepth(observation);

      expect(result).toBeUndefined();
    });

    it('should return undefined for trace amounts (< 0.1 inch)', () => {
      const observation = {
        snowDepth: {
          value: 0.2, // 0.2 cm = ~0.08 inches (trace)
          unitCode: 'wmoUnit:cm'
        }
      } as ObservationProperties;

      const result = extractSnowDepth(observation);

      expect(result).toBeUndefined();
    });

    it('should round to 1 decimal place', () => {
      const observation = {
        snowDepth: {
          value: 12.7, // 12.7 cm = 5.0 inches
          unitCode: 'wmoUnit:cm'
        }
      } as ObservationProperties;

      const result = extractSnowDepth(observation);

      expect(result?.value).toBe(5.0);
    });
  });

  describe('extractSnowfallForecast', () => {
    it('should extract total snowfall from gridpoint data', () => {
      const gridpoint = {
        snowfallAmount: {
          uom: 'wmoUnit:mm',
          values: [
            {
              validTime: '2025-11-07T12:00:00+00:00/PT6H',
              value: 25.4 // 25.4 mm = 1 inch
            },
            {
              validTime: '2025-11-07T18:00:00+00:00/PT6H',
              value: 50.8 // 50.8 mm = 2 inches
            }
          ]
        }
      } as unknown as GridpointProperties;

      const result = extractSnowfallForecast(gridpoint);

      expect(result).toBeDefined();
      expect(result?.value).toBe(3.0); // 1 + 2 = 3 inches
      expect(result?.unit).toBe('in');
    });

    it('should filter snowfall by time range', () => {
      const startTime = new Date('2025-11-07T15:00:00Z');
      const endTime = new Date('2025-11-07T20:00:00Z');

      const gridpoint = {
        snowfallAmount: {
          uom: 'wmoUnit:mm',
          values: [
            {
              validTime: '2025-11-07T12:00:00+00:00/PT6H',
              value: 25.4 // Before startTime, should be excluded
            },
            {
              validTime: '2025-11-07T18:00:00+00:00/PT6H',
              value: 50.8 // Within range, should be included
            },
            {
              validTime: '2025-11-07T22:00:00+00:00/PT6H',
              value: 25.4 // After endTime, should be excluded
            }
          ]
        }
      } as unknown as GridpointProperties;

      const result = extractSnowfallForecast(gridpoint, startTime, endTime);

      expect(result).toBeDefined();
      expect(result?.value).toBe(2.0); // Only middle entry
    });

    it('should return undefined for no snowfall data', () => {
      const gridpoint = {} as GridpointProperties;

      const result = extractSnowfallForecast(gridpoint);

      expect(result).toBeUndefined();
    });

    it('should return undefined for trace amounts (< 0.1 inch)', () => {
      const gridpoint = {
        snowfallAmount: {
          uom: 'wmoUnit:mm',
          values: [
            {
              validTime: '2025-11-07T12:00:00+00:00/PT6H',
              value: 1.0 // 1 mm = ~0.04 inches (trace)
            }
          ]
        }
      } as unknown as GridpointProperties;

      const result = extractSnowfallForecast(gridpoint);

      expect(result).toBeUndefined();
    });

    it('should skip null values in series', () => {
      const gridpoint = {
        snowfallAmount: {
          uom: 'wmoUnit:mm',
          values: [
            {
              validTime: '2025-11-07T12:00:00+00:00/PT6H',
              value: 25.4
            },
            {
              validTime: '2025-11-07T18:00:00+00:00/PT6H',
              value: null // Should be skipped
            },
            {
              validTime: '2025-11-07T24:00:00+00:00/PT6H',
              value: 25.4
            }
          ]
        }
      } as unknown as GridpointProperties;

      const result = extractSnowfallForecast(gridpoint);

      expect(result?.value).toBe(2.0); // Only 2 valid entries
    });

    it('should include period in result when time range provided', () => {
      const startTime = new Date('2025-11-07T00:00:00Z');
      const endTime = new Date('2025-11-08T00:00:00Z');

      const gridpoint = {
        snowfallAmount: {
          uom: 'wmoUnit:mm',
          values: [
            {
              validTime: '2025-11-07T12:00:00+00:00/PT6H',
              value: 25.4
            }
          ]
        }
      } as unknown as GridpointProperties;

      const result = extractSnowfallForecast(gridpoint, startTime, endTime);

      expect(result?.period).toBeDefined();
      // toLocaleDateString may vary by timezone, so just check it's a string with dates
      expect(typeof result?.period).toBe('string');
      expect(result?.period).toMatch(/\d+\/\d+\/\d+ - \d+\/\d+\/\d+/);
    });
  });

  describe('extractIceAccumulation', () => {
    it('should extract total ice accumulation from gridpoint data', () => {
      const gridpoint = {
        iceAccumulation: {
          uom: 'wmoUnit:mm',
          values: [
            {
              validTime: '2025-11-07T12:00:00+00:00/PT6H',
              value: 2.54 // 2.54 mm = 0.1 inch
            },
            {
              validTime: '2025-11-07T18:00:00+00:00/PT6H',
              value: 5.08 // 5.08 mm = 0.2 inch
            }
          ]
        }
      } as unknown as GridpointProperties;

      const result = extractIceAccumulation(gridpoint);

      expect(result).toBeDefined();
      expect(result?.value).toBe(0.30); // 0.1 + 0.2 = 0.3 inches, rounded to 2 decimals
      expect(result?.unit).toBe('in');
    });

    it('should filter ice accumulation by time range', () => {
      const startTime = new Date('2025-11-07T15:00:00Z');
      const endTime = new Date('2025-11-07T20:00:00Z');

      const gridpoint = {
        iceAccumulation: {
          uom: 'wmoUnit:mm',
          values: [
            {
              validTime: '2025-11-07T12:00:00+00:00/PT6H',
              value: 2.54 // Before startTime
            },
            {
              validTime: '2025-11-07T18:00:00+00:00/PT6H',
              value: 5.08 // Within range
            }
          ]
        }
      } as unknown as GridpointProperties;

      const result = extractIceAccumulation(gridpoint, startTime, endTime);

      expect(result).toBeDefined();
      expect(result?.value).toBe(0.20); // Only middle entry
    });

    it('should return undefined for no ice data', () => {
      const gridpoint = {} as GridpointProperties;

      const result = extractIceAccumulation(gridpoint);

      expect(result).toBeUndefined();
    });

    it('should return undefined for trace amounts (< 0.05 inch)', () => {
      const gridpoint = {
        iceAccumulation: {
          uom: 'wmoUnit:mm',
          values: [
            {
              validTime: '2025-11-07T12:00:00+00:00/PT6H',
              value: 1.0 // 1 mm = ~0.04 inches (trace)
            }
          ]
        }
      } as unknown as GridpointProperties;

      const result = extractIceAccumulation(gridpoint);

      expect(result).toBeUndefined();
    });

    it('should round to 2 decimal places for small amounts', () => {
      const gridpoint = {
        iceAccumulation: {
          uom: 'wmoUnit:mm',
          values: [
            {
              validTime: '2025-11-07T12:00:00+00:00/PT6H',
              value: 3.175 // 3.175 mm = 0.125 inches
            }
          ]
        }
      } as unknown as GridpointProperties;

      const result = extractIceAccumulation(gridpoint);

      expect(result?.value).toBe(0.13); // Rounded to 2 decimals
    });
  });

  describe('formatSnowData', () => {
    it('should format snow depth only', () => {
      const snowData: SnowData = {
        snowDepth: {
          value: 5.0,
          unit: 'in'
        }
      };

      const result = formatSnowData(snowData);

      expect(result).toContain('## ❄️ Winter Weather');
      expect(result).toContain('**Snow Depth:** 5in on ground');
      expect(result).not.toContain('Snowfall Forecast');
      expect(result).not.toContain('Ice Accumulation');
    });

    it('should format snowfall forecast with period', () => {
      const snowData: SnowData = {
        snowfallAmount: {
          value: 3.0,
          unit: 'in',
          period: 'Next 24 hours'
        }
      };

      const result = formatSnowData(snowData);

      expect(result).toContain('**Snowfall Forecast:** 3in (Next 24 hours)');
    });

    it('should format snowfall forecast without period', () => {
      const snowData: SnowData = {
        snowfallAmount: {
          value: 3.0,
          unit: 'in'
        }
      };

      const result = formatSnowData(snowData);

      expect(result).toContain('**Snowfall Forecast:** 3in');
      expect(result).not.toContain('(');
    });

    it('should format ice accumulation with period', () => {
      const snowData: SnowData = {
        iceAccumulation: {
          value: 0.25,
          unit: 'in',
          period: 'Tonight'
        }
      };

      const result = formatSnowData(snowData);

      expect(result).toContain('**Ice Accumulation:** 0.25in (Tonight)');
    });

    it('should format all winter weather types together', () => {
      const snowData: SnowData = {
        snowDepth: {
          value: 5.0,
          unit: 'in'
        },
        snowfallAmount: {
          value: 3.0,
          unit: 'in',
          period: 'Next 24 hours'
        },
        iceAccumulation: {
          value: 0.25,
          unit: 'in',
          period: 'Tonight'
        }
      };

      const result = formatSnowData(snowData);

      expect(result).toContain('## ❄️ Winter Weather');
      expect(result).toContain('**Snow Depth:** 5in on ground');
      expect(result).toContain('**Snowfall Forecast:** 3in (Next 24 hours)');
      expect(result).toContain('**Ice Accumulation:** 0.25in (Tonight)');
    });

    it('should return empty string for no winter weather', () => {
      const snowData: SnowData = {};

      const result = formatSnowData(snowData);

      expect(result).toBe('');
    });
  });

  describe('hasWinterWeather', () => {
    it('should return true when snow depth exists', () => {
      const snowData: SnowData = {
        snowDepth: { value: 5.0, unit: 'in' }
      };

      expect(hasWinterWeather(snowData)).toBe(true);
    });

    it('should return true when snowfall forecast exists', () => {
      const snowData: SnowData = {
        snowfallAmount: { value: 3.0, unit: 'in' }
      };

      expect(hasWinterWeather(snowData)).toBe(true);
    });

    it('should return true when ice accumulation exists', () => {
      const snowData: SnowData = {
        iceAccumulation: { value: 0.25, unit: 'in' }
      };

      expect(hasWinterWeather(snowData)).toBe(true);
    });

    it('should return true when multiple types exist', () => {
      const snowData: SnowData = {
        snowDepth: { value: 5.0, unit: 'in' },
        snowfallAmount: { value: 3.0, unit: 'in' },
        iceAccumulation: { value: 0.25, unit: 'in' }
      };

      expect(hasWinterWeather(snowData)).toBe(true);
    });

    it('should return false for empty snow data', () => {
      const snowData: SnowData = {};

      expect(hasWinterWeather(snowData)).toBe(false);
    });
  });
});
