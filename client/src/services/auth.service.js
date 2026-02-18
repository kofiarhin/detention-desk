import { apiRequest } from './api'

export const loginUser = ({ schoolCode, email, password }) => {
  return apiRequest({
    path: '/api/auth/login',
    method: 'POST',
    body: { schoolCode, email, password },
  })
}

export const registerSchool = ({ schoolName, schoolCode, adminName, adminEmail, adminPassword }) => {
  return apiRequest({
    path: '/api/signup/school',
    method: 'POST',
    body: { schoolName, schoolCode, adminName, adminEmail, adminPassword },
  })
}

export const getMe = (token) => {
  return apiRequest({
    path: '/api/auth/me',
    method: 'GET',
    token,
  })
}
