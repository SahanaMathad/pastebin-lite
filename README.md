# Pastebin-Lite

A simple Pastebin-like application where users can create text pastes and share them via a unique URL. Pastes can have optional **time-based expiry (TTL)** and/or **view-count limits**. Users can view pastes through a web interface or API.

## How to Run Locally

1. Clone the repository:

```bash
git clone https://github.com/SahanaMathad/pastebin-lite.git
cd pastebin-lite
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your Neon Postgres connection string:

```env
DATABASE_URL=your_neon_connection_string
TEST_MODE=0
```

4. Start the application:

```bash
node index.js
```

5. Open your browser and navigate to:

```
http://localhost:3000
```

## Persistence Layer

- PostgreSQL database hosted on Neon  
- Ensures pastes persist across requests and server restarts  
- Connection configured via the `DATABASE_URL` environment variable

