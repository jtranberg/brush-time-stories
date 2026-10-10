const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5050";

const TOKEN_KEY = "brushtime_user_token";

export function getUserToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setUserToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearUserToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function userLogout() {
  clearUserToken();
}

export async function registerUser(email, password) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to create account.");
  }

  setUserToken(data.token);

  return data;
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to log in.");
  }

  setUserToken(data.token);

  return data;
}

export async function getCurrentUser() {
  const token = getUserToken();

  if (!token) {
    return null;
  }

  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    clearUserToken();
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to verify user session.");
  }

  return data.user;
}

export async function changeUserPassword(
  currentPassword,
  newPassword,
) {
  const token = getUserToken();

  const response = await fetch(`${API_URL}/api/auth/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to change password.");
  }

  return data;
}

export async function deleteUserAccount(password, confirmation) {
  const token = getUserToken();

  const response = await fetch(`${API_URL}/api/auth/account`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      password,
      confirmation,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to delete account.");
  }

  clearUserToken();

  return data;
}