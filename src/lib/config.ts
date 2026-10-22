// Public client config only. Never place secrets in VITE_* variables.
export const config = {
  apiBaseUrl: (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "",
  // Mock mode stays on unless explicitly disabled AND a base URL is configured.
  useMock:
    (import.meta.env["VITE_USE_MOCK_DATA"] as string | undefined) !== "false" ||
    !import.meta.env["VITE_API_BASE_URL"],
};
