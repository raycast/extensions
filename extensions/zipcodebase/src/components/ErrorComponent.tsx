import { Detail } from "@raycast/api";
import { ErrorResponse } from "../utils/types";

export default function ErrorComponent({ errorResponse }: { errorResponse: ErrorResponse }) {
  return "error" in errorResponse ? (
    <Detail
      markdown={`# Error

${errorResponse.error}`}
    />
  ) : (
    <Detail
      markdown={`# Errors
    
${Object.values(errorResponse.errors).map((errorItem) =>
  Object.entries(errorItem).map(
    ([key, val]) => `

${key}: ${val}`
  )
)}`}
    />
  );
}
