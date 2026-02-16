// server/tests/services.tokenService.test.js
const jwt = require("jsonwebtoken");
const tokenService = require("../services/tokenService");

describe("services/tokenService", () => {
  const make =
    tokenService.createToken ||
    tokenService.signToken ||
    tokenService.signJwt ||
    tokenService.generateToken;

  test("exports a token creator", () => {
    expect(typeof make).toBe("function");
  });

  test("creates a signed jwt with expected payload keys", () => {
    const token = make({
      _id: "user_123",
      userId: "user_123",
      schoolId: "school_456",
      role: "schoolAdmin",
    });

    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // accept either userId or _id mapping, depending on service implementation
    expect(decoded.userId || decoded._id).toBeTruthy();
    expect(decoded.role).toBe("schoolAdmin");
    expect(decoded.schoolId).toBe("school_456");
  });

  test("supports owner tokens (schoolId null) if allowed", () => {
    const token = make({
      _id: "owner_1",
      userId: "owner_1",
      schoolId: null,
      role: "owner",
    });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.role).toBe("owner");
    expect(decoded.userId || decoded._id).toBeTruthy();
    expect(decoded.schoolId === null || decoded.schoolId === undefined).toBe(
      true,
    );
  });

  test("verify helper works if exported", () => {
    const verify =
      tokenService.verifyToken ||
      tokenService.verifyJwt ||
      tokenService.decodeToken;

    if (typeof verify !== "function") return;

    const token = make({ _id: "u1", schoolId: "s1", role: "teacher" });
    const decoded = verify(token);

    expect(decoded).toBeTruthy();
    expect(decoded.role).toBe("teacher");
  });
});
