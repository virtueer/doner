import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const WS_URL = API_URL.replace(/^http/, "ws");

export const api = axios.create({ baseURL: API_URL });

api.interceptors.response.use(
	(response) => response,
	(error) => {
		console.error("API error:", error?.response?.data || error.message);
		return Promise.reject(error);
	},
);
