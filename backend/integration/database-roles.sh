#!/usr/bin/env bash
set -euo pipefail
: "${TEST_DATABASE_URL:?Disposable integration database required}"
[[ "$TEST_DATABASE_URL" == *127.0.0.1* && "$TEST_DATABASE_URL" == */song_nexus_test ]] || exit 1
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE "fixture-migration-owner" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE "fixture-web-app" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD 'integration-only';
SQL
for pass in 1 2; do
  psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -v app_role=fixture-web-app \
    -v migration_role=fixture-migration-owner -f scripts/deploy/database-grants.sql
done
APP_TEST_DATABASE_URL=$(node -e 'const u=new URL(process.env.TEST_DATABASE_URL);u.username="fixture-web-app";console.log(u.href)')
# Connect as the actual runtime login: SET ROLE from a superuser session would
# still permit switching to any role and is not an adequate membership test.
psql "$APP_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL' 
BEGIN;
INSERT INTO users(username,email,password_hash,is_active) VALUES('permission-test','permission@example.test','synthetic',true);
UPDATE users SET username='permission-updated' WHERE email='permission@example.test';
SELECT id FROM users WHERE email='permission@example.test';
DELETE FROM users WHERE email='permission@example.test';
ROLLBACK;
DO $$
DECLARE statement text;
BEGIN
  FOREACH statement IN ARRAY ARRAY[
    'CREATE TABLE public.forbidden(id integer)',
    'CREATE TEMP TABLE forbidden(id integer)',
    'ALTER TABLE public.users ADD COLUMN forbidden integer',
    'DROP TABLE public.users CASCADE',
    'TRUNCATE public.users CASCADE',
    'SELECT * FROM public.schema_migrations',
    'ALTER FUNCTION public.bump_token_version() RENAME TO forbidden',
    'SET ROLE "fixture-migration-owner"'
  ] LOOP
    BEGIN
      EXECUTE statement;
      RAISE EXCEPTION 'Unexpected permission: %',statement;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  IF has_table_privilege(current_user,'public.users','SELECT WITH GRANT OPTION') THEN
    RAISE EXCEPTION 'Web role can grant privileges';
  END IF;
END $$;
SQL
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
-- A new migration table receives no implicit public/application access.
SET ROLE "fixture-migration-owner";
CREATE TABLE migration_private_fixture(id integer);
RESET ROLE;
DO $$ BEGIN
  IF has_table_privilege('fixture-web-app','migration_private_fixture','SELECT') THEN
    RAISE EXCEPTION 'Unexpected default privilege';
  END IF;
END $$;
SQL
