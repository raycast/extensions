/**
 * Unit tests for domain utilities
 */

import {
  sanitizeDomain,
  isValidDomain,
  processDomainInput,
  isDuplicateDomain,
  formatDomainForDisplay
} from '../src/lib/domainUtils';

describe('domainUtils', () => {
  describe('sanitizeDomain', () => {
    test('should remove http protocol', () => {
      expect(sanitizeDomain('http://example.com')).toBe('example.com');
    });

    test('should remove https protocol', () => {
      expect(sanitizeDomain('https://example.com')).toBe('example.com');
    });

    test('should remove www prefix', () => {
      expect(sanitizeDomain('www.example.com')).toBe('example.com');
    });

    test('should remove trailing slash and paths', () => {
      expect(sanitizeDomain('example.com/path/to/page')).toBe('example.com');
    });

    test('should remove port numbers', () => {
      expect(sanitizeDomain('example.com:8080')).toBe('example.com');
    });

    test('should handle complex URLs', () => {
      expect(sanitizeDomain('https://www.example.com:443/path?query=1#fragment')).toBe('example.com');
    });

    test('should convert to lowercase', () => {
      expect(sanitizeDomain('EXAMPLE.COM')).toBe('example.com');
    });

    test('should handle empty input', () => {
      expect(sanitizeDomain('')).toBe('');
      expect(sanitizeDomain(null as any)).toBe('');
      expect(sanitizeDomain(undefined as any)).toBe('');
    });
  });

  describe('isValidDomain', () => {
    test('should accept valid domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('subdomain.example.com')).toBe(true);
      expect(isValidDomain('test-domain.co.uk')).toBe(true);
      expect(isValidDomain('x.co')).toBe(true);
    });

    test('should reject invalid domains', () => {
      expect(isValidDomain('')).toBe(false);
      expect(isValidDomain('example')).toBe(false); // No TLD
      expect(isValidDomain('.example.com')).toBe(false); // Starts with dot
      expect(isValidDomain('example.com.')).toBe(false); // Ends with dot
      expect(isValidDomain('example..com')).toBe(false); // Consecutive dots
      expect(isValidDomain('example .com')).toBe(false); // Contains space
      expect(isValidDomain(null as any)).toBe(false);
      expect(isValidDomain(undefined as any)).toBe(false);
    });

    test('should reject domains that are too long', () => {
      const longDomain = 'a'.repeat(250) + '.com';
      expect(isValidDomain(longDomain)).toBe(false);
    });
  });

  describe('processDomainInput', () => {
    test('should process valid input correctly', () => {
      const result = processDomainInput('https://www.example.com/path');
      expect(result).toEqual({
        domain: 'example.com',
        isValid: true
      });
    });

    test('should handle invalid input', () => {
      const result = processDomainInput('invalid-domain');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle empty input', () => {
      const result = processDomainInput('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a domain name');
    });
  });

  describe('isDuplicateDomain', () => {
    const existingDomains = ['example.com', 'test.com', 'sample.org'];

    test('should detect duplicates (case insensitive)', () => {
      expect(isDuplicateDomain('example.com', existingDomains)).toBe(true);
      expect(isDuplicateDomain('EXAMPLE.COM', existingDomains)).toBe(true);
      expect(isDuplicateDomain('Example.Com', existingDomains)).toBe(true);
    });

    test('should detect non-duplicates', () => {
      expect(isDuplicateDomain('new-domain.com', existingDomains)).toBe(false);
      expect(isDuplicateDomain('different.net', existingDomains)).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(isDuplicateDomain('', existingDomains)).toBe(false);
      expect(isDuplicateDomain('test.com', [])).toBe(false);
      expect(isDuplicateDomain('test.com', null as any)).toBe(false);
    });
  });

  describe('formatDomainForDisplay', () => {
    test('should format domains correctly', () => {
      expect(formatDomainForDisplay('EXAMPLE.COM')).toBe('example.com');
      expect(formatDomainForDisplay('  test.com  ')).toBe('test.com');
    });

    test('should handle empty input', () => {
      expect(formatDomainForDisplay('')).toBe('');
      expect(formatDomainForDisplay(null as any)).toBe('');
      expect(formatDomainForDisplay(undefined as any)).toBe('');
    });
  });
});