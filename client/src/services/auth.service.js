import { get, post } from "./api";

export const loginUser = ({ schoolCode, email, password }) => {
  return post("/auth/login", { schoolCode, email, password });
};

export const forgotSchoolCode = ({ email, password }) => {
  return post("/auth/forgot-school-code", { email, password });
};

export const registerSchool = ({
  schoolName,
  adminName,
  adminEmail,
  adminPassword,
}) => {
  return post("/signup/school", {
    schoolName,
    adminName,
    adminEmail,
    adminPassword,
  });
};

export const getMe = (token) => {
  return get("/auth/me", { token });
};
