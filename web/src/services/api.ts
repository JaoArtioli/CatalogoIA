import axios, { AxiosResponse } from "axios";
import { API_BASE_URL } from "@/utils/constants";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      // eslint-disable-next-line no-param-reassign
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

export const handleApiError = (error: any): string => {
  if (error.response?.data?.detail) return error.response.data.detail;
  if (error.message) return error.message;
  return "Erro inesperado. Tente novamente.";
};
