"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccessToken = exports.withAccessToken = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
let token = null;
let type = null;
let authorize = null;
let getIdToken = null;
let onAuthorize = null;
function withAccessToken(options) {
    if (api_1.environment.commandMode === "no-view") {
        return (fn) => {
            const noViewFn = async (props) => {
                if (!token) {
                    token = options.personalAccessToken ?? (await options.authorize());
                    type = options.personalAccessToken ? "personal" : "oauth";
                    const idToken = (await options.client?.getTokens())?.idToken;
                    if (options.onAuthorize) {
                        await Promise.resolve(options.onAuthorize({ token, type, idToken }));
                    }
                }
                return fn(props);
            };
            return noViewFn;
        };
    }
    return (Component) => {
        const WrappedComponent = (props) => {
            if (options.personalAccessToken) {
                token = options.personalAccessToken;
                type = "personal";
            }
            else {
                if (!authorize) {
                    authorize = wrapPromise(options.authorize());
                }
                token = authorize.read();
                type = "oauth";
            }
            let idToken;
            if (options.client) {
                if (!getIdToken) {
                    getIdToken = wrapPromise(options.client.getTokens());
                }
                idToken = getIdToken.read()?.idToken;
            }
            if (!onAuthorize && options.onAuthorize) {
                onAuthorize = wrapPromise(Promise.resolve(options.onAuthorize({ token, type, idToken })));
            }
            onAuthorize?.read();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore too complicated for TS
            return (0, jsx_runtime_1.jsx)(Component, { ...props });
        };
        WrappedComponent.displayName = `withAccessToken(${Component.displayName || Component.name})`;
        return WrappedComponent;
    };
}
exports.withAccessToken = withAccessToken;
/**
 * Returns the access token and its type. Note that this function must be called in a component wrapped with `withAccessToken`.
 *
 * @throws {Error} If called outside of a component wrapped with `withAccessToken`
 * @returns {{ token: string, type: "oauth" | "personal" }} An object containing the `token`
 * and its `type`, where type can be either 'oauth' for OAuth tokens or 'personal' for a
 * personal access token.
 */
function getAccessToken() {
    if (!token || !type) {
        throw new Error("getAccessToken must be used when authenticated (eg. used inside `withAccessToken`)");
    }
    return { token, type };
}
exports.getAccessToken = getAccessToken;
function wrapPromise(promise) {
    let status = "pending";
    let response;
    const suspender = promise.then((res) => {
        status = "success";
        response = res;
    }, (err) => {
        status = "error";
        response = err;
    });
    const read = () => {
        switch (status) {
            case "pending":
                throw suspender;
            case "error":
                throw response;
            default:
                return response;
        }
    };
    return { read };
}
