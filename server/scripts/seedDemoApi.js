/* eslint-disable no-console */
/**
 * DetentionDesk Demo Seeder (API-driven)
 *
 * Seeds 3 demo schools with:
 * - 1 admin each
 * - 3 active teachers + 1 inactive teacher each
 * - 30 students each (assigned across teachers)
 * - incidents (which trigger detentions via engine)
 * - rewards (offsets applied)
 * - notes (optional, if endpoint exists)
 *
 * WHY API-DRIVEN?
 * - Avoids schema mismatch
 * - Uses your real auth + tenant isolation + discipline engine
 * - Produces a truly demo-ready dataset
 *
 * REQUIREMENTS
 * - Backend running (local or remote)
 * - Node 18+ (global fetch). Your repo CI uses Node 20.
 *
 * ENV
 * - SEED_API_URL=http://localhost:5000
 * - SEED_SCHOOLS=3
 * - SEED_STUDENTS_PER_SCHOOL=30
 * - SEED_TEACHERS_PER_SCHOOL=3
 * - SEED_INCIDENTS_PER_STUDENT=2
 * - SEED_REWARDS_PER_STUDENT=1
 * - SEED_SEED=12345  (optional deterministic RNG)
 * - SEED_RESET=true  (optional: tries to reuse or recreate codes; does NOT delete DB)
 *
 * Run:
 *   node server/scripts/seedDemoApi.js
 */

require("dotenv").config();

const DEFAULTS = {
  API_URL: process.env.SEED_API_URL || "http://localhost:5000",
  SCHOOLS: Number(process.env.SEED_SCHOOLS || 3),
  TEACHERS_PER_SCHOOL: Number(process.env.SEED_TEACHERS_PER_SCHOOL || 3),
  STUDENTS_PER_SCHOOL: Number(process.env.SEED_STUDENTS_PER_SCHOOL || 30),
  INCIDENTS_PER_STUDENT: Number(process.env.SEED_INCIDENTS_PER_STUDENT || 2),
  REWARDS_PER_STUDENT: Number(process.env.SEED_REWARDS_PER_STUDENT || 1),
  SEED: process.env.SEED_SEED ? Number(process.env.SEED_SEED) : null,
};

const ENDPOINTS = {
  SIGNUP_SCHOOL: "/signup/school",
  LOGIN: "/auth/login",
  ME: "/auth/me",

  // Admin
  ADMIN_TEACHERS: "/api/admin/teachers",
  ADMIN_TEACHER_DEACTIVATE: (id) => `/api/admin/teachers/${id}/deactivate`,
  ADMIN_TEACHER_REACTIVATE: (id) => `/api/admin/teachers/${id}/reactivate`,

  // Students
  STUDENTS: "/api/students",

  // Discipline
  INCIDENTS: "/api/incidents",
  REWARDS: "/api/rewards",

  // Categories (we try multiple variants below)
};

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = DEFAULTS.SEED != null ? mulberry32(DEFAULTS.SEED) : Math.random;

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(rng() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function randInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function slug(n) {
  return String(n)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function nowMinusDays(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function apiFetch({
  baseUrl,
  path,
  method = "GET",
  token,
  body,
  timeoutMs = 20000,
}) {
  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (_) {
      json = { raw: text };
    }

    if (!res.ok) {
      const message =
        json?.message ||
        json?.error?.message ||
        json?.error ||
        `Request failed: ${method} ${path} (${res.status})`;
      const code = json?.code || json?.error?.code;
      const err = new Error(message);
      err.status = res.status;
      err.code = code;
      err.payload = json;
      throw err;
    }

    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function safeTry(fn, label) {
  try {
    return await fn();
  } catch (e) {
    console.log(`[seed] ⚠️ ${label} failed: ${e.message}`);
    return null;
  }
}

function makeSchoolCode(i) {
  // demo-friendly but unique-ish
  const suffix = String(100 + i + randInt(0, 899));
  return `DEMO${suffix}`.toUpperCase();
}

function makeEmail(prefix, schoolCode) {
  return `${slug(prefix)}+${slug(schoolCode)}@demo.school`;
}

function makePassword() {
  // demo-only; not a secret. Still not hardcoded per-school.
  return `Demo!${randInt(1000, 9999)}Ab`;
}

async function getCategories(baseUrl, token) {
  // Try common shapes without assuming exact implementation
  const attempts = [
    () => apiFetch({ baseUrl, path: "/api/categories", token }),
    () => apiFetch({ baseUrl, path: "/api/categories?type=behaviour", token }),
    () => apiFetch({ baseUrl, path: "/api/categories?type=reward", token }),
    () => apiFetch({ baseUrl, path: "/api/policy/categories", token }),
  ];

  for (const attempt of attempts) {
    const res = await safeTry(attempt, "fetch categories");
    if (!res) continue;

    // normalize: could be {data: []} or [] or {categories: []}
    const list =
      res?.data || res?.categories || (Array.isArray(res) ? res : null);
    if (Array.isArray(list) && list.length) return list;
  }

  return [];
}

function splitCategories(categories) {
  const behaviour = categories.filter(
    (c) => (c.type || c.categoryType) === "behaviour",
  );
  const reward = categories.filter(
    (c) => (c.type || c.categoryType) === "reward",
  );

  // Some implementations may not have "type"; fallback by checking fields
  const fallbackBehaviour = behaviour.length
    ? behaviour
    : categories.filter(
        (c) => c.detentionMinutes != null || c.defaultDetentionMinutes != null,
      );

  const fallbackReward = reward.length
    ? reward
    : categories.filter((c) => c.rewardMinutes != null);

  return {
    behaviourCats: fallbackBehaviour,
    rewardCats: fallbackReward,
  };
}

async function createSchoolAndAdmin({ baseUrl, schoolIndex }) {
  const schoolCode = makeSchoolCode(schoolIndex);
  const adminEmail = makeEmail("admin", schoolCode);
  const adminPassword = makePassword();

  // Signup creates school + admin + policy + categories (per your Phase 1)
  const signupPayload = await apiFetch({
    baseUrl,
    path: ENDPOINTS.SIGNUP_SCHOOL,
    method: "POST",
    body: {
      schoolName: `Demo School ${schoolIndex + 1}`,
      schoolCode,
      adminName: `Demo Admin ${schoolIndex + 1}`,
      adminEmail,
      adminPassword,
    },
  });

  // token could be nested
  const token =
    signupPayload?.token ||
    signupPayload?.data?.token ||
    signupPayload?.data?.auth?.token ||
    null;

  if (!token) {
    throw new Error(
      "Signup did not return a token. Check /signup/school response shape.",
    );
  }

  // Ensure /auth/me works; also gives userId/role
  const me = await apiFetch({ baseUrl, path: ENDPOINTS.ME, token });

  return {
    schoolCode,
    adminEmail,
    adminPassword,
    adminToken: token,
    adminUser: me?.data || me?.user || me,
  };
}

async function createTeachers({
  baseUrl,
  adminToken,
  schoolCode,
  teachersPerSchool,
}) {
  const teachers = [];

  for (let i = 0; i < teachersPerSchool; i++) {
    const name = pick([
      "Ama Boateng",
      "Kwame Mensah",
      "Efua Owusu",
      "Kojo Agyeman",
      "Yaw Tetteh",
      "Akosua Asare",
      "Nana Ofori",
      "Esi Amoah",
    ]);
    const email = makeEmail(`teacher${i + 1}`, schoolCode);
    const password = makePassword();

    const created = await apiFetch({
      baseUrl,
      path: ENDPOINTS.ADMIN_TEACHERS,
      method: "POST",
      token: adminToken,
      body: {
        name: `${name} (${schoolCode})`,
        email,
        password,
      },
    });

    const teacher = created?.data || created?.teacher || created;
    teachers.push({ ...teacher, seedPassword: password, seedEmail: email });
  }

  // Create one inactive teacher
  const inactiveEmail = makeEmail("teacher-inactive", schoolCode);
  const inactivePassword = makePassword();

  const createdInactive = await apiFetch({
    baseUrl,
    path: ENDPOINTS.ADMIN_TEACHERS,
    method: "POST",
    token: adminToken,
    body: {
      name: `Inactive Teacher (${schoolCode})`,
      email: inactiveEmail,
      password: inactivePassword,
    },
  });

  const inactiveTeacher =
    createdInactive?.data || createdInactive?.teacher || createdInactive;

  // Deactivate if endpoint exists
  await safeTry(
    () =>
      apiFetch({
        baseUrl,
        path: ENDPOINTS.ADMIN_TEACHER_DEACTIVATE(
          inactiveTeacher._id || inactiveTeacher.id,
        ),
        method: "POST",
        token: adminToken,
      }),
    "deactivate teacher",
  );

  teachers.push({
    ...inactiveTeacher,
    seedPassword: inactivePassword,
    seedEmail: inactiveEmail,
    inactive: true,
  });

  return teachers;
}

async function createStudents({
  baseUrl,
  adminToken,
  teachers,
  studentsPerSchool,
}) {
  const firstNames = [
    "Ava",
    "Noah",
    "Mia",
    "Liam",
    "Zoe",
    "Ethan",
    "Ivy",
    "Lucas",
    "Nina",
    "Kai",
    "Kofi",
    "Ama",
  ];
  const lastNames = [
    "Mensah",
    "Owusu",
    "Boateng",
    "Agyeman",
    "Addo",
    "Tetteh",
    "Asare",
    "Ofori",
    "Amoah",
    "Quaye",
  ];
  const yearGroups = ["7", "8", "9", "10", "11"];
  const tutorGroups = ["A", "B", "C", "D"];
  const statuses = ["active", "active", "active", "active", "suspended"]; // mostly active

  const activeTeachers = teachers.filter((t) => !t.inactive);

  const students = [];
  for (let i = 0; i < studentsPerSchool; i++) {
    const t = activeTeachers[i % activeTeachers.length];

    const firstName = pick(firstNames);
    const lastName = pick(lastNames);
    const yearGroup = pick(yearGroups);
    const tutorGroup = pick(tutorGroups);
    const status = pick(statuses);
    const admissionNumber = `ADM${String(i + 1).padStart(3, "0")}-${String(randInt(10, 99))}`;

    const created = await apiFetch({
      baseUrl,
      path: ENDPOINTS.STUDENTS,
      method: "POST",
      token: adminToken,
      body: {
        name: `${firstName} ${lastName}`,
        yearGroup,
        tutorGroup,
        guardianContact: {
          name: `${pick(["Mr", "Mrs", "Ms"])} ${lastName}`,
          phone: `+233${randInt(200000000, 599999999)}`,
          email: `${slug(lastName)}.${admissionNumber.toLowerCase()}@guardian.demo`,
        },
        tags: pickN(
          [
            "needs-support",
            "excellent",
            "monitor",
            "new",
            "sports",
            "music",
            "stem",
          ],
          randInt(0, 3),
        ),
        status,
        admissionNumber,
        assignedTeacherId: t._id || t.id,
      },
    });

    const student = created?.data || created?.student || created;
    students.push(student);
  }

  return students;
}

async function seedIncidentsAndDetentions({
  baseUrl,
  token,
  students,
  behaviourCats,
  incidentsPerStudent,
}) {
  if (!behaviourCats.length) {
    console.log(
      "[seed] ⚠️ No behaviour categories found. Incidents require categoryId in most setups.",
    );
    return { incidents: [] };
  }

  const incidents = [];

  // Seed across a subset for a tight demo timeline
  const subset = students.slice(0, Math.min(students.length, 12));

  for (let i = 0; i < subset.length; i++) {
    const student = subset[i];

    for (let j = 0; j < incidentsPerStudent; j++) {
      const cat = pick(behaviourCats);
      const occurredAt = nowMinusDays(randInt(1, 21));

      const created = await apiFetch({
        baseUrl,
        path: ENDPOINTS.INCIDENTS,
        method: "POST",
        token,
        body: {
          studentId: student._id || student.id,
          categoryId: cat._id || cat.id,
          occurredAt,
          notes: `Seeded incident (${j + 1}) for demo timeline.`,
          severity: pick(["low", "medium", "high"]),
        },
      });

      const incident = created?.data || created?.incident || created;
      incidents.push(incident);
    }
  }

  return { incidents };
}

async function seedRewards({
  baseUrl,
  token,
  students,
  rewardCats,
  rewardsPerStudent,
}) {
  if (!rewardCats.length) {
    console.log(
      "[seed] ⚠️ No reward categories found. Rewards require categoryId in most setups.",
    );
    return { rewards: [] };
  }

  const rewards = [];

  const subset = students.slice(6, Math.min(students.length, 18));
  for (let i = 0; i < subset.length; i++) {
    const student = subset[i];

    for (let j = 0; j < rewardsPerStudent; j++) {
      const cat = pick(rewardCats);

      const created = await apiFetch({
        baseUrl,
        path: ENDPOINTS.REWARDS,
        method: "POST",
        token,
        body: {
          studentId: student._id || student.id,
          categoryId: cat._id || cat.id,
          notes: `Seeded reward (${j + 1}) to test offsets.`,
          awardedAt: nowMinusDays(randInt(1, 14)),
        },
      });

      const reward = created?.data || created?.reward || created;
      rewards.push(reward);
    }
  }

  return { rewards };
}

async function main() {
  const baseUrl = DEFAULTS.API_URL.replace(/\/$/, "");
  console.log(`\n[seed] API: ${baseUrl}`);
  console.log(
    `[seed] schools=${DEFAULTS.SCHOOLS} teachers/school=${DEFAULTS.TEACHERS_PER_SCHOOL} students/school=${DEFAULTS.STUDENTS_PER_SCHOOL}\n`,
  );

  const output = [];

  for (let s = 0; s < DEFAULTS.SCHOOLS; s++) {
    console.log(
      `\n[seed] === Creating School ${s + 1}/${DEFAULTS.SCHOOLS} ===`,
    );

    const { schoolCode, adminEmail, adminPassword, adminToken } =
      await createSchoolAndAdmin({
        baseUrl,
        schoolIndex: s,
      });

    console.log(`[seed] schoolCode=${schoolCode}`);
    console.log(`[seed] admin=${adminEmail} password=${adminPassword}`);

    // categories
    const categories = await getCategories(baseUrl, adminToken);
    const { behaviourCats, rewardCats } = splitCategories(categories);

    console.log(
      `[seed] categories: total=${categories.length} behaviour=${behaviourCats.length} reward=${rewardCats.length}`,
    );

    // teachers
    const teachers = await createTeachers({
      baseUrl,
      adminToken,
      schoolCode,
      teachersPerSchool: DEFAULTS.TEACHERS_PER_SCHOOL,
    });

    console.log(
      `[seed] teachers created: ${teachers.length} (includes 1 inactive)`,
    );

    // students
    const students = await createStudents({
      baseUrl,
      adminToken,
      teachers,
      studentsPerSchool: DEFAULTS.STUDENTS_PER_SCHOOL,
    });

    console.log(`[seed] students created: ${students.length}`);

    // incidents -> detentions
    const { incidents } = await seedIncidentsAndDetentions({
      baseUrl,
      token: adminToken,
      students,
      behaviourCats,
      incidentsPerStudent: DEFAULTS.INCIDENTS_PER_STUDENT,
    });

    console.log(
      `[seed] incidents created: ${incidents.length} (detentions should auto-create via engine)`,
    );

    // rewards -> offsets
    const { rewards } = await seedRewards({
      baseUrl,
      token: adminToken,
      students,
      rewardCats,
      rewardsPerStudent: DEFAULTS.REWARDS_PER_STUDENT,
    });

    console.log(
      `[seed] rewards created: ${rewards.length} (offsets should apply)`,
    );

    output.push({
      schoolCode,
      admin: { email: adminEmail, password: adminPassword },
      teachers: teachers.map((t) => ({
        id: t._id || t.id,
        name: t.name,
        email: t.seedEmail || t.email,
        password: t.seedPassword,
        status: t.inactive ? "inactive" : "active",
      })),
      stats: {
        students: students.length,
        incidents: incidents.length,
        rewards: rewards.length,
      },
    });
  }

  console.log("\n\n[seed] ✅ DONE. Demo credentials:\n");

  output.forEach((school, idx) => {
    console.log(`--- School ${idx + 1}: ${school.schoolCode} ---`);
    console.log(`Admin: ${school.admin.email} / ${school.admin.password}`);
    console.log("Teachers:");
    school.teachers.forEach((t) => {
      console.log(`  - (${t.status}) ${t.email} / ${t.password}`);
    });
    console.log(
      `Stats: students=${school.stats.students} incidents=${school.stats.incidents} rewards=${school.stats.rewards}`,
    );
    console.log("");
  });

  console.log(
    "[seed] Tip: Use Admin -> Teachers/Students/Detentions pages to demo workflows.\n",
  );
}

main().catch((err) => {
  console.error("\n[seed] ❌ FAILED:", err.message);
  if (err.payload)
    console.error("[seed] payload:", JSON.stringify(err.payload, null, 2));
  process.exit(1);
});
