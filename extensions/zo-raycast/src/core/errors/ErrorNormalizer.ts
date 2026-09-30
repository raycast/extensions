export type NormalizedError = {
  title: string;
  message: string;
  recoverable: boolean;
};

function hasCode(record: unknown): record is { code: number } {
  return (
    typeof record === "object" &&
    record !== null &&
    "code" in record &&
    typeof (record as { code: unknown }).code === "number"
  );
}

export class ErrorNormalizer {
  static fromUnknown(error: unknown): NormalizedError {
    if (error instanceof Error) {
      const lowered = error.message.toLowerCase();

      if (lowered.includes("401") || lowered.includes("403") || lowered.includes("unauthorized")) {
        return {
          title: "Authentication Failed",
          message: "Verify your Zo API key in extension preferences.",
          recoverable: true,
        };
      }

      if (lowered.includes("timeout")) {
        return {
          title: "Request Timed Out",
          message: "Zo did not respond in time. Try again or increase the timeout setting.",
          recoverable: true,
        };
      }

      if (lowered.includes("429")) {
        return {
          title: "Rate Limited",
          message: "Zo rate-limited this request. Wait briefly and retry.",
          recoverable: true,
        };
      }

      return {
        title: "Operation Failed",
        message: error.message,
        recoverable: true,
      };
    }

    if (hasCode(error)) {
      return {
        title: "Operation Failed",
        message: `Remote error code: ${error.code}`,
        recoverable: true,
      };
    }

    return {
      title: "Operation Failed",
      message: "An unknown error occurred.",
      recoverable: true,
    };
  }
}
