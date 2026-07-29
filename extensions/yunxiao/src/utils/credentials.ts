export const DEFAULT_BASE_URL = "https://openapi-rdc.aliyuncs.com";

export type EndpointMode = "central" | "region";

export interface CredentialPreferences {
    personalAccessToken?: string;
    organizationId?: string;
    endpointMode?: EndpointMode;
    regionUrl?: string;
}

export interface ResolvedCredentials {
    baseUrl: string;
    personalAccessToken: string;
    organizationId: string;
    mode: EndpointMode;
}

export type CredentialsErrorCode =
    | "MISSING_PERSONAL_ACCESS_TOKEN"
    | "MISSING_ORGANIZATION_ID"
    | "MISSING_REGION_URL"
    | "INVALID_REGION_URL"
    | "INSECURE_REGION_URL";

export class CredentialsError extends Error {
    readonly code: CredentialsErrorCode;

    constructor(code: CredentialsErrorCode, message: string) {
        super(message);
        this.name = "CredentialsError";
        this.code = code;
    }
}

export function redactSensitiveText(value: string, secret: string): string {
    return secret ? value.split(secret).join("[REDACTED]") : value;
}

export function parseCredentials(preferences: CredentialPreferences): ResolvedCredentials {
    const personalAccessToken = (preferences.personalAccessToken ?? "").trim();
    if (!personalAccessToken) {
        throw new CredentialsError("MISSING_PERSONAL_ACCESS_TOKEN", "缺少 Personal Access Token，请在扩展偏好中设置。");
    }

    const organizationId = (preferences.organizationId ?? "").trim();
    if (!organizationId) {
        throw new CredentialsError("MISSING_ORGANIZATION_ID", "缺少 Organization Id，请在扩展偏好中设置。");
    }

    const mode: EndpointMode = preferences.endpointMode === "region" ? "region" : "central";
    const regionUrl = (preferences.regionUrl ?? "").trim().replace(/\/+$/, "");
    if (mode === "region") {
        if (!regionUrl) {
            throw new CredentialsError(
                "MISSING_REGION_URL",
                "Region 模式缺少 Region API Base URL，请在扩展偏好中设置。",
            );
        }

        let parsedRegionUrl: URL;
        try {
            parsedRegionUrl = new URL(regionUrl);
        } catch {
            throw new CredentialsError(
                "INVALID_REGION_URL",
                "Region API Base URL 格式无效，请填写包含主机名的完整 HTTPS URL。",
            );
        }
        if (!parsedRegionUrl.host) {
            throw new CredentialsError(
                "INVALID_REGION_URL",
                "Region API Base URL 格式无效，请填写包含主机名的完整 HTTPS URL。",
            );
        }
        if (parsedRegionUrl.protocol !== "https:") {
            throw new CredentialsError("INSECURE_REGION_URL", "Region API Base URL 必须使用 HTTPS。");
        }
    }

    return {
        baseUrl: mode === "region" ? regionUrl : DEFAULT_BASE_URL,
        personalAccessToken,
        organizationId,
        mode,
    };
}
