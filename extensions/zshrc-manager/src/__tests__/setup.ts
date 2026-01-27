/**
 * Vitest test setup file
 *
 * This file configures the test environment and provides global test utilities.
 */

import "@testing-library/jest-dom";
import { expect, describe, it, vi } from "vitest";

// Mock @raycast/api globally to prevent module resolution issues
vi.mock("@raycast/api", () => import("./__mocks__/@raycast/api"));

// Mock synonym-cache with test synonyms
vi.mock("../lib/icons/synonym-cache", () => ({
  getSynonyms: () => ({
    golang: "go",
    rails: "rubyonrails",
    postgres: "postgresql",
    psql: "postgresql",
    aws: "amazonaws",
    "amazon web services": "amazonaws",
    k8s: "kubernetes",
    kubectl: "kubernetes",
    gh: "githubactions",
    "gh actions": "githubactions",
    "github actions": "githubactions",
    vscode: "visualstudiocode",
    "vs code": "visualstudiocode",
    osx: "macos",
    "mac os": "macos",
    nodejs: "nodedotjs",
    "node.js": "nodedotjs",
    reactjs: "react",
    "react.js": "react",
    vuejs: "vuedotjs",
    "vue.js": "vuedotjs",
    angularjs: "angular",
    "angular.js": "angular",
    pyenv: "python",
    sdkman: "openjdk",
    java: "openjdk",
    "c++": "cplusplus",
    cpp: "cplusplus",
    "c#": "csharp",
    "f#": "fsharp",
    gcp: "googlecloud",
    "google cloud": "googlecloud",
    brew: "homebrew",
  }),
  updateSynonymsCache: vi.fn(),
  applySynonyms: vi.fn((name: string) => name.toLowerCase()),
}));

// Mock @raycast/utils globally - provides useCachedPromise, useFrecencySorting, etc.
vi.mock("@raycast/utils", () => ({
  useCachedPromise: vi.fn(() => ({
    data: undefined,
    isLoading: true,
    error: undefined,
    revalidate: vi.fn(),
  })),
  useFrecencySorting: vi.fn((items: unknown[]) => ({
    data: items,
    visitItem: vi.fn(),
  })),
  useForm: vi.fn(() => ({
    handleSubmit: vi.fn(),
    itemProps: {},
    values: {},
    setValue: vi.fn(),
    reset: vi.fn(),
  })),
}));

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
