# Gemini's Guide to Raycast Extension Development

This document outlines the approach for developing Raycast extensions, emphasizing a structured, step-by-step process, and leveraging the official Raycast developer documentation.

## Core Principles

1.  **Consult Raycast Documentation First:** Always refer to `https://developers.raycast.com/` for the most accurate and up-to-date information on APIs, components, and best practices.
2.  **Iterative Development:** Build features incrementally, verifying each milestone before proceeding.
3.  **Test-Driven Approach (where applicable):** Write tests for critical logic to ensure correctness and prevent regressions.


### Implement Code

-   Write code in the `src/` directory, adhering to the project's established conventions.
-   Ensure proper import statements for Raycast API components and utilities.

###  Verify and Test

-   Run `npm run lint` and `npm run fix-lint` to ensure code style and quality.
-   Run `npm run build` to test the extension can be build in Raycast.
-   If applicable, write and run unit tests.


## Git
- You don't do git, human is in charge of git
- Human commits on stable versions so git diff is good way to find source of errors.

## Fixing errors
- When you are stuck and try many times to fix the same issue please search online, usually docs have the answer.
- If that does not help, pelase ask the human