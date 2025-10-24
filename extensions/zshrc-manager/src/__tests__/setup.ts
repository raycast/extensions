/**
 * Vitest test setup file
 *
 * This file configures the test environment and provides global test utilities.
 */

import "@testing-library/jest-dom";
import { expect, describe, it, vi } from "vitest";

// Mock @raycast/api globally to prevent module resolution issues
vi.mock("@raycast/api", () => import("./__mocks__/@raycast/api"));

// Global type declarations
declare global {
  function createMockZshrcContent(sections: Array<{ label?: string; content: string }>): string;
  function createMockAlias(name: string, command: string): string;
  function createMockExport(variable: string, value: string): string;
}

// Mock HTMLFormElement.prototype.requestSubmit for JSDOM
if (typeof globalThis !== "undefined" && globalThis.HTMLFormElement) {
  Object.defineProperty(globalThis.HTMLFormElement.prototype, "requestSubmit", {
    value: function () {
      // Simulate form submission by triggering submit event
      const submitEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      this.dispatchEvent(submitEvent);
    },
    writable: true,
    configurable: true,
  });
}

// Global test utilities
global.createMockZshrcContent = (sections: Array<{ label?: string; content: string }>) => {
  return sections
    .map((section) => {
      if (section.label) {
        return `# Section: ${section.label}\n${section.content}`;
      }
      return section.content;
    })
    .join("\n\n");
};

global.createMockAlias = (name: string, command: string) => `alias ${name}='${command}'`;

global.createMockExport = (variable: string, value: string) => `export ${variable}=${value}`;

// Basic test to ensure setup file is loaded
describe("Test Setup", () => {
  it("should load test utilities", () => {
    expect(global.createMockZshrcContent).toBeDefined();
    expect(global.createMockAlias).toBeDefined();
    expect(global.createMockExport).toBeDefined();
  });
});
