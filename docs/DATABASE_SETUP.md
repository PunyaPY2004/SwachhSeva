# Database Setup — PostgreSQL

Your backend already works fine with SQLite for local testing (that's
what you've been using so far). This guide is for switching to
PostgreSQL, which the original project spec calls for as the "real"
database, and which the Docker setup uses automatically.

You can skip this entirely if SQLite has worked fine for your demo and
you don't need PostgreSQL specifically for grading.

## Option A: Docker (easiest — skip manual install)

If you're using `docker compose up`, PostgreSQL is already set up for
you automatically — skip to "Option B" only if you want Postgres
running natively on Windows without Docker.

## Option B: Native install on Windows

### 1. Download and install

- Go to https://www.postgresql.org/download/windows/
- Download the installer (version 16 recommended, matching Docker's version)
- Run it. During setup:
  - Set a password for the `postgres` superuser — **remember this**, you'll need it
  - Keep the default port: `5432`
  - Keep default locale settings

### 2. Open the PostgreSQL command tool

After installation, open **"SQL Shell (psql)"** from the Start Menu
(installed alongside PostgreSQL).

- Press Enter through the prompts (Server, Database, Port, Username) to
  accept defaults, until it asks for **Password** — enter the password
  you set during install.

### 3. Create the database and user

At the `postgres=#` prompt, run these commands one at a time (each ends
with a semicolon):

```sql
CREATE DATABASE swachhseva;
CREATE USER swachhseva_user WITH PASSWORD 'changeme';
GRANT ALL PRIVILEGES ON DATABASE swachhseva TO swachhseva_user;
```

(Replace `'changeme'` with your own password if you want — just remember
to use the same one in your `.env` file next.)

### 4. Update your backend's `.env` file

Open `backend/.env` in VS Code and set:
```
DATABASE_URL=postgresql://swachhseva_user:changeme@localhost:5432/swachhseva
```

### 5. Install the Python driver (if not already installed)

In your backend terminal (venv activated):
```
pip install psycopg2-binary
```
(This is already in `requirements.txt`, so `pip install -r requirements.txt` covers it too.)

### 6. Recreate the tables in the new database

```
flask --app run init-db
```

### 7. Verify the connection

```
flask --app run create-admin
```
If this runs without a connection error and creates an admin account,
your backend is now talking to PostgreSQL successfully.

## Verifying data landed correctly (optional)

Back in the `psql` shell:
```sql
\c swachhseva
SELECT email, role FROM users;
SELECT tracking_id, status FROM complaints;
```
`\c swachhseva` connects to your database, and the two `SELECT`
statements should show the data you created through the app/API.

## Switching back to SQLite

Just clear the `DATABASE_URL` line in `.env` back to blank — the backend
automatically falls back to a local SQLite file when that's empty.
