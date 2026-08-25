"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zoomService = exports.slackService = exports.linearService = exports.jiraService = exports.googleService = exports.githubService = exports.asanaService = void 0;
const api_1 = require("@raycast/api");
const OAuthService_1 = require("./OAuthService");
const PROVIDER_CLIENT_IDS = {
    asana: "1191201745684312",
    github: "7235fe8d42157f1f38c0",
    linear: "c8ff37b9225c3c9aefd7d66ea0e5b6f1",
    slack: "851756884692.5546927290212",
};
const getIcon = (markup) => `data:image/svg+xml,${markup}`;
const PROVIDERS_ICONS = {
    asana: getIcon(`<svg xmlns="http://www.w3.org/2000/svg" width="251" height="232" fill="none"><path fill="#F06A6A" d="M179.383 54.373c0 30.017-24.337 54.374-54.354 54.374-30.035 0-54.373-24.338-54.373-54.374C70.656 24.338 94.993 0 125.029 0c30.017 0 54.354 24.338 54.354 54.373ZM54.393 122.33C24.376 122.33.02 146.668.02 176.685c0 30.017 24.337 54.373 54.373 54.373 30.035 0 54.373-24.338 54.373-54.373 0-30.017-24.338-54.355-54.373-54.355Zm141.253 0c-30.035 0-54.373 24.338-54.373 54.374 0 30.035 24.338 54.373 54.373 54.373 30.017 0 54.374-24.338 54.374-54.373 0-30.036-24.338-54.374-54.374-54.374Z"/></svg>`),
    github: {
        source: getIcon(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>`),
        tintColor: api_1.Color.PrimaryText,
    },
    google: getIcon(`<svg xmlns="http://www.w3.org/2000/svg" style="display:block" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>`),
    jira: getIcon(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="2361" height="2500" viewBox="2.59 0 214.091 224"><linearGradient id="a" x1="102.4" x2="56.15" y1="218.63" y2="172.39" gradientTransform="matrix(1 0 0 -1 0 264)" gradientUnits="userSpaceOnUse"><stop offset=".18" stop-color="#0052cc"/><stop offset="1" stop-color="#2684ff"/></linearGradient><linearGradient xlink:href="#a" id="b" x1="114.65" x2="160.81" y1="85.77" y2="131.92"/><path fill="#2684ff" d="M214.06 105.73 117.67 9.34 108.33 0 35.77 72.56 2.59 105.73a8.89 8.89 0 0 0 0 12.54l66.29 66.29L108.33 224l72.55-72.56 1.13-1.12 32.05-32a8.87 8.87 0 0 0 0-12.59zm-105.73 39.39L75.21 112l33.12-33.12L141.44 112z"/><path fill="url(#a)" d="M108.33 78.88a55.75 55.75 0 0 1-.24-78.61L35.62 72.71l39.44 39.44z"/><path fill="url(#b)" d="m141.53 111.91-33.2 33.21a55.77 55.77 0 0 1 0 78.86L181 151.35z"/></svg>`),
    linear: {
        source: {
            light: getIcon(`<svg xmlns="http://www.w3.org/2000/svg" fill="#222326" width="200" height="200" viewBox="0 0 100 100"><path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z"/></svg>`),
            dark: getIcon(`<svg xmlns="http://www.w3.org/2000/svg" fill="#fff" width="200" height="200" viewBox="0 0 100 100"><path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z" /></svg>`),
        },
    },
    slack: getIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="73 73 124 124"><style>.st0{fill:#e01e5a}.st1{fill:#36c5f0}.st2{fill:#2eb67d}.st3{fill:#ecb22e}</style><path d="M99.4 151.2c0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9h12.9v12.9zM105.9 151.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9v-32.3z" class="st0"/><path d="M118.8 99.4c-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v12.9h-12.9zM118.8 105.9c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H86.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3z" class="st1"/><path d="M170.6 118.8c0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9h-12.9v-12.9zM164.1 118.8c0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9V86.5c0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9v32.3z" class="st2"/><path d="M151.2 170.6c7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9v-12.9h12.9zM151.2 164.1c-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9h-32.3z" class="st3"/></svg>`),
    zoom: getIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 351.845 80"><path d="M73.786 78.835H10.88A10.842 10.842 0 0 1 .833 72.122a10.841 10.841 0 0 1 2.357-11.85L46.764 16.7h-31.23C6.954 16.699 0 9.744 0 1.165h58.014c4.414 0 8.357 2.634 10.046 6.712a10.843 10.843 0 0 1-2.356 11.85L22.13 63.302h36.122c8.58 0 15.534 6.955 15.534 15.534Zm278.059-48.544C351.845 13.588 338.256 0 321.553 0c-8.934 0-16.975 3.89-22.524 10.063C293.48 3.89 285.44 0 276.505 0c-16.703 0-30.291 13.588-30.291 30.291v48.544c8.579 0 15.534-6.955 15.534-15.534v-33.01c0-8.137 6.62-14.757 14.757-14.757s14.757 6.62 14.757 14.757v33.01c0 8.58 6.955 15.534 15.534 15.534V30.291c0-8.137 6.62-14.757 14.757-14.757s14.758 6.62 14.758 14.757v33.01c0 8.58 6.954 15.534 15.534 15.534V30.291ZM238.447 40c0 22.091-17.909 40-40 40s-40-17.909-40-40 17.908-40 40-40 40 17.909 40 40Zm-15.534 0c0-13.512-10.954-24.466-24.466-24.466S173.98 26.488 173.98 40s10.953 24.466 24.466 24.466S222.913 53.512 222.913 40Zm-70.68 0c0 22.091-17.909 40-40 40s-40-17.909-40-40 17.909-40 40-40 40 17.909 40 40Zm-15.534 0c0-13.512-10.954-24.466-24.466-24.466S87.767 26.488 87.767 40s10.954 24.466 24.466 24.466S136.699 53.512 136.699 40Z" style="fill:#0b5cff"/></svg>`),
};
const asanaService = (options) => new OAuthService_1.OAuthService({
    client: new api_1.OAuth.PKCEClient({
        redirectMethod: api_1.OAuth.RedirectMethod.Web,
        providerName: "Asana",
        providerIcon: PROVIDERS_ICONS.asana,
        providerId: "asana",
        description: "Connect your Asana account",
    }),
    clientId: options.clientId ?? PROVIDER_CLIENT_IDS.asana,
    authorizeUrl: options.authorizeUrl ?? "https://asana.oauth.raycast.com/authorize",
    tokenUrl: options.tokenUrl ?? "https://asana.oauth.raycast.com/token",
    refreshTokenUrl: options.refreshTokenUrl ?? "https://asana.oauth.raycast.com/refresh-token",
    scope: options.scope,
    personalAccessToken: options.personalAccessToken,
    onAuthorize: options.onAuthorize,
    bodyEncoding: options.bodyEncoding,
    tokenRefreshResponseParser: options.tokenRefreshResponseParser,
    tokenResponseParser: options.tokenResponseParser,
});
exports.asanaService = asanaService;
const githubService = (options) => new OAuthService_1.OAuthService({
    client: new api_1.OAuth.PKCEClient({
        redirectMethod: api_1.OAuth.RedirectMethod.Web,
        providerName: "GitHub",
        providerIcon: PROVIDERS_ICONS.github,
        providerId: "github",
        description: "Connect your GitHub account",
    }),
    clientId: options.clientId ?? PROVIDER_CLIENT_IDS.github,
    authorizeUrl: options.authorizeUrl ?? "https://github.oauth.raycast.com/authorize",
    tokenUrl: options.tokenUrl ?? "https://github.oauth.raycast.com/token",
    refreshTokenUrl: options.refreshTokenUrl ?? "https://github.oauth.raycast.com/refresh-token",
    scope: options.scope,
    personalAccessToken: options.personalAccessToken,
    onAuthorize: options.onAuthorize,
    bodyEncoding: options.bodyEncoding,
    tokenRefreshResponseParser: options.tokenRefreshResponseParser,
    tokenResponseParser: options.tokenResponseParser,
});
exports.githubService = githubService;
const googleService = (options) => new OAuthService_1.OAuthService({
    client: new api_1.OAuth.PKCEClient({
        redirectMethod: api_1.OAuth.RedirectMethod.AppURI,
        providerName: "Google",
        providerIcon: PROVIDERS_ICONS.google,
        providerId: "google",
        description: "Connect your Google account",
    }),
    clientId: options.clientId,
    authorizeUrl: options.authorizeUrl ?? "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: options.tokenUrl ?? "https://oauth2.googleapis.com/token",
    refreshTokenUrl: options.tokenUrl,
    scope: options.scope,
    personalAccessToken: options.personalAccessToken,
    bodyEncoding: options.bodyEncoding ?? "url-encoded",
    onAuthorize: options.onAuthorize,
    tokenRefreshResponseParser: options.tokenRefreshResponseParser,
    tokenResponseParser: options.tokenResponseParser,
});
exports.googleService = googleService;
const jiraService = (options) => new OAuthService_1.OAuthService({
    client: new api_1.OAuth.PKCEClient({
        redirectMethod: api_1.OAuth.RedirectMethod.Web,
        providerName: "Jira",
        providerIcon: PROVIDERS_ICONS.jira,
        providerId: "jira",
        description: "Connect your Jira account",
    }),
    clientId: options.clientId,
    authorizeUrl: options.authorizeUrl ?? "https://auth.atlassian.com/authorize",
    tokenUrl: options.tokenUrl ?? "https://auth.atlassian.com/oauth/token",
    refreshTokenUrl: options.refreshTokenUrl,
    scope: options.scope,
    personalAccessToken: options.personalAccessToken,
    onAuthorize: options.onAuthorize,
    bodyEncoding: options.bodyEncoding,
    tokenRefreshResponseParser: options.tokenRefreshResponseParser,
    tokenResponseParser: options.tokenResponseParser,
});
exports.jiraService = jiraService;
const linearService = (options) => new OAuthService_1.OAuthService({
    client: new api_1.OAuth.PKCEClient({
        redirectMethod: api_1.OAuth.RedirectMethod.Web,
        providerName: "Linear",
        providerIcon: PROVIDERS_ICONS.linear,
        providerId: "linear",
        description: "Connect your Linear account",
    }),
    clientId: options.clientId ?? PROVIDER_CLIENT_IDS.linear,
    authorizeUrl: options.authorizeUrl ?? "https://linear.oauth.raycast.com/authorize",
    tokenUrl: options.tokenUrl ?? "https://linear.oauth.raycast.com/token",
    refreshTokenUrl: options.refreshTokenUrl ?? "https://linear.oauth.raycast.com/refresh-token",
    scope: options.scope,
    extraParameters: {
        actor: "user",
    },
    onAuthorize: options.onAuthorize,
    bodyEncoding: options.bodyEncoding,
    tokenRefreshResponseParser: options.tokenRefreshResponseParser,
    tokenResponseParser: options.tokenResponseParser,
});
exports.linearService = linearService;
const slackService = (options) => new OAuthService_1.OAuthService({
    client: new api_1.OAuth.PKCEClient({
        redirectMethod: api_1.OAuth.RedirectMethod.Web,
        providerName: "Slack",
        providerIcon: PROVIDERS_ICONS.slack,
        providerId: "slack",
        description: "Connect your Slack account",
    }),
    clientId: options.clientId ?? PROVIDER_CLIENT_IDS.slack,
    authorizeUrl: options.authorizeUrl ?? "https://slack.oauth.raycast.com/authorize",
    tokenUrl: options.tokenUrl ?? "https://slack.oauth.raycast.com/token",
    refreshTokenUrl: options.tokenUrl ?? "https://slack.oauth.raycast.com/refresh-token",
    scope: "",
    extraParameters: {
        user_scope: options.scope,
    },
    personalAccessToken: options.personalAccessToken,
    bodyEncoding: options.tokenUrl ? options.bodyEncoding ?? "url-encoded" : "json",
    onAuthorize: options.onAuthorize,
    tokenRefreshResponseParser: options.tokenRefreshResponseParser,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tokenResponseParser: options.tokenResponseParser ??
        ((response) => {
            return {
                access_token: response.authed_user.access_token,
                scope: response.authed_user.scope,
            };
        }),
});
exports.slackService = slackService;
const zoomService = (options) => new OAuthService_1.OAuthService({
    client: new api_1.OAuth.PKCEClient({
        redirectMethod: api_1.OAuth.RedirectMethod.Web,
        providerName: "Zoom",
        providerIcon: PROVIDERS_ICONS.zoom,
        providerId: "zoom",
        description: "Connect your Zoom account",
    }),
    clientId: options.clientId,
    authorizeUrl: options.authorizeUrl ?? "https://zoom.us/oauth/authorize",
    tokenUrl: options.tokenUrl ?? "https://zoom.us/oauth/token",
    refreshTokenUrl: options.refreshTokenUrl,
    scope: options.scope,
    personalAccessToken: options.personalAccessToken,
    bodyEncoding: options.bodyEncoding ?? "url-encoded",
    onAuthorize: options.onAuthorize,
    tokenRefreshResponseParser: options.tokenRefreshResponseParser,
    tokenResponseParser: options.tokenResponseParser,
});
exports.zoomService = zoomService;
