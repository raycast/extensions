import type { TimeseriesEntry } from "./weather-client";

export function symbolCode(ts?: TimeseriesEntry): string | undefined {
  return (
    ts?.data?.next_1_hours?.summary?.symbol_code ??
    ts?.data?.next_6_hours?.summary?.symbol_code ??
    ts?.data?.next_12_hours?.summary?.symbol_code ??
    undefined
  );
}

export function precipitationAmount(ts?: TimeseriesEntry): number | undefined {
  return (
    ts?.data?.next_1_hours?.details?.precipitation_amount ??
    ts?.data?.next_6_hours?.details?.precipitation_amount ??
    ts?.data?.next_12_hours?.details?.precipitation_amount ??
    undefined
  );
}
