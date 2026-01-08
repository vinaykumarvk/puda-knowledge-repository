-- Run this FIRST in Supabase SQL Editor to create the table
-- Then run: npx tsx server/scripts/load-file-7-js.ts

CREATE TABLE IF NOT EXISTS public.response_cache (
    id integer NOT NULL PRIMARY KEY,
    question text NOT NULL,
    question_embedding public.vector(1536),
    mode text NOT NULL,
    response text NOT NULL,
    raw_response text,
    metadata text,
    response_id text,
    is_deep_mode boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_accessed_at timestamp without time zone DEFAULT now() NOT NULL,
    access_count integer DEFAULT 1 NOT NULL,
    is_refreshed boolean DEFAULT false,
    original_cache_id integer
);

CREATE SEQUENCE IF NOT EXISTS public.response_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.response_cache_id_seq OWNED BY public.response_cache.id;
