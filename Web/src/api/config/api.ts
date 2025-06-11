import axios from 'axios';
import { API_URL } from './link_api';

// สร้าง instance ของ axios
const api = axios.create({
  baseURL: API_URL.BASE_URL, // เริ่มต้นด้วย _HOST_MAIN
  withCredentials: true, // ✅ สำคัญมาก เพื่อให้ Cookie ถูกส่งไป-กลับ
  timeout: 10000, // 10 วินาที
});

// Export instance
export default api;
