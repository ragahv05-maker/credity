import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChartStyle, ChartConfig } from '@/components/ui/chart';

describe('ChartStyle XSS Vulnerability', () => {
  it('should not allow escaping the style tag via malicious ID', () => {
    const maliciousId = 'test-id</style><script>alert("xss-id")</script>';
    const config: ChartConfig = {
      test: { color: 'red', label: 'Test' }
    };

    const output = renderToStaticMarkup(
      <ChartStyle id={maliciousId} config={config} />
    );

    // If vulnerable, the output will contain the script tag literally.
    // We expect the test to FAIL if the vulnerability exists (because we assert it does NOT contain the script).
    // Or we can assert it DOES contain it to confirm reproduction, then flip it.
    // Standard practice: Write the test describing desired behavior (security). So it should fail now.
    expect(output).not.toContain('<script>alert("xss-id")</script>');
  });

  it('should not allow escaping the style tag via malicious config key', () => {
    const maliciousKey = 'key</style><script>alert("xss-key")</script>';
    const config: ChartConfig = {
      [maliciousKey]: { color: 'blue', label: 'Test' }
    };

    const output = renderToStaticMarkup(
      <ChartStyle id="safe-id" config={config} />
    );

    expect(output).not.toContain('<script>alert("xss-key")</script>');
  });

  it('should not allow escaping the style tag via malicious color value', () => {
    const maliciousColor = 'red;</style><script>alert("xss-color")</script>';
    const config: ChartConfig = {
      test: { color: maliciousColor, label: 'Test' }
    };

    const output = renderToStaticMarkup(
      <ChartStyle id="safe-id" config={config} />
    );

    expect(output).not.toContain('<script>alert("xss-color")</script>');
  });
});
