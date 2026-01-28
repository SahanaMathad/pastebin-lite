// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,  // ✅ Uses pastebin DB
// });

// pool.on("connect", () => {
//   console.log("Connected to Postgres");     // ✅ Debug logging
// });

// module.exports = pool;
// db.js
const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (!global.__pgPool) {
  global.__pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // required for Neon TLS
    },
  });

  global.__pgPool.on("connect", () => console.log("Connected to Neon Postgres"));
}

pool = global.__pgPool;

module.exports = pool;
