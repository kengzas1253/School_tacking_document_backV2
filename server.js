require("dotenv").config();

const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const TABLE = "document_tracking";

// ==========================
// AUTH MIDDLEWARE
// ==========================
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("authMiddleware error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// ==========================
// ADMIN MIDDLEWARE
// ==========================
async function adminMiddleware(req, res, next) {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", req.user.id)
      .single();

    if (error) {
      return res.status(500).json({ error: "Cannot check role" });
    }

    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  } catch (err) {
    console.error("adminMiddleware error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// ==========================
// DASHBOARD
// ==========================
app.get("/api/dashboard", authMiddleware, (req, res) => {
  res.json({
    message: "User dashboard",
    user: req.user.email,
  });
});

app.get("/api/admin", authMiddleware, adminMiddleware, (req, res) => {
  res.json({
    message: "Welcome Admin",
    user: req.user.email,
  });
});

// ==========================
// ADMIN USER API
// GET ALL USERS
// ==========================
app.get(
  "/api/admin/user",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ==========================
// UPDATE USER ROLE
// PUT /api/admin/user/:id
// ==========================
app.put(
  "/api/admin/user/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { role } = req.body;

      // จำกัด role ที่อนุญาต
      const allowedRoles = ["user", "admin"];

      if (!role || !allowedRoles.includes(role)) {
        return res.status(400).json({
          error: "Invalid role. Allowed: user, admin",
        });
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.params.id)
        .select();

      if (error) throw error;

      res.json({
        message: "User role updated successfully",
        data,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ==========================
// GET ALL DOCUMENTS
// ==========================
app.get("/documents", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("id", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// GET BY UID
// ==========================
app.get("/documents/uid/:uid", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("uid", req.params.uid);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// GET BY ID
// ==========================
app.get("/documents/:id", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// CREATE DOCUMENT
// รองรับ rejected_at
// ==========================
app.post("/documents", authMiddleware, async (req, res) => {
  try {
    const {
      uid,
      record_datetime,
      doc_number,
      doc_date,
      department,
      officer_name,
      subject,
      phone_number,
      status,
      drive_link,
      remarks,
      processing_at,
      completed_at,
      rejected_at, // ✅ เพิ่ม field นี้
    } = req.body;

    if (!uid || !doc_number || !subject) {
      return res.status(400).json({
        error: "Missing required fields: uid, doc_number, subject",
      });
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert([
        {
          uid,
          record_datetime,
          doc_number,
          doc_date,
          department,
          officer_name,
          subject,
          phone_number,
          status,
          drive_link,
          remarks,
          processing_at,
          completed_at,
          rejected_at, // ✅ เพิ่ม field นี้
        },
      ])
      .select();

    if (error) throw error;

    console.log("Created:", data);

    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// UPDATE DOCUMENT
// รองรับ rejected_at
// ==========================
app.put("/documents/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id, uid, ...safeBody } = req.body;

    // ✅ รองรับ rejected_at อัตโนมัติผ่าน safeBody
    const { data, error } = await supabase
      .from(TABLE)
      .update(safeBody)
      .eq("id", req.params.id)
      .select();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// DELETE DOCUMENT
// ==========================
app.delete(
  "/documents/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq("id", req.params.id);

      if (error) throw error;

      res.json({
        message: "Deleted successfully",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ==========================
// 404 Handler
// ==========================
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

// ==========================
// Global Error Handler
// ==========================
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  res.status(500).json({
    error: "Internal server error",
  });
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
