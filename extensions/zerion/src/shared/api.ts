import { v4 as uuidv4 } from "uuid";

export const ZPI_URL = "https://zpi.zerion.io/";

export function getZpiHeaders(headers: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Origin: "raycast://zerion.io",
    "X-Request-Id": uuidv4(),
    "Zerion-Client-Type": "raycast-extension",
    "Zerion-Client-Version": "1.0.0",
    ...headers,
  };
}
