export const getApiBaseUrl = () => {
  const configuredApiUrl = process.env.REACT_APP_API_URL?.trim();

  if (configuredApiUrl) {
    return configuredApiUrl;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const normalizedHostname =
      hostname === "0.0.0.0" || hostname === "::" || hostname === "[::]"
        ? "localhost"
        : hostname;

    return `${protocol}//${normalizedHostname}:8000`;
  }

  return "http://localhost:8000";
};

export const API_BASE_URL = getApiBaseUrl();