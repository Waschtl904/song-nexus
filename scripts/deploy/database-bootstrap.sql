\set ON_ERROR_STOP on
-- Run with psql as cluster administrator; values are quoted as identifiers.
-- Required -v database=... -v app_role=... -v migration_role=...
SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', :'migration_role')
WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=:'migration_role') \gexec
SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', :'app_role')
WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=:'app_role') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'database', :'migration_role')
WHERE NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=:'database') \gexec
-- Passwords are deliberately not passed via command-line arguments or stored here.
-- Assign newly created LOGIN credentials interactively with psql \password.
