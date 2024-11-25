export interface GlucoseReading {
  Value: number;
  ValueInMgPerDl: number;
  Timestamp: string;
  TrendArrow?: string;
  unit: "mmol" | "mgdl";
}

export interface LibreViewCredentials {
  username: string;
  password: string;
  unit: "mmol" | "mgdl";
}
