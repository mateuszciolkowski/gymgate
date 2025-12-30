export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("gymgate_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("gymgate_token");

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (response.status === 401 && token) {
    localStorage.removeItem("gymgate_token");
    window.location.reload();
    throw new Error("Sesja wygasła. Zaloguj się ponownie.");
  }

  return response;
}
