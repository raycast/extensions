import { MenuBarExtra, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Nightscout {
    _id: string;
    sgv: number;
    sysTime: string;
    filtered: number;
    unfiltered: number;
    date: number;
    dateString: string;
    direction: string;
    type: string;
    noise: number;
    device: string;
    utcOffset: number;
    mills: number;
}

const dir2Char = {
    NONE: "⇼",
    TripleUp: "⤊",
    DoubleUp: "⇈",
    SingleUp: "↑",
    FortyFiveUp: "↗",
    Flat: "→",
    FortyFiveDown: "↘",
    SingleDown: "↓",
    DoubleDown: "⇊",
    TripleDown: "⤋",
    "NOT COMPUTABLE": "-",
    "RATE OUT OF RANGE": "⇕",
} as const;

interface Preferences {
    apiUrl: string;
    units?: "mg" | "mmol";
}

const Graph: React.FC<{ data: Nightscout[]; units: Preferences["units"] }> = ({ data, units }) => {
    const values = data.slice(0, 10);
    const maxValue = Math.max(...values.map((v) => v.sgv));
    const minValue = Math.min(...values.map((v) => v.sgv));
    const range = maxValue - minValue;

    return (
        <MenuBarExtra.Section title="Last 10 Readings">
            {values.map((reading) => {
                const level = units === "mg" ? reading.sgv / MGDL_TO_MMOL : reading.sgv;
                const barWidth = Math.max(((reading.sgv - minValue) / range) * 20, 1);
                const bar = "█".repeat(barWidth);

                return (
                    <MenuBarExtra.Item
                        key={reading._id}
                        title={`${bar} ${level.toFixed(1)} - ${new Date(reading.date).toLocaleTimeString()}`}
                    />
                );
            })}
        </MenuBarExtra.Section>
    );
};

const MGDL_TO_MMOL = 18;

/**
 * Displays current blood glucose level from Nightscout in the menu bar
 * with trend direction indicators
 */
export default function Command() {
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.apiUrl) {
        openExtensionPreferences();
        return null;
    }

    const { isLoading, data, error } = useFetch<Nightscout[]>(preferences.apiUrl);

    const latestSgv = data?.[0]?.sgv ?? 0;
    const level = preferences.units === "mg" ? latestSgv / MGDL_TO_MMOL : latestSgv;
    const direction = data?.[0]?.direction ?? "NONE";

    return (
        <MenuBarExtra
            isLoading={isLoading}
            title={`${level.toFixed(1)} ${dir2Char[direction as keyof typeof dir2Char]}`}
        >
            {error && <MenuBarExtra.Item title="Error loading data" tooltip={error.message} />}
            {data && (
                <>
                    <MenuBarExtra.Item title={`Last updated: ${new Date(data[0].date).toLocaleTimeString()}`} />
                    <Graph data={data} units={preferences.units} />
                </>
            )}
        </MenuBarExtra>
    );
}
