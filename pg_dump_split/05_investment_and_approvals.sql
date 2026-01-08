CREATE TABLE public.investment_requests (
    id integer NOT NULL,
    request_id text NOT NULL,
    requester_id character varying,
    target_company text NOT NULL,
    investment_type text NOT NULL,
    description text,
    enhanced_description text,
    status text DEFAULT 'draft'::text NOT NULL,
    current_approval_stage integer DEFAULT 0,
    sla_deadline timestamp without time zone,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    current_approval_cycle integer DEFAULT 1 NOT NULL,
    report_code text,
    report_title text,
    report_date text,
    created_by text
);
CREATE TABLE public.approvals (
    id integer NOT NULL,
    request_type text NOT NULL,
    request_id integer NOT NULL,
    stage integer NOT NULL,
    approver_id character varying,
    status text NOT NULL,
    comments text,
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    approval_cycle integer DEFAULT 1 NOT NULL,
    is_current_cycle boolean DEFAULT true NOT NULL,
    rejection_reason text,
    edit_history text
);
CREATE TABLE public.tasks (
    id integer NOT NULL,
    assignee_id character varying,
    request_type text NOT NULL,
    request_id integer NOT NULL,
    task_type text NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text DEFAULT 'medium'::text,
    due_date timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id character varying,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    is_read boolean DEFAULT false,
    related_type text,
    related_id integer,
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.investment_rationales (
    id integer NOT NULL,
    investment_id integer NOT NULL,
    content text NOT NULL,
    type text NOT NULL,
    template_id integer,
    author_id character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
CREATE SEQUENCE public.approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.approvals_id_seq OWNED BY public.approvals.id;
CREATE SEQUENCE public.investment_rationales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.investment_rationales_id_seq OWNED BY public.investment_rationales.id;
CREATE SEQUENCE public.investment_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.investment_requests_id_seq OWNED BY public.investment_requests.id;
CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;
CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;
COPY public.investment_requests (id, request_id, requester_id, target_company, investment_type, description, enhanced_description, status, current_approval_stage, sla_deadline, deleted_at, created_at, updated_at, current_approval_cycle, report_code, report_title, report_date, created_by) FROM stdin;
10	INV-2025-005	\N	Tata Motors	base_document	shailabh test	\N	draft	0	\N	\N	2025-11-04 07:08:02.756591	2025-11-04 07:08:02.756591	1	RPT-2025-005	\N	\N	\N
6	INV-2025-001	\N	Tata Motors	base_document	test 	\N	draft	0	\N	2025-11-04 07:13:32.508	2025-11-04 06:29:13.067939	2025-11-04 06:29:13.067939	1	RPT-2025-001	\N	\N	\N
7	INV-2025-002	\N	Tata Motors	base_document	test	\N	draft	0	\N	2025-11-04 07:13:34.561	2025-11-04 06:29:55.470486	2025-11-04 06:29:55.470486	1	RPT-2025-002	\N	\N	\N
8	INV-2025-003	\N		base_document	yusjhgc	\N	draft	0	\N	2025-11-04 07:13:35.999	2025-11-04 07:00:30.617138	2025-11-04 07:00:30.617138	1	RPT-2025-003	\N	\N	\N
9	INV-2025-004	\N	Tata Motors	base_document	/lbg	\N	draft	0	\N	2025-11-04 07:13:56.622	2025-11-04 07:04:36.83961	2025-11-04 07:04:36.83961	1	RPT-2025-004	\N	\N	\N
11	INV-2025-006	\N	Tata Motors	base_document	jhckgj	\N	draft	0	\N	\N	2025-11-04 09:43:39.254479	2025-11-04 09:43:39.254479	1	RPT-2025-006	ABC_BaseDoc_Test	2025-11-04	Shailabh
12	INV-2025-007	\N	Tata Motors	base_document	,kjajsbc	\N	draft	0	\N	\N	2025-11-04 10:07:06.550989	2025-11-04 10:07:06.550989	1	RPT-2025-007	ABC_BaseDoc_Test	2025-11-04	Shailabh
13	INV-2025-008	\N	ABC group	base_document	testing the approval	\N	draft	0	\N	\N	2025-11-05 07:23:27.109997	2025-11-05 07:23:27.109997	1	RPT-2025-008	ABC_BaseDoc_Test	2025-11-05	Shailabh
14	INV-2025-009	\N	ABC group	base_document	test	\N	draft	0	\N	\N	2025-11-05 08:03:54.644424	2025-11-05 08:03:54.644424	1	RPT-2025-009	ABC_BaseDoc_Test	2025-11-05	ba-001
\.
COPY public.approvals (id, request_type, request_id, stage, approver_id, status, comments, approved_at, created_at, approval_cycle, is_current_cycle, rejection_reason, edit_history) FROM stdin;
\.
COPY public.tasks (id, assignee_id, request_type, request_id, task_type, title, description, status, priority, due_date, completed_at, created_at) FROM stdin;
\.
COPY public.notifications (id, user_id, title, message, type, is_read, related_type, related_id, created_at) FROM stdin;
\.
COPY public.investment_rationales (id, investment_id, content, type, template_id, author_id, created_at, updated_at) FROM stdin;
\.
