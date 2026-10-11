// `@raycast/api` is provided by Raycast at runtime and has no resolvable entry
// point, so Vite cannot load it. Tests that import a module depending on it
// replace it with `vi.mock("@raycast/api", ...)`; this stub only exists so the
// import can be resolved.
export {};
