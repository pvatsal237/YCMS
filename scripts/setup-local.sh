#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "YCMS local setup"
echo "Working directory: $ROOT"
echo

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1"
    echo "$2"
    exit 1
  fi
}

need git "Install Git from https://git-scm.com or Xcode Command Line Tools: xcode-select --install"
need node "Install Node.js 22+ from https://nodejs.org"
need npm "npm comes with Node.js. Reinstall Node.js from https://nodejs.org"
need openssl "openssl should already exist on macOS."

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js 20+ is required. You have $(node -v)."
  exit 1
fi

add_postgres_to_path() {
  if [ -d /opt/homebrew/opt/postgresql@16/bin ]; then
    export PATH="/opt/homebrew/opt/postgresql@16/bin:/opt/homebrew/bin:$PATH"
  elif [ -d /usr/local/opt/postgresql@16/bin ]; then
    export PATH="/usr/local/opt/postgresql@16/bin:/usr/local/bin:$PATH"
  elif [ -d /opt/homebrew/bin ]; then
    export PATH="/opt/homebrew/bin:$PATH"
  fi
}

add_postgres_to_path

wait_for_postgres() {
  local tries=0
  until node -e "
    const net = require('net');
    const s = net.connect({ host: '127.0.0.1', port: 5432 }, () => { s.end(); process.exit(0); });
    s.on('error', () => process.exit(1));
  " >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -gt 60 ]; then
      echo "PostgreSQL did not become ready on port 5432."
      exit 1
    fi
    sleep 1
  done
}

start_postgres() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "Starting PostgreSQL with Docker..."
    docker compose up -d
    wait_for_postgres
    return
  fi

  if command -v pg_isready >/dev/null 2>&1 && pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    echo "Using the PostgreSQL server already running on this Mac."
    return
  fi

  if command -v brew >/dev/null 2>&1; then
    echo "Docker is not running. Installing/starting PostgreSQL with Homebrew..."
    brew list postgresql@16 >/dev/null 2>&1 || brew install postgresql@16
    brew services start postgresql@16
    sleep 2
    createuser ycms 2>/dev/null || true
    psql -d postgres -c "ALTER USER ycms WITH PASSWORD 'ycms_dev_password' CREATEDB;" >/dev/null 2>&1 || true
    createdb -O ycms ycms 2>/dev/null || true
    wait_for_postgres
    return
  fi

  echo "PostgreSQL is not available."
  echo "Install Docker Desktop from https://www.docker.com/products/docker-desktop/ and start it,"
  echo "or install Homebrew from https://brew.sh and rerun this script."
  exit 1
}

AUTH_SECRET="$(openssl rand -base64 32)"
for envfile in .env .env.local; do
  if [ ! -f "$envfile" ]; then
    sed "s|replace-with-a-long-random-string|$AUTH_SECRET|" .env.example > "$envfile"
    echo "Created $envfile"
  else
    echo "Keeping existing $envfile"
  fi
done

start_postgres

echo "Installing npm packages..."
npm install

echo "Applying database migrations..."
npx prisma generate
npx prisma migrate deploy

echo "Seeding demo data..."
npx prisma db seed

echo
echo "Setup complete."
echo "Open http://localhost:3000/login"
echo "Staff: admin@ycms.local / YcmsDemo123!"
echo "Member OTP: hetvi.patel@example.test (set DEV_SHOW_OTP=true in .env.local)"
echo

npm run dev
