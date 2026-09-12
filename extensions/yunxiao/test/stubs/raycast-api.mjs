/** @raycast/api 的测试桩：只提供 client.ts 用到的 getPreferenceValues。 */
let preferences = {};

export function setPreferences(next) {
    preferences = next;
}

export function getPreferenceValues() {
    return preferences;
}
