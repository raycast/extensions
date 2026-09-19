import test from "node:test";
import assert from "node:assert/strict";

import { CredentialsError, parseCredentials, redactSensitiveText } from "../src/utils/credentials.ts";

const TOKEN = "secret-example-pat";

function assertCredentialsError(preferences, code, message) {
    assert.throws(
        () => parseCredentials(preferences),
        (error) => {
            assert.ok(error instanceof CredentialsError);
            assert.equal(error.code, code);
            assert.equal(error.message, message);
            assert.equal(String(error).includes(TOKEN), false);
            return true;
        },
    );
}

test("redacts every occurrence of a sensitive value", () => {
    assert.equal(
        redactSensitiveText(`${TOKEN}: first; ${TOKEN}: second`, TOKEN),
        "[REDACTED]: first; [REDACTED]: second",
    );
});

test("leaves text unchanged when the sensitive value is empty", () => {
    assert.equal(redactSensitiveText("safe diagnostic text", ""), "safe diagnostic text");
});

test("parses and trims central credentials", () => {
    assert.deepEqual(
        parseCredentials({
            personalAccessToken: `  ${TOKEN}  `,
            organizationId: "  org-id  ",
            endpointMode: "central",
            regionUrl: " https://ignored.example.com/// ",
        }),
        {
            baseUrl: "https://openapi-rdc.aliyuncs.com",
            personalAccessToken: TOKEN,
            organizationId: "org-id",
            mode: "central",
        },
    );
});

test("parses region credentials and removes all trailing slashes", () => {
    assert.deepEqual(
        parseCredentials({
            personalAccessToken: TOKEN,
            organizationId: "org-id",
            endpointMode: "region",
            regionUrl: "  https://region.example.com/api///  ",
        }),
        {
            baseUrl: "https://region.example.com/api",
            personalAccessToken: TOKEN,
            organizationId: "org-id",
            mode: "region",
        },
    );
});

test("reports a missing Personal Access Token first", () => {
    assertCredentialsError(
        { organizationId: "org-id", endpointMode: "region" },
        "MISSING_PERSONAL_ACCESS_TOKEN",
        "缺少 Personal Access Token，请在扩展偏好中设置。",
    );
});

test("reports a missing Organization Id without exposing the PAT", () => {
    assertCredentialsError(
        { personalAccessToken: TOKEN, endpointMode: "region", regionUrl: "https://region.example.com" },
        "MISSING_ORGANIZATION_ID",
        "缺少 Organization Id，请在扩展偏好中设置。",
    );
});

test("reports a missing Region API Base URL after PAT and Organization Id", () => {
    assertCredentialsError(
        { personalAccessToken: TOKEN, organizationId: "org-id", endpointMode: "region", regionUrl: " /// " },
        "MISSING_REGION_URL",
        "Region 模式缺少 Region API Base URL，请在扩展偏好中设置。",
    );
});

test("reports a malformed Region API Base URL without exposing the PAT", () => {
    assertCredentialsError(
        { personalAccessToken: TOKEN, organizationId: "org-id", endpointMode: "region", regionUrl: "not a URL" },
        "INVALID_REGION_URL",
        "Region API Base URL 格式无效，请填写包含主机名的完整 HTTPS URL。",
    );
});

test("rejects an HTTP Region API Base URL without exposing the PAT", () => {
    assertCredentialsError(
        {
            personalAccessToken: TOKEN,
            organizationId: "org-id",
            endpointMode: "region",
            regionUrl: "http://region.example.com///",
        },
        "INSECURE_REGION_URL",
        "Region API Base URL 必须使用 HTTPS。",
    );
});
