#!/usr/bin/env bash
# Bootstrap YCMS for local development on macOS or Linux.
# Starts PostgreSQL (Docker Compose if available, otherwise a local server),
# writes env files, installs npm packages, migrates, and seeds demo data.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_USER="${YCMS_DB_USER:-ycms}"
DB_PASSWORD="${YCMS_DB_PASSWORD:-ycms_dev_password}"
DB_NAME="${YCMS_DB_NAME:-ycms}"
DB_HOST="${YCMS_DB_HOST:-127.0.0.1}"
DB_PORT="${YCMS_DB_PORT:-5432}"
DATABASE_URL="${DATABASE_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public}"
AUTH_URL="${AUTH_URL:-http://localhost:3000}"

log() {
  printf '\n==> %s\n' "$*"
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

require_node() {
  command -v node >/dev/null 2>&1 || die "Node.js 22+ is required. Install it from https://nodejs.org/"
  command -v npm >/dev/null 2>&1 || die "npm is required (it ships with Node.js)."

  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [ "$major" -lt 22 ]; then
    die "Node.js 22+ is required (found $(node -v))."
  fi
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32
  else
    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  fi
}

write_env_file() {
  local path="$1"
  local secret="$2"
  cat >"$path" <<EOF
DATABASE_URL="${DATABASE_URL}"
AUTH_SECRET="${secret}"
AUTH_URL="${AUTH_URL}"
EOF
}

ensure_env_files() {
  local secret
  if [ -f .env ]; then
    log "Keeping existing .env"
  else
    secret="$(generate_secret)"
    write_env_file .env "$secret"
    log "Wrote .env"
  fi

  if [ -f .env.local ]; then
    log "Keeping existing .env.local"
  else
    cp .env .env.local
    log "Wrote .env.local"
  fi
}

docker_available() {
  command -v docker >/dev/null 2>&1 || return 1
  docker info >/dev/null 2>&1
}

compose_up() {
  if docker compose version >/dev/null 2>&1; then
    docker compose up -d
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose up -d
  else
    return 1
  fi
}

pg_ready() {
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1
    return $?
  fi
  HOST="$DB_HOST" PORT="$DB_PORT" node -e "
    const net = require('net');
    const socket = net.connect({ host: process.env.HOST, port: Number(process.env.PORT) }, () => {
      socket.end();
      process.exit(0);
    });
    socket.on('error', () => process.exit(1));
    setTimeout(() => process.exit(1), 2000);
  " >/dev/null 2>&1
}

wait_for_postgres() {
  local i
  for i in $(seq 1 40); do
    if pg_ready; then
      return 0
    fi
    sleep 1
  done
  return 1
}

psql_as_postgres() {
  # Ubuntu/Debian packages and Homebrew both typically expose a postgres superuser.
  if command -v sudo >/dev/null 2>&1 && id postgres >/dev/null 2>&1; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 "$@"
  elif command -v psql >/dev/null 2>&1; then
    psql -U postgres -v ON_ERROR_STOP=1 "$@"
  else
    return 1
  fi
}

ensure_local_database() {
  psql_as_postgres -d postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}' CREATEDB;
  END IF;
END
\$\$;
SQL
  if ! psql_as_postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1; then
    psql_as_postgres -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
  fi
}

start_local_cluster() {
  if command -v pg_ctlcluster >/dev/null 2>&1; then
    sudo pg_ctlcluster 16 main start >/dev/null 2>&1 || sudo pg_ctlcluster 16 main start || true
  elif command -v brew >/dev/null 2>&1; then
    brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null || true
  fi
}

start_postgres() {
  if pg_ready; then
    log "PostgreSQL already reachable at ${DB_HOST}:${DB_PORT}"
  elif docker_available; then
    log "Starting PostgreSQL with Docker Compose"
    compose_up || die "Docker Compose failed to start PostgreSQL."
    wait_for_postgres || die "PostgreSQL in Docker did not become ready."
  else
    log "Docker is not available; using a local PostgreSQL server"
    start_local_cluster
    # Superuser access is enough to create the app role even if TCP is still coming up.
    sleep 1
  fi

  if psql_as_postgres -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
    ensure_local_database || die "Could not create the '${DB_NAME}' database. Create it manually, then rerun this script."
  fi

  wait_for_postgres || die "PostgreSQL is not accepting connections on ${DB_HOST}:${DB_PORT}. Install Docker Desktop or PostgreSQL 16+ and retry."
}

install_packages() {
  log "Installing npm packages"
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
}

migrate_and_seed() {
  log "Applying Prisma migrations"
  npx prisma migrate deploy
  log "Seeding demo data"
  npx prisma db seed
}

require_node
ensure_env_files
# shellcheck disable=SC1091
set -a
. ./.env
set +a
start_postgres
install_packages
migrate_and_seed

cat <<EOF

YCMS is ready to run locally.

  npm run dev

Then open ${AUTH_URL} and sign in with:

  admin@ycms.local / YcmsDemo123!
  coordinator@ycms.local / YcmsDemo123!
  volunteer@ycms.local / YcmsDemo123!

These demo passwords are for development only.
EOF
