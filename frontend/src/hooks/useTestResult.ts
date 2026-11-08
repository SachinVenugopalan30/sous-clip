import { useState } from "react";

type TestStatus = "idle" | "loading" | "success" | "error";

/** Status and message for a "Test connection" button. */
export function useTestResult() {
  const [result, setResult] = useState<{ status: TestStatus; message: string }>({ status: "idle", message: "" });
  return {
    ...result,
    set: (status: TestStatus, message = "") => setResult({ status, message }),
    reset: () => setResult({ status: "idle", message: "" }),
  };
}
