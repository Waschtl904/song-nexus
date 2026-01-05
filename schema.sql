-- ============================================================================
-- 📊 DATABASE SCHEMA FOR SONG-NEXUS v1.0
-- ============================================================================
-- PostgreSQL database dump
-- Dumped from database version 18.1
-- Schema includes 10 tables with 22 indexes and comprehensive constraints
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';
SET default_table_access_method = heap;

-- ============================================================================
-- TABLE: design_system (Design tokens and theming - 27 columns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.design_system (
    id integer NOT NULL,
    color_primary character varying(7),
    color_secondary character varying(7),
    color_accent_teal character varying(7),
    color_accent_green character varying(7),
    color_accent_red character varying(7),
    color_text_primary character varying(7),
    color_background character varying(7),
    background_image_url character varying(500),
    logo_url character varying(500),
    hero_image_url character varying(500),
    font_family_base character varying(100),
    font_size_base integer,
    font_weight_normal integer,
    font_weight_bold integer,
    spacing_unit integer,
    border_radius integer,
    button_background_color character varying(7),
    button_text_color character varying(7),
    button_border_radius integer,
    button_padding character varying(20),
    player_background_image_url character varying(500),
    player_button_color character varying(7),
    player_button_size integer,
    is_active boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(100)
);

ALTER TABLE public.design_system OWNER TO postgres;

CREATE SEQUENCE IF NOT EXISTS public.design_system_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.design_system_id_seq OWNER TO postgres;
ALTER SEQUENCE public.design_system_id_seq OWNED BY public.design_system.id;

-- ============================================================================
-- TABLE: magic_link_tokens (Magic link authentication tokens)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.magic_link_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public.magic_link_tokens OWNER TO postgres;

CREATE SEQUENCE IF NOT EXISTS public.magic_link_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.magic_link_tokens_id_seq OWNER TO postgres;
ALTER SEQUENCE public.magic_link_tokens_id_seq OWNED BY public.magic_link_tokens.id;

-- ============================================================================
-- TABLE: magic_links (Email-based authentication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.magic_links (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    ip_address inet,
    user_agent character varying(500) DEFAULT NULL::character varying,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.magic_links OWNER TO postgres;

CREATE SEQUENCE IF NOT EXISTS public.magic_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.magic_links_id_seq OWNER TO postgres;
ALTER SEQUENCE public.magic_links_id_seq OWNED BY public.magic_links.id;

-- ============================================================================
-- TABLE: orders (PayPal transaction records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id integer NOT NULL,
    user_id integer NOT NULL,
    paypal_order_id character varying(255) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'EUR'::character varying,
    description text,
    status character varying(20) DEFAULT 'CREATED'::character varying,
    paypal_payer_email character varying(255),
    transaction_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['CREATED'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'PENDING'::character varying])::text[])))
);

ALTER TABLE public.orders OWNER TO postgres;

CREATE SEQUENCE IF NOT EXISTS public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;
ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;

-- ============================================================================
-- TABLE: play_history (Track play event tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.play_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    track_id integer NOT NULL,
    played_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    duration_played_seconds integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.play_history OWNER TO song_nexus_user;

CREATE SEQUENCE IF NOT EXISTS public.play_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.play_history_id_seq OWNER TO song_nexus_user;
ALTER SEQUENCE public.play_history_id_seq OWNED BY public.play_history.id;

-- ============================================================================
-- TABLE: play_stats (Advanced player analytics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.play_stats (
    id integer NOT NULL,
    user_id integer NOT NULL,
    track_id integer NOT NULL,
    duration_played_seconds integer DEFAULT 0,
    session_id character varying(255),
    device_type character varying(50) DEFAULT 'web'::character varying,
    is_paid_user boolean DEFAULT false,
    played_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.play_stats OWNER TO postgres;

CREATE SEQUENCE IF NOT EXISTS public.play_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.play_stats_id_seq OWNER TO postgres;
ALTER SEQUENCE public.play_stats_id_seq OWNED BY public.play_stats.id;

-- ============================================================================
-- TABLE: purchases (User track purchases with license types)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.purchases (
    id integer NOT NULL,
    user_id integer NOT NULL,
    track_id integer NOT NULL,
    order_id integer,
    license_type character varying(50) DEFAULT 'personal'::character varying,
    purchased_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    CONSTRAINT purchases_license_type_check CHECK (((license_type)::text = ANY ((ARRAY['personal'::character varying, 'commercial'::character varying, 'streaming'::character varying])::text[])))
);

ALTER TABLE public.purchases OWNER TO postgres;

CREATE SEQUENCE IF NOT EXISTS public.purchases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.purchases_id_seq OWNER TO postgres;
ALTER SEQUENCE public.purchases_id_seq OWNED BY public.purchases.id;

-- ============================================================================
-- TABLE: tracks (Music metadata with soft delete)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tracks (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    artist character varying(100) NOT NULL,
    genre character varying(50),
    description text,
    audio_filename character varying(255) NOT NULL,
    price_eur numeric(10,2) DEFAULT 0.99,
    duration_seconds integer,
    file_size_bytes bigint,
    play_count integer DEFAULT 0,
    is_published boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_free boolean DEFAULT false,
    price numeric(10,2) DEFAULT 0.99,
    free_preview_duration integer DEFAULT 40,
    duration integer DEFAULT 0,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone
);

ALTER TABLE public.tracks OWNER TO postgres;

CREATE SEQUENCE IF NOT EXISTS public.tracks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.tracks_id_seq OWNER TO postgres;
ALTER SEQUENCE public.tracks_id_seq OWNED BY public.tracks.id;

-- ============================================================================
-- TABLE: users (User accounts with WebAuthn support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    webauthn_credential jsonb,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[])))
);

ALTER TABLE public.users OWNER TO postgres;

CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNER TO postgres;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

-- ============================================================================
-- TABLE: webauthn_credentials (Biometric authentication data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
    id integer NOT NULL,
    user_id integer NOT NULL,
    credential_id character varying(255) NOT NULL,
    public_key bytea NOT NULL,
    counter integer DEFAULT 0,
    transports text[],
    created_at timestamp without time zone DEFAULT now(),
    last_used timestamp without time zone
);

ALTER TABLE public.webauthn_credentials OWNER TO postgres;

CREATE SEQUENCE IF NOT EXISTS public.webauthn_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.webauthn_credentials_id_seq OWNER TO postgres;
ALTER SEQUENCE public.webauthn_credentials_id_seq OWNED BY public.webauthn_credentials.id;

-- ============================================================================
-- SET COLUMN DEFAULTS
-- ============================================================================
ALTER TABLE ONLY public.design_system ALTER COLUMN id SET DEFAULT nextval('public.design_system_id_seq'::regclass);
ALTER TABLE ONLY public.magic_link_tokens ALTER COLUMN id SET DEFAULT nextval('public.magic_link_tokens_id_seq'::regclass);
ALTER TABLE ONLY public.magic_links ALTER COLUMN id SET DEFAULT nextval('public.magic_links_id_seq'::regclass);
ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);
ALTER TABLE ONLY public.play_history ALTER COLUMN id SET DEFAULT nextval('public.play_history_id_seq'::regclass);
ALTER TABLE ONLY public.play_stats ALTER COLUMN id SET DEFAULT nextval('public.play_stats_id_seq'::regclass);
ALTER TABLE ONLY public.purchases ALTER COLUMN id SET DEFAULT nextval('public.purchases_id_seq'::regclass);
ALTER TABLE ONLY public.tracks ALTER COLUMN id SET DEFAULT nextval('public.tracks_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY public.webauthn_credentials ALTER COLUMN id SET DEFAULT nextval('public.webauthn_credentials_id_seq'::regclass);

-- ============================================================================
-- PRIMARY KEY CONSTRAINTS
-- ============================================================================
ALTER TABLE ONLY public.design_system ADD CONSTRAINT design_system_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.magic_link_tokens ADD CONSTRAINT magic_link_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.magic_links ADD CONSTRAINT magic_links_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.play_history ADD CONSTRAINT play_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.play_stats ADD CONSTRAINT play_stats_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tracks ADD CONSTRAINT tracks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.webauthn_credentials ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================
ALTER TABLE ONLY public.magic_link_tokens ADD CONSTRAINT magic_link_tokens_token_key UNIQUE (token);
ALTER TABLE ONLY public.magic_links ADD CONSTRAINT magic_links_token_key UNIQUE (token);
ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_paypal_order_id_key UNIQUE (paypal_order_id);
ALTER TABLE ONLY public.play_history ADD CONSTRAINT play_history_user_id_track_id_played_at_key UNIQUE (user_id, track_id, played_at);
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_user_id_track_id_key UNIQUE (user_id, track_id);
ALTER TABLE ONLY public.tracks ADD CONSTRAINT tracks_audio_filename_key UNIQUE (audio_filename);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_username_key UNIQUE (username);
ALTER TABLE ONLY public.webauthn_credentials ADD CONSTRAINT webauthn_credentials_credential_id_key UNIQUE (credential_id);

-- ============================================================================
-- INDEXES (22 total for performance optimization)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_magic_link_expires ON public.magic_link_tokens USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_magic_link_user ON public.magic_link_tokens USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON public.magic_links USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON public.magic_links USING btree (token);
CREATE INDEX IF NOT EXISTS idx_magic_links_used_at ON public.magic_links USING btree (used_at) WHERE (used_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_magic_links_user_id ON public.magic_links USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON public.play_history USING btree (played_at);
CREATE INDEX IF NOT EXISTS idx_play_history_track_id ON public.play_history USING btree (track_id);
CREATE INDEX IF NOT EXISTS idx_play_history_user_id ON public.play_history USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_play_stats_track_id ON public.play_stats USING btree (track_id);
CREATE INDEX IF NOT EXISTS idx_play_stats_user_id ON public.play_stats USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_audio_filename ON public.tracks USING btree (audio_filename) WHERE (is_deleted = false);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON public.tracks USING btree (genre);
CREATE INDEX IF NOT EXISTS idx_tracks_is_deleted ON public.tracks USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX IF NOT EXISTS idx_tracks_published_created ON public.tracks USING btree (is_published DESC, created_at DESC) INCLUDE (id, name, artist, genre, description, price_eur, duration_seconds, play_count, audio_filename, is_free, free_preview_duration);
CREATE INDEX IF NOT EXISTS idx_tracks_published_created_optimized ON public.tracks USING btree (is_published, is_deleted, created_at DESC) WHERE ((is_published = true) AND (is_deleted = false));
CREATE INDEX IF NOT EXISTS idx_tracks_published_deleted_created ON public.tracks USING btree (is_published, is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_id ON public.webauthn_credentials USING btree (credential_id);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================
ALTER TABLE ONLY public.magic_link_tokens ADD CONSTRAINT magic_link_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.magic_links ADD CONSTRAINT magic_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.play_history ADD CONSTRAINT play_history_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.play_history ADD CONSTRAINT play_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.play_stats ADD CONSTRAINT play_stats_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.play_stats ADD CONSTRAINT play_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.webauthn_credentials ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================================================
-- ACCESS CONTROL (Permissions for song_nexus_user role)
-- ============================================================================
REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;
GRANT ALL ON SCHEMA public TO song_nexus_user;

GRANT ALL ON TABLE public.design_system TO song_nexus_user;
GRANT ALL ON SEQUENCE public.design_system_id_seq TO song_nexus_user;

GRANT ALL ON TABLE public.magic_link_tokens TO song_nexus_user;
GRANT SELECT,USAGE ON SEQUENCE public.magic_link_tokens_id_seq TO song_nexus_user;

GRANT ALL ON TABLE public.magic_links TO song_nexus_user;
GRANT ALL ON SEQUENCE public.magic_links_id_seq TO song_nexus_user;

GRANT ALL ON TABLE public.orders TO song_nexus_user;
GRANT ALL ON SEQUENCE public.orders_id_seq TO song_nexus_user;

GRANT ALL ON TABLE public.play_history TO postgres;
GRANT ALL ON SEQUENCE public.play_history_id_seq TO postgres;

GRANT ALL ON TABLE public.play_stats TO song_nexus_user;
GRANT ALL ON SEQUENCE public.play_stats_id_seq TO song_nexus_user;

GRANT ALL ON TABLE public.purchases TO song_nexus_user;
GRANT ALL ON SEQUENCE public.purchases_id_seq TO song_nexus_user;

GRANT ALL ON TABLE public.tracks TO song_nexus_user;
GRANT ALL ON SEQUENCE public.tracks_id_seq TO song_nexus_user;

GRANT ALL ON TABLE public.users TO song_nexus_user;
GRANT ALL ON SEQUENCE public.users_id_seq TO song_nexus_user;

GRANT ALL ON TABLE public.webauthn_credentials TO song_nexus_user;
GRANT ALL ON SEQUENCE public.webauthn_credentials_id_seq TO song_nexus_user;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO song_nexus_user;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO song_nexus_user;

-- ============================================================================
-- PostgreSQL database dump complete
-- ============================================================================
