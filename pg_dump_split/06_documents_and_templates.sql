CREATE TABLE public.documents (
    id integer NOT NULL,
    file_name text NOT NULL,
    original_name text NOT NULL,
    file_size integer NOT NULL,
    mime_type text NOT NULL,
    file_url text NOT NULL,
    uploader_id character varying,
    request_type text NOT NULL,
    request_id integer NOT NULL,
    category_id integer,
    subcategory_id integer,
    is_auto_categorized boolean DEFAULT false,
    analysis_status text DEFAULT 'pending'::text,
    analysis_result text,
    classification text,
    extracted_text text,
    key_information text,
    risk_level text,
    confidence text,
    created_at timestamp without time zone DEFAULT now(),
    analyzed_at timestamp without time zone
);
CREATE TABLE public.document_categories (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    icon text DEFAULT '📄'::text,
    is_active boolean DEFAULT true,
    is_system boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.document_category_associations (
    id integer NOT NULL,
    document_id integer NOT NULL,
    category_id integer NOT NULL,
    custom_category_name text,
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.templates (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    investment_type text,
    template_data text NOT NULL,
    created_by character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.solution_templates (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    created_by character varying,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.template_sections (
    id integer NOT NULL,
    template_id integer,
    section_type text NOT NULL,
    title text NOT NULL,
    content text,
    order_index integer NOT NULL,
    is_editable boolean DEFAULT true
);
CREATE TABLE public.template_work_items (
    id integer NOT NULL,
    section_id integer,
    title text NOT NULL,
    content text,
    order_index integer NOT NULL,
    is_included boolean DEFAULT true
);
CREATE TABLE public.template_revisions (
    id integer NOT NULL,
    template_id integer,
    version text NOT NULL,
    changed_by character varying,
    change_date timestamp without time zone DEFAULT now(),
    change_description text
);
CREATE SEQUENCE public.document_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.document_categories_id_seq OWNED BY public.document_categories.id;
CREATE SEQUENCE public.document_category_associations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.document_category_associations_id_seq OWNED BY public.document_category_associations.id;
CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;
CREATE SEQUENCE public.solution_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.solution_templates_id_seq OWNED BY public.solution_templates.id;
CREATE SEQUENCE public.template_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.template_revisions_id_seq OWNED BY public.template_revisions.id;
CREATE SEQUENCE public.template_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.template_sections_id_seq OWNED BY public.template_sections.id;
CREATE SEQUENCE public.template_work_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.template_work_items_id_seq OWNED BY public.template_work_items.id;
CREATE SEQUENCE public.templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.templates_id_seq OWNED BY public.templates.id;
COPY public.documents (id, file_name, original_name, file_size, mime_type, file_url, uploader_id, request_type, request_id, category_id, subcategory_id, is_auto_categorized, analysis_status, analysis_result, classification, extracted_text, key_information, risk_level, confidence, created_at, analyzed_at) FROM stdin;
11	1762239877131-47989573-quiz_order_management_google_AI_studio.pdf	quiz order management google AI studio.pdf	178670	application/pdf	uploads/documents/1762239877131-47989573-quiz_order_management_google_AI_studio.pdf	\N	investment	9	\N	\N	f	pending	\N	\N	\N	\N	\N	\N	2025-11-04 07:04:37.859675	\N
12	1762240083156-195044685-Journey_of_Generating_Financial_Proposal_Base_V1.0.pdf	Journey of Generating Financial Proposal_Base_V1.0.pdf	3663715	application/pdf	uploads/documents/1762240083156-195044685-Journey_of_Generating_Financial_Proposal_Base_V1.0.pdf	\N	investment	10	\N	\N	f	pending	\N	\N	\N	\N	\N	\N	2025-11-04 07:08:06.415484	\N
13	1762250139542-222136195-Journey_of_Self_Assessment_and_Supervisor_Assessment_-_RM_Dashboard_Base_V1.0.pdf	Journey of Self Assessment and Supervisor Assessment - RM Dashboard_Base_V1.0.pdf	10918995	application/pdf	uploads/documents/1762250139542-222136195-Journey_of_Self_Assessment_and_Supervisor_Assessment_-_RM_Dashboard_Base_V1.0.pdf	\N	investment	11	\N	\N	f	pending	\N	\N	\N	\N	\N	\N	2025-11-04 09:57:17.518669	\N
14	1762250827123-24188874-Journey_of_Reconciliation_Base_V1.0.pdf	Journey of Reconciliation_Base_V1.0.pdf	2558243	application/pdf	uploads/documents/1762250827123-24188874-Journey_of_Reconciliation_Base_V1.0.pdf	\N	investment	12	\N	\N	f	pending	\N	\N	\N	\N	\N	\N	2025-11-04 10:07:10.00491	\N
15	1762327407412-563295237-Journey_of_Self_Assessment_and_Supervisor_Assessment_-_RM_Dashboard_Base_V1.0.pdf	Journey of Self Assessment and Supervisor Assessment - RM Dashboard_Base_V1.0.pdf	10918995	application/pdf	uploads/documents/1762327407412-563295237-Journey_of_Self_Assessment_and_Supervisor_Assessment_-_RM_Dashboard_Base_V1.0.pdf	\N	investment	13	\N	\N	f	pending	\N	\N	\N	\N	\N	\N	2025-11-05 07:23:30.063785	\N
16	1762329834937-392563696-Journey_of_RM_from_Customer_Meeting_to_Closure_of_Action_Items_Base_V1.0.pdf	Journey of RM from Customer Meeting to Closure of Action Items_Base_V1.0.pdf	7414085	application/pdf	uploads/documents/1762329834937-392563696-Journey_of_RM_from_Customer_Meeting_to_Closure_of_Action_Items_Base_V1.0.pdf	\N	investment	14	\N	\N	f	pending	\N	\N	\N	\N	\N	\N	2025-11-05 08:03:57.368481	\N
\.
COPY public.document_categories (id, name, description, icon, is_active, is_system, created_at) FROM stdin;
1	Financial Statements	Balance sheets, income statements, cash flow	💰	t	t	2025-10-31 10:44:38.287698
2	Legal Documents	Contracts, agreements, compliance	⚖️	t	t	2025-10-31 10:44:38.287698
3	Market Research	Industry analysis, market reports	📊	t	t	2025-10-31 10:44:38.287698
4	Due Diligence	Background checks, risk assessment	🔍	t	t	2025-10-31 10:44:38.287698
5	Other	Miscellaneous documents	📄	t	t	2025-10-31 10:44:38.287698
\.
COPY public.document_category_associations (id, document_id, category_id, custom_category_name, created_at) FROM stdin;
\.
COPY public.templates (id, name, type, investment_type, template_data, created_by, is_active, created_at) FROM stdin;
\.
COPY public.solution_templates (id, title, description, created_by, is_default, created_at, updated_at) FROM stdin;
2	Standard Solution Document	Business Analyst standard format for system change documentation	\N	t	2025-11-04 06:10:29.480609	2025-11-04 06:10:29.480609
\.
COPY public.template_sections (id, template_id, section_type, title, content, order_index, is_editable) FROM stdin;
9	2	heading	Document Header	\N	0	t
10	2	revisionHistory	Revision History	\N	1	t
11	2	tableOfContents	Table of Contents	\N	2	t
12	2	changeRequirement	1. Change Requirement	\N	3	t
13	2	pdaReference	2. PDA Reference Number	\N	4	t
14	2	pfasReference	3. PFAS Document Reference	\N	5	t
15	2	businessImpact	4. Business Impact	\N	6	t
17	2	solution	6. Solution	\N	8	t
18	2	testScenarios	7. Test Scenarios	\N	9	t
16	2	affectedSystems	5. Affected Systems	- RM Office\n- Operations Office\n- Client Portal\n- Revenue Desk\n- Sigma (Reports Module)\n- APIs	7	t
\.
COPY public.template_work_items (id, section_id, title, content, order_index, is_included) FROM stdin;
7	17	Description of Change	\N	0	t
8	17	Logic and Validations	\N	1	t
9	17	UI Changes	\N	2	t
10	17	Batch Processing	\N	3	t
11	17	API Changes	\N	4	t
12	17	Field-Level Changes	\N	5	t
\.
COPY public.template_revisions (id, template_id, version, changed_by, change_date, change_description) FROM stdin;
\.
