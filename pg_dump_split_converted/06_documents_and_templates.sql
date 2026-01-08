CREATE TABLE IF NOT EXISTS public.documents (
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
CREATE TABLE IF NOT EXISTS public.document_categories (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    icon text DEFAULT '📄'::text,
    is_active boolean DEFAULT true,
    is_system boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.document_category_associations (
    id integer NOT NULL,
    document_id integer NOT NULL,
    category_id integer NOT NULL,
    custom_category_name text,
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.templates (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    investment_type text,
    template_data text NOT NULL,
    created_by character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.solution_templates (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    created_by character varying,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
-- Fix schema mismatches: Drop table if id column type is wrong (BEFORE CREATE TABLE)
DO $$ 
BEGIN
    -- If template_sections table exists with uuid id (wrong type), drop it to recreate with correct schema
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' 
        AND table_name='template_sections' 
        AND column_name='id' 
        AND data_type='uuid'
    ) THEN
        DROP TABLE IF EXISTS public.template_sections CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.template_sections (
    id integer NOT NULL,
    template_id integer,
    section_type text NOT NULL,
    title text NOT NULL,
    content text,
    order_index integer NOT NULL,
    is_editable boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.template_work_items (
    id integer NOT NULL,
    section_id integer,
    title text NOT NULL,
    content text,
    order_index integer NOT NULL,
    is_included boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.template_revisions (
    id integer NOT NULL,
    template_id integer,
    version text NOT NULL,
    changed_by character varying,
    change_date timestamp without time zone DEFAULT now(),
    change_description text
);
CREATE SEQUENCE IF NOT EXISTS public.document_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.document_categories_id_seq OWNED BY public.document_categories.id;
CREATE SEQUENCE IF NOT EXISTS public.document_category_associations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.document_category_associations_id_seq OWNED BY public.document_category_associations.id;
CREATE SEQUENCE IF NOT EXISTS public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;
CREATE SEQUENCE IF NOT EXISTS public.solution_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.solution_templates_id_seq OWNED BY public.solution_templates.id;
CREATE SEQUENCE IF NOT EXISTS public.template_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.template_revisions_id_seq OWNED BY public.template_revisions.id;
CREATE SEQUENCE IF NOT EXISTS public.template_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.template_sections_id_seq OWNED BY public.template_sections.id;
CREATE SEQUENCE IF NOT EXISTS public.template_work_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.template_work_items_id_seq OWNED BY public.template_work_items.id;
CREATE SEQUENCE IF NOT EXISTS public.templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.templates_id_seq OWNED BY public.templates.id;

-- Add missing columns if they don't exist (for tables created in previous runs)
DO $$ 
BEGIN
    -- Only run if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='template_sections') THEN
        -- Add section_type column to template_sections if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema='public' AND table_name='template_sections' AND column_name='section_type') THEN
            ALTER TABLE public.template_sections ADD COLUMN section_type text;
            UPDATE public.template_sections SET section_type = 'heading' WHERE section_type IS NULL;
            ALTER TABLE public.template_sections ALTER COLUMN section_type SET NOT NULL;
        END IF;
        
        -- Add content column to template_sections if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema='public' AND table_name='template_sections' AND column_name='content') THEN
            ALTER TABLE public.template_sections ADD COLUMN content text;
        END IF;
        
        -- Add order_index column to template_sections if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema='public' AND table_name='template_sections' AND column_name='order_index') THEN
            ALTER TABLE public.template_sections ADD COLUMN order_index integer;
            UPDATE public.template_sections SET order_index = 0 WHERE order_index IS NULL;
            ALTER TABLE public.template_sections ALTER COLUMN order_index SET NOT NULL;
        END IF;
        
        -- Add is_editable column to template_sections if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema='public' AND table_name='template_sections' AND column_name='is_editable') THEN
            ALTER TABLE public.template_sections ADD COLUMN is_editable boolean DEFAULT true;
        END IF;
    END IF;
END $$;

INSERT INTO public.documents (id, file_name, original_name, file_size, mime_type, file_url, uploader_id, request_type, request_id, category_id, subcategory_id, is_auto_categorized, analysis_status, analysis_result, classification, extracted_text, key_information, risk_level, confidence, created_at, analyzed_at) VALUES
('11', '1762239877131-47989573-quiz_order_management_google_AI_studio.pdf', 'quiz order management google AI studio.pdf', '178670', 'application/pdf', 'uploads/documents/1762239877131-47989573-quiz_order_management_google_AI_studio.pdf', NULL, 'investment', '9', NULL, NULL, false, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-04 07:04:37.859675', NULL),
('12', '1762240083156-195044685-Journey_of_Generating_Financial_Proposal_Base_V1.0.pdf', 'Journey of Generating Financial Proposal_Base_V1.0.pdf', '3663715', 'application/pdf', 'uploads/documents/1762240083156-195044685-Journey_of_Generating_Financial_Proposal_Base_V1.0.pdf', NULL, 'investment', '10', NULL, NULL, false, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-04 07:08:06.415484', NULL),
('13', '1762250139542-222136195-Journey_of_Self_Assessment_and_Supervisor_Assessment_-_RM_Dashboard_Base_V1.0.pdf', 'Journey of Self Assessment and Supervisor Assessment - RM Dashboard_Base_V1.0.pdf', '10918995', 'application/pdf', 'uploads/documents/1762250139542-222136195-Journey_of_Self_Assessment_and_Supervisor_Assessment_-_RM_Dashboard_Base_V1.0.pdf', NULL, 'investment', '11', NULL, NULL, false, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-04 09:57:17.518669', NULL),
('14', '1762250827123-24188874-Journey_of_Reconciliation_Base_V1.0.pdf', 'Journey of Reconciliation_Base_V1.0.pdf', '2558243', 'application/pdf', 'uploads/documents/1762250827123-24188874-Journey_of_Reconciliation_Base_V1.0.pdf', NULL, 'investment', '12', NULL, NULL, false, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-04 10:07:10.00491', NULL),
('15', '1762327407412-563295237-Journey_of_Self_Assessment_and_Supervisor_Assessment_-_RM_Dashboard_Base_V1.0.pdf', 'Journey of Self Assessment and Supervisor Assessment - RM Dashboard_Base_V1.0.pdf', '10918995', 'application/pdf', 'uploads/documents/1762327407412-563295237-Journey_of_Self_Assessment_and_Supervisor_Assessment_-_RM_Dashboard_Base_V1.0.pdf', NULL, 'investment', '13', NULL, NULL, false, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-05 07:23:30.063785', NULL),
('16', '1762329834937-392563696-Journey_of_RM_from_Customer_Meeting_to_Closure_of_Action_Items_Base_V1.0.pdf', 'Journey of RM from Customer Meeting to Closure of Action Items_Base_V1.0.pdf', '7414085', 'application/pdf', 'uploads/documents/1762329834937-392563696-Journey_of_RM_from_Customer_Meeting_to_Closure_of_Action_Items_Base_V1.0.pdf', NULL, 'investment', '14', NULL, NULL, false, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-05 08:03:57.368481', NULL);

INSERT INTO public.document_categories (id, name, description, icon, is_active, is_system, created_at) VALUES
('1', 'Financial Statements', 'Balance sheets, income statements, cash flow', '💰', true, true, '2025-10-31 10:44:38.287698'),
('2', 'Legal Documents', 'Contracts, agreements, compliance', '⚖️', true, true, '2025-10-31 10:44:38.287698'),
('3', 'Market Research', 'Industry analysis, market reports', '📊', true, true, '2025-10-31 10:44:38.287698'),
('4', 'Due Diligence', 'Background checks, risk assessment', '🔍', true, true, '2025-10-31 10:44:38.287698'),
('5', 'Other', 'Miscellaneous documents', '📄', true, true, '2025-10-31 10:44:38.287698');

INSERT INTO public.solution_templates (id, title, description, created_by, is_default, created_at, updated_at) VALUES
('2', 'Standard Solution Document', 'Business Analyst standard format for system change documentation', NULL, true, '2025-11-04 06:10:29.480609', '2025-11-04 06:10:29.480609');

INSERT INTO public.template_sections (id, template_id, section_type, title, content, order_index, is_editable) VALUES
('9', '2', 'heading', 'Document Header', NULL, '0', true),
('10', '2', 'revisionHistory', 'Revision History', NULL, '1', true),
('11', '2', 'tableOfContents', 'Table of Contents', NULL, '2', true),
('12', '2', 'changeRequirement', '1. Change Requirement', NULL, '3', true),
('13', '2', 'pdaReference', '2. PDA Reference Number', NULL, '4', true),
('14', '2', 'pfasReference', '3. PFAS Document Reference', NULL, '5', true),
('15', '2', 'businessImpact', '4. Business Impact', NULL, '6', true),
('17', '2', 'solution', '6. Solution', NULL, '8', true),
('18', '2', 'testScenarios', '7. Test Scenarios', NULL, '9', true),
('16', '2', 'affectedSystems', '5. Affected Systems', '- RM Office\n- Operations Office\n- Client Portal\n- Revenue Desk\n- Sigma (Reports Module)\n- APIs', '7', true);

INSERT INTO public.template_work_items (id, section_id, title, content, order_index, is_included) VALUES
('7', '17', 'Description of Change', NULL, '0', true),
('8', '17', 'Logic and Validations', NULL, '1', true),
('9', '17', 'UI Changes', NULL, '2', true),
('10', '17', 'Batch Processing', NULL, '3', true),
('11', '17', 'API Changes', NULL, '4', true),
('12', '17', 'Field-Level Changes', NULL, '5', true);

