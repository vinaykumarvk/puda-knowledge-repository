-- Run this FIRST in Supabase SQL Editor to create all tables from file 8
-- Then run: npx tsx server/scripts/load-file-8-js.ts

CREATE TABLE IF NOT EXISTS public.historical_rfps (
    id integer NOT NULL PRIMARY KEY,
    rfp_name text NOT NULL,
    client_name text,
    client_industry text,
    submission_date date,
    category text NOT NULL,
    requirement text NOT NULL,
    response text NOT NULL,
    success_score integer,
    response_quality text,
    embedding public.vector(1536),
    uploaded_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.excel_requirement_responses (
    id integer NOT NULL PRIMARY KEY,
    rfp_name text,
    requirement_id text,
    uploaded_by text,
    category text NOT NULL,
    requirement text NOT NULL,
    final_response text,
    openai_response text,
    anthropic_response text,
    deepseek_response text,
    moa_response text,
    similar_questions text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    rating integer,
    feedback text,
    model_provider text
);

CREATE TABLE IF NOT EXISTS public.reference_responses (
    id integer NOT NULL PRIMARY KEY,
    response_id integer NOT NULL,
    category text NOT NULL,
    requirement text NOT NULL,
    response text NOT NULL,
    reference text,
    score real NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rfp_responses (
    id integer NOT NULL PRIMARY KEY,
    client_name text NOT NULL,
    client_industry text NOT NULL,
    rfp_title text NOT NULL,
    rfp_id text,
    submission_date date NOT NULL,
    budget_range text,
    project_summary text NOT NULL,
    company_name text NOT NULL,
    point_of_contact text NOT NULL,
    company_strengths text,
    selected_template text NOT NULL,
    customizations text,
    generated_content text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.background_jobs (
    id integer NOT NULL PRIMARY KEY,
    job_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    current_step character varying(50) DEFAULT 'queued'::character varying,
    step_progress integer DEFAULT 0,
    total_steps integer DEFAULT 4,
    current_step_number integer DEFAULT 0,
    document_id integer,
    request_type character varying(50),
    request_id integer,
    priority character varying(10) DEFAULT 'normal'::character varying NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    error_message text,
    result text,
    created_at timestamp without time zone DEFAULT now(),
    started_at timestamp without time zone,
    completed_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS public.cross_document_queries (
    id integer NOT NULL PRIMARY KEY,
    request_type text NOT NULL,
    request_id integer NOT NULL,
    user_id character varying NOT NULL,
    query text NOT NULL,
    response text NOT NULL,
    document_count integer DEFAULT 0 NOT NULL,
    openai_response_id text,
    openai_model text,
    input_tokens integer,
    output_tokens integer,
    total_tokens integer,
    processing_time_ms integer,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deep_mode_jobs (
    id text NOT NULL,
    thread_id integer NOT NULL,
    message_id integer NOT NULL,
    question text NOT NULL,
    response_id text NOT NULL,
    status text NOT NULL,
    raw_response text,
    formatted_result text,
    metadata text,
    error text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.document_queries (
    id integer NOT NULL PRIMARY KEY,
    document_id integer NOT NULL,
    user_id character varying NOT NULL,
    query text NOT NULL,
    response text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sequences (
    id integer NOT NULL PRIMARY KEY,
    sequence_name text NOT NULL,
    current_value integer DEFAULT 0 NOT NULL,
    year integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.web_search_queries (
    id integer NOT NULL PRIMARY KEY,
    request_type text NOT NULL,
    request_id integer NOT NULL,
    user_id character varying NOT NULL,
    query text NOT NULL,
    response text NOT NULL,
    search_type text DEFAULT 'web_search'::text NOT NULL,
    openai_response_id text,
    openai_model text,
    input_tokens integer,
    output_tokens integer,
    total_tokens integer,
    processing_time_ms integer,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.background_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.cross_document_queries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.document_queries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.excel_requirement_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.historical_rfps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.reference_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.rfp_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.sequences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.web_search_queries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.background_jobs_id_seq OWNED BY public.background_jobs.id;

ALTER SEQUENCE public.cross_document_queries_id_seq OWNED BY public.cross_document_queries.id;

ALTER SEQUENCE public.document_queries_id_seq OWNED BY public.document_queries.id;

ALTER SEQUENCE public.excel_requirement_responses_id_seq OWNED BY public.excel_requirement_responses.id;

ALTER SEQUENCE public.historical_rfps_id_seq OWNED BY public.historical_rfps.id;

ALTER SEQUENCE public.reference_responses_id_seq OWNED BY public.reference_responses.id;

ALTER SEQUENCE public.rfp_responses_id_seq OWNED BY public.rfp_responses.id;

ALTER SEQUENCE public.sequences_id_seq OWNED BY public.sequences.id;

ALTER SEQUENCE public.web_search_queries_id_seq OWNED BY public.web_search_queries.id;

