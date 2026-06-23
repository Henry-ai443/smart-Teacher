import axios from 'axios';

/**
 * Pre-configured Axios instance for the Axiom Education API.
 * - Base URL points to the backend server.
 * - withCredentials ensures HTTP-only auth cookies are sent with every request.
 */
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
