import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({
	baseURL: apiUrl,
	// You can add default headers or timeout here if needed
});

// Example of interceptors if needed in the future:
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     return Promise.reject(error);
//   }
// );
