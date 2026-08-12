import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({
	baseURL: apiUrl,
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
		console.error("API error:", error?.response?.data || error.message);
		return Promise.reject(error);
	},
);
