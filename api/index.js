const express = require("express");
const path = require("path");
const pool = require("../db");
require("dotenv").config();

const app = express();

/* ---------- Middleware ---------- */
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

/* ---------- Helper: generate 8-char ID ---------- */
function generateId() {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/* ---------- HEALTH CHECK ---------- */
app.get("/api/healthz", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

/* ---------- CREATE PASTE ---------- */
app.post("/api/pastes", async (req, res) => {
  const { content, ttl_seconds, max_views } = req.body;

  if (!content || typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({ error: "content is required" });
  }

  if (
    ttl_seconds !== undefined &&
    (!Number.isInteger(ttl_seconds) || ttl_seconds < 1)
  ) {
    return res.status(400).json({ error: "invalid ttl_seconds" });
  }

  if (
    max_views !== undefined &&
    (!Number.isInteger(max_views) || max_views < 1)
  ) {
    return res.status(400).json({ error: "invalid max_views" });
  }

  const id = generateId();

  try {
    await pool.query(
      `INSERT INTO pastes (id, content, ttl_seconds, max_views)
       VALUES ($1, $2, $3, $4)`,
      [id, content, ttl_seconds ?? null, max_views ?? null]
    );

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.status(201).json({
      id,
      url: `${baseUrl}/p/${id}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

/* ---------- FETCH PASTE (API) ---------- */
app.get("/api/pastes/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM pastes WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Paste not found" });
    }

    const paste = result.rows[0];

    const nowMs =
      process.env.TEST_MODE === "1" && req.headers["x-test-now-ms"]
        ? Number(req.headers["x-test-now-ms"])
        : Date.now();

    let expires_at = null;

    if (paste.ttl_seconds !== null) {
      expires_at =
        paste.created_at.getTime() + paste.ttl_seconds * 1000;

      if (nowMs >= expires_at) {
        return res
          .status(404)
          .json({ error: "Paste expired (time limit reached)" });
      }
    }

    if (paste.max_views !== null && paste.views >= paste.max_views) {
      return res
        .status(404)
        .json({ error: "Paste expired (view limit exceeded)" });
    }

    await pool.query(
      "UPDATE pastes SET views = views + 1 WHERE id = $1",
      [id]
    );

    const remaining_views =
      paste.max_views === null
        ? null
        : paste.max_views - (paste.views + 1);

    res.json({
      content: paste.content,
      remaining_views:
        remaining_views < 0 ? 0 : remaining_views,
      expires_at: expires_at
        ? new Date(expires_at).toISOString()
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

/* ---------- VIEW PASTE (HTML) ---------- */
app.get("/p/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM pastes WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Paste not found");
    }

    const paste = result.rows[0];

    const nowMs =
      process.env.TEST_MODE === "1" && req.headers["x-test-now-ms"]
        ? Number(req.headers["x-test-now-ms"])
        : Date.now();

    if (paste.ttl_seconds !== null) {
      const expiresAt =
        paste.created_at.getTime() + paste.ttl_seconds * 1000;

      if (nowMs >= expiresAt) {
        return res.send("Paste expired (time limit reached)");
      }
    }

    if (paste.max_views !== null && paste.views >= paste.max_views) {
      return res.send("Paste expired (view limit exceeded)");
    }

    await pool.query(
      "UPDATE pastes SET views = views + 1 WHERE id = $1",
      [id]
    );

    res.type("text/plain").send(paste.content);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

/* ---------- EXPORT FOR VERCEL ---------- */
module.exports = app;
