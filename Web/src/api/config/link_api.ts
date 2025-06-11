const HOSTNAME = import.meta.env.MODE === 'production' ? import.meta.env.VITE_BASE_PRODUCTION_URL : import.meta.env.VITE_BASE_TEST_URL;
const API_PATH = import.meta.env.VITE_API_PATH;
const WEB_LINK = import.meta.env.VITE_WEB_LINK;
const ENERGY_LINK = import.meta.env.VITE_ENERGY_LINK;

export const API_URL = {
  BASE_URL: HOSTNAME,
  CONTENT_TYPE_JSON: { 'Content-Type': 'application/json; charset=utf-8' },
  CONTENT_TYPE_FILE_UPLOAD: { 'Content-Type': 'multipart/form-data' },
  GET_DASHBOARD: `${API_PATH}${WEB_LINK}/dashboard`,
  LOGIN: `${API_PATH}/login`,
  LOGOUT: `${API_PATH}/logout`,

  // ข้อมูลเครื่องชั่ง
  POST_MACHINE_SETTINGS: `${API_PATH}${WEB_LINK}/machine/settings`,
  GET_PRODUCTION: `${API_PATH}${WEB_LINK}/production`,
  POST_PRODUCTION_UPDATE: `${API_PATH}${WEB_LINK}/production/update`,
  POST_PRODUCTION_DELETE: `${API_PATH}${WEB_LINK}/production/delete`,
  GET_PRODUCTS: `${API_PATH}${WEB_LINK}/products`,
  GET_PRODUCTS_TYPE: `${API_PATH}${WEB_LINK}/product/types`,
  GET_DETAILS: `${API_PATH}${WEB_LINK}/details`,

  // ข้อมูลเครื่องจักร
  UPDATE_SUBSCRIPT: `${API_PATH}/update-subscriptions`,
  GET_PERFORMANCE: `${API_PATH}${WEB_LINK}/performance`,
  GET_MACHINE: `${API_PATH}${WEB_LINK}/machine`,
  GET_MACHINE_GROUPS: `${API_PATH}${WEB_LINK}/machineGroups`,

  // ข้อมูลมิเตอร์
  GET_METERS: `${API_PATH}${ENERGY_LINK}/meters-lists`,
  GET_METER_DATA: `${API_PATH}${ENERGY_LINK}/meter-data`,

  // รายงานเครื่องจักร
  GET_MACHINE_REPORT: `${API_PATH}${WEB_LINK}/machine-report`,

};
