\set ON_ERROR_STOP on
-- Dedicated application database only. Run as administrator after migrations.
-- Required -v app_role=... -v migration_role=...
SELECT set_config('deployment.app_role', :'app_role', false);
SELECT set_config('deployment.migration_role', :'migration_role', false);
DO $$
DECLARE app text := current_setting('deployment.app_role');
        owner text := current_setting('deployment.migration_role');
        item record;
BEGIN
  IF app=owner OR EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname=app) THEN
    RAISE EXCEPTION 'Application and migration roles must be separate with no membership';
  END IF;
  EXECUTE format('ALTER ROLE %I NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',app);
  EXECUTE format('ALTER DATABASE %I OWNER TO %I', current_database(),owner);
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC',current_database());
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM %I',current_database(),app);
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I',current_database(),app);
  EXECUTE format('ALTER SCHEMA public OWNER TO %I',owner);
  REVOKE ALL ON SCHEMA public FROM PUBLIC;
  EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I',app);
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I',app);
  -- Adopt objects in this dedicated database; the web login must own none.
  FOR item IN SELECT c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','S','v') ORDER BY c.relkind='S'
  LOOP
    EXECUTE format('ALTER %s public.%I OWNER TO %I',
      CASE WHEN item.relkind='S' THEN 'SEQUENCE' WHEN item.relkind='v' THEN 'VIEW' ELSE 'TABLE' END,item.relname,owner);
  END LOOP;
  FOR item IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f' AND NOT EXISTS
      (SELECT 1 FROM pg_depend d WHERE d.objid=p.oid AND d.classid='pg_proc'::regclass AND d.deptype='e')
  LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO %I',item.signature,owner);
  END LOOP;
  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I',app);
  EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I',app);
  REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
  FOR item IN SELECT unnest(ARRAY['users','tracks','orders','purchases','play_history','play_stats',
    'design_system','webauthn_credentials','auth_sessions','web_sessions','webauthn_challenges',
    'download_tokens','account_links','track_provenance']) AS name
  LOOP
    IF to_regclass('public.'||item.name) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO %I',item.name,app);
    END IF;
  END LOOP;
  IF to_regclass('public.track_provenance_verlauf') IS NOT NULL THEN
    EXECUTE format('GRANT SELECT,INSERT ON public.track_provenance_verlauf TO %I',app);
  END IF;
  EXECUTE format('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO %I',app);
  -- No blanket grant on future tables; each migration must declare its needs.
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM %I',owner,app);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM %I',current_user,app);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I',owner,app);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I',current_user,app);
END $$;
