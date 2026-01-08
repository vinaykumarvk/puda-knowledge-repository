CREATE TABLE IF NOT EXISTS public.investment_requests (
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
CREATE TABLE IF NOT EXISTS public.approvals (
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
CREATE TABLE IF NOT EXISTS public.tasks (
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
CREATE TABLE IF NOT EXISTS public.notifications (
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
CREATE TABLE IF NOT EXISTS public.investment_rationales (
    id integer NOT NULL,
    investment_id integer NOT NULL,
    content text NOT NULL,
    type text NOT NULL,
    template_id integer,
    author_id character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.approvals_id_seq OWNED BY public.approvals.id;
CREATE SEQUENCE IF NOT EXISTS public.investment_rationales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.investment_rationales_id_seq OWNED BY public.investment_rationales.id;
CREATE SEQUENCE IF NOT EXISTS public.investment_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.investment_requests_id_seq OWNED BY public.investment_requests.id;
CREATE SEQUENCE IF NOT EXISTS public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;
CREATE SEQUENCE IF NOT EXISTS public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;
INSERT INTO public.investment_requests (id, request_id, requester_id, target_company, investment_type, description, enhanced_description, status, current_approval_stage, sla_deadline, deleted_at, created_at, updated_at, current_approval_cycle, report_code, report_title, report_date, created_by) VALUES
('10', 'INV-2025-005', NULL, 'Tata Motors', 'base_document', 'shailabh test', NULL, 'draft', '0', NULL, NULL, '2025-11-04 07:08:02.756591', '2025-11-04 07:08:02.756591', '1', 'RPT-2025-005', NULL, NULL, NULL),
('6', 'INV-2025-001', NULL, 'Tata Motors', 'base_document', 'test ', NULL, 'draft', '0', NULL, '2025-11-04 07:13:32.508', '2025-11-04 06:29:13.067939', '2025-11-04 06:29:13.067939', '1', 'RPT-2025-001', NULL, NULL, NULL),
('7', 'INV-2025-002', NULL, 'Tata Motors', 'base_document', 'test', NULL, 'draft', '0', NULL, '2025-11-04 07:13:34.561', '2025-11-04 06:29:55.470486', '2025-11-04 06:29:55.470486', '1', 'RPT-2025-002', NULL, NULL, NULL),
('8', 'INV-2025-003', NULL, '', 'base_document', 'yusjhgc', NULL, 'draft', '0', NULL, '2025-11-04 07:13:35.999', '2025-11-04 07:00:30.617138', '2025-11-04 07:00:30.617138', '1', 'RPT-2025-003', NULL, NULL, NULL),
('9', 'INV-2025-004', NULL, 'Tata Motors', 'base_document', '/lbg', NULL, 'draft', '0', NULL, '2025-11-04 07:13:56.622', '2025-11-04 07:04:36.83961', '2025-11-04 07:04:36.83961', '1', 'RPT-2025-004', NULL, NULL, NULL),
('11', 'INV-2025-006', NULL, 'Tata Motors', 'base_document', 'jhckgj', NULL, 'draft', '0', NULL, NULL, '2025-11-04 09:43:39.254479', '2025-11-04 09:43:39.254479', '1', 'RPT-2025-006', 'ABC_BaseDoc_Test', '2025-11-04', 'Shailabh'),
('12', 'INV-2025-007', NULL, 'Tata Motors', 'base_document', ',kjajsbc', NULL, 'draft', '0', NULL, NULL, '2025-11-04 10:07:06.550989', '2025-11-04 10:07:06.550989', '1', 'RPT-2025-007', 'ABC_BaseDoc_Test', '2025-11-04', 'Shailabh'),
('13', 'INV-2025-008', NULL, 'ABC group', 'base_document', 'testing the approval', NULL, 'draft', '0', NULL, NULL, '2025-11-05 07:23:27.109997', '2025-11-05 07:23:27.109997', '1', 'RPT-2025-008', 'ABC_BaseDoc_Test', '2025-11-05', 'Shailabh'),
('14', 'INV-2025-009', NULL, 'ABC group', 'base_document', 'test', NULL, 'draft', '0', NULL, NULL, '2025-11-05 08:03:54.644424', '2025-11-05 08:03:54.644424', '1', 'RPT-2025-009', 'ABC_BaseDoc_Test', '2025-11-05', 'ba-001');

