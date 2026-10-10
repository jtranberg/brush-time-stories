const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5050";

  

const TOKEN_KEY = "brushtime_admin_token";

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isAdminLoggedIn() {
  return Boolean(getAdminToken());
}

export async function adminLogin(email, password) {
  const response = await fetch(`${API_URL}/api/admin/auth/login`, {
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

  setAdminToken(data.token);

  return data;
}

export async function getCurrentAdmin() {
  const token = getAdminToken();

  if (!token) {
    return null;
  }

  const response = await fetch(`${API_URL}/api/admin/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    clearAdminToken();
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to verify admin session.");
  }

  return data.admin;
}

export async function changeAdminPassword(
  currentPassword,
  newPassword
) {
  const token = getAdminToken();

  const response = await fetch(`${API_URL}/api/admin/auth/password`, {
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

export async function deleteAdminAccount(password, confirmation) {
  const token = getAdminToken();

  const response = await fetch(`${API_URL}/api/admin/auth/account`, {
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
    throw new Error(data.message || "Unable to delete admin account.");
  }

  clearAdminToken();

  return data;
}

export function adminLogout() {
  clearAdminToken();
}