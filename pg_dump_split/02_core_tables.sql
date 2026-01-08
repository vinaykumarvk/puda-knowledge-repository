CREATE TABLE public.users (
    id character varying NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    full_name text NOT NULL,
    team text NOT NULL,
    email text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_login timestamp without time zone,
    manager_id character varying
);
CREATE TABLE public.sessions (
    id text NOT NULL,
    user_id text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.threads (
    id integer NOT NULL,
    title text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    conversation_id text
);
CREATE TABLE public.conversations (
    id integer NOT NULL,
    question text NOT NULL,
    mode text NOT NULL,
    use_cache boolean DEFAULT true NOT NULL,
    response text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;
CREATE SEQUENCE public.threads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.threads_id_seq OWNED BY public.threads.id;
COPY public.users (id, username, password, full_name, team, email, is_active, created_at, last_login, manager_id) FROM stdin;
m1-001	M1	$2b$10$HiYlYTu.Hepg7hYzyue9R.AUoA3KVmiikZ2VD8gtFsxDhO2B110Se	Manager One	Manager	m1@wealthforce.com	t	2025-11-05 06:47:15.374856	\N	\N
m2-001	M2	$2b$10$HiYlYTu.Hepg7hYzyue9R.AUoA3KVmiikZ2VD8gtFsxDhO2B110Se	Manager Two	Manager	m2@wealthforce.com	t	2025-11-05 06:47:15.374856	\N	\N
ba-002	sarah_ba	$2b$10$HiYlYTu.Hepg7hYzyue9R.AUoA3KVmiikZ2VD8gtFsxDhO2B110Se	Sarah Johnson	Business Analyst	sarah.johnson@wealthforce.com	t	2025-11-05 06:47:15.374856	\N	m1-001
ps-001	mike_presales	$2b$10$HiYlYTu.Hepg7hYzyue9R.AUoA3KVmiikZ2VD8gtFsxDhO2B110Se	Mike Davis	Pre-sales	mike.davis@wealthforce.com	t	2025-11-05 06:47:15.374856	\N	m2-001
ps-002	emma_presales	$2b$10$HiYlYTu.Hepg7hYzyue9R.AUoA3KVmiikZ2VD8gtFsxDhO2B110Se	Emma Wilson	Pre-sales	emma.wilson@wealthforce.com	t	2025-11-05 06:47:15.374856	\N	m2-001
ba-001	john_ba	$2b$10$HiYlYTu.Hepg7hYzyue9R.AUoA3KVmiikZ2VD8gtFsxDhO2B110Se	John Smith	Business Analyst	john.smith@wealthforce.com	t	2025-11-05 06:47:15.374856	2025-12-13 11:00:42.046	m1-001
\.
COPY public.sessions (id, user_id, expires_at, created_at) FROM stdin;
6fd06581-0ac6-405a-8028-095974eea229	ba-001	2025-11-06 08:03:18.555	2025-11-05 08:03:18.573849
96f204a0-4ceb-4e9a-a194-24c42a9ff3a1	ba-001	2025-12-14 09:57:29.727	2025-12-13 09:57:29.88575
0a7f3ce4-7307-4fac-b107-9da1fb469d3e	ba-001	2025-12-14 10:16:35.758	2025-12-13 10:16:35.895982
941bdaf3-b721-4bac-bc23-6d87c4b4e497	ba-001	2025-12-14 10:47:33.871	2025-12-13 10:47:34.018819
1203b430-ba95-40f4-bf40-2b38cb36e190	ba-001	2025-12-14 10:58:02.602	2025-12-13 10:58:02.745632
c3d91dd1-bf22-4004-aaac-27b55c6ad2c2	ba-001	2025-12-14 11:00:41.812	2025-12-13 11:00:41.948231
\.
COPY public.threads (id, title, created_at, updated_at, conversation_id) FROM stdin;
71	Why is risk profiling important?	2025-12-13 19:35:11.698048	2025-12-13 19:36:24.576	\N
70	Write a company research report on Reliance industries for m...	2025-12-13 19:33:47.883172	2025-12-13 19:41:52.743	\N
72	What kind of analytics is available to evalute RM's performa...	2025-12-13 19:48:13.328409	2025-12-13 19:50:41.124	\N
108	Synthesize the provided documentation to construct an 'Opera...	2025-12-19 10:13:48.553053	2025-12-19 10:13:48.826	\N
92	How does risk profiling work?	2025-12-17 11:42:56.124728	2025-12-17 11:42:56.729	\N
74	Write a company research report on Reliance industries for m...	2025-12-13 20:26:43.177044	2025-12-13 20:35:23.376	\N
75	What are rhe portfolio return parameters available in the ap...	2025-12-13 20:42:39.163956	2025-12-13 20:43:43.683	\N
76	What is drawdown? Is it supported by the application?	2025-12-14 14:37:24.85896	2025-12-14 14:38:59.863	\N
93	What are the main features of the wealth management system?	2025-12-17 12:05:25.780309	2025-12-17 12:05:25.780309	\N
84	How can an Operations User transfer a large number of client...	2025-12-16 10:37:31.993926	2025-12-16 10:52:16.591	\N
77	Write a BRD for performng 'Retirement Planning'. \n	2025-12-14 16:27:08.419774	2025-12-14 17:29:41.705	\N
9	What is the CRR and PRR logic for order placement?	2025-10-22 07:40:34.040549	2025-10-22 07:42:07.511	\N
10	What is the CRR and PRR logic for order placement?	2025-10-22 07:41:27.788183	2025-10-22 08:56:22.005	\N
11	Why is OTP used in wealth management transactions?	2025-10-23 18:23:27.222188	2025-10-23 18:25:18.542	\N
12	What's the difference between buy and sell orders?	2025-10-28 06:25:01.599168	2025-10-28 06:26:45.521	\N
13	How do redemption transactions work?	2025-10-28 06:27:16.71813	2025-10-28 06:27:16.71813	\N
14	How does the order placement workflow work?	2025-10-30 07:50:55.650979	2025-10-30 07:52:22.972	\N
15	What reports are generated for clients?	2025-10-31 06:38:29.876776	2025-10-31 06:40:12.313	\N
16	How does the order placement workflow work?	2025-10-31 06:40:26.383876	2025-10-31 06:41:15.907	\N
94	How does risk profiling work in the system?	2025-12-17 12:05:57.345038	2025-12-17 12:05:58.083	\N
18	How are customer accounts categorized?	2025-10-31 06:42:35.051985	2025-10-31 06:43:39.394	\N
19	What is the full lifecycle of mutual funds order placement?	2025-11-07 04:30:07.252522	2025-11-07 04:31:39.458	\N
85	How does a user secure their access to the application immed...	2025-12-16 11:00:39.082207	2025-12-16 11:10:21.934	\N
79	What is the primary functional difference between "Handover"...	2025-12-16 05:44:09.257104	2025-12-16 05:44:09.257104	\N
86	what are different type of goals we can take up for planning...	2025-12-16 16:00:43.029568	2025-12-16 16:02:56.235	\N
95	What is portfolio rebalancing and how does it work?	2025-12-17 12:06:09.085937	2025-12-17 12:06:09.859	\N
78	How is portfolio rebalancing done in the system?	2025-12-14 18:28:54.429211	2025-12-16 06:03:54.648	\N
80	How can an Operations User transfer a large number of client...	2025-12-16 06:13:19.644141	2025-12-16 06:17:22.424	\N
96	What is risk profiling?	2025-12-17 12:06:27.834964	2025-12-17 12:08:08.338	\N
88	What logic is used to sort the RMs when we need to show the ...	2025-12-17 06:13:04.647499	2025-12-17 06:14:33.37	\N
97	How does risk profiling work?	2025-12-17 12:19:21.922143	2025-12-17 12:19:22.612	\N
98	How often is asset rebalancing recommended within wealth man...	2025-12-17 13:37:25.159764	2025-12-17 13:39:29.704	\N
99	What steps are involved in creating customer management prof...	2025-12-17 14:57:44.38528	2025-12-17 14:57:44.38528	\N
81	How can a user automatically generate a list of target leads...	2025-12-16 06:35:15.725962	2025-12-16 07:12:36.457	\N
100	How is the weighted average cost of direct equity tracked an...	2025-12-17 16:29:13.838995	2025-12-17 16:29:13.838995	\N
101	What is the role of the risk profile questionnaire in shapin...	2025-12-17 16:37:09.895122	2025-12-17 16:39:30.921	\N
82	How can a user automatically generate a list of target leads...	2025-12-16 07:13:31.847738	2025-12-16 07:32:53.752	\N
102	How is portfolio diversification achieved in wealth manageme...	2025-12-17 16:49:50.055966	2025-12-17 16:52:04.463	\N
103	What is the role of the risk profile questionnaire in shapin...	2025-12-17 17:04:34.914129	2025-12-17 17:04:35.576	\N
89	How can an Operations User transfer a large number of client...	2025-12-17 06:13:45.316121	2025-12-17 06:43:45.15	\N
104	How is the fee structure determined for asset management wit...	2025-12-17 17:05:06.850178	2025-12-17 17:22:14.624	\N
87	What logic does the system use to sort the list of Relations...	2025-12-17 05:45:40.68436	2025-12-17 06:55:50.414	\N
90	Synthesize the provided documentation to construct an 'Opera...	2025-12-17 11:23:29.67301	2025-12-17 11:23:30.265	\N
65	what is CRR and PRR?	2025-12-13 18:24:12.226945	2025-12-13 18:25:58.438	\N
105	Which events are audited for immutability across orders, pay...	2025-12-18 07:57:12.187047	2025-12-18 08:01:59.352	\N
67	how is portfolio rebalancing is done in the application?	2025-12-13 18:29:34.683815	2025-12-13 18:30:49.163	\N
66	what is CRR and PRR?\n\n	2025-12-13 18:27:19.628181	2025-12-13 18:36:47.623	\N
68	Describe the mutual funds order management lifecycle in deta...	2025-12-13 18:41:03.978242	2025-12-13 18:56:56.211	\N
106	How do RTA/BSE STAR integrations shape order routing and con...	2025-12-19 10:04:57.068252	2025-12-19 10:07:25.992	\N
107	How can a user automatically generate a list of target leads...	2025-12-19 10:12:43.586086	2025-12-19 10:13:19.749	\N
\.
COPY public.conversations (id, question, mode, use_cache, response, created_at) FROM stdin;
1	What are the steps in mutual funds order placement?	balanced	t	**Overview:**\nPlacing an order for mutual funds involves several structured steps. These ensure compliance, validation, and accurate transaction processes. Each step integrates various systems and data entities to ensure seamless execution [KG: mutual_funds].\n\n**Main Findings:**\nKey Point: Initial steps focus on validating customer details and assessing risk.\n- Customer Information: The order maps and validates information with the customer's profile, ensuring compliance with personal and financial details [KG: customer].\n- Risk Profile: The order is governed by the product risk profile, which assesses the suitability of mutual fund investments for the customer [KG: product_risk_profile].\n- Investor Validation: Ensures all investor requirements and prerequisites are met before proceeding [KG: investor].\n\n**Process Details:**\nNote: Order involves multiple data validations and system integrations.\n- Data Integration: The order contains and processes various data entities like mutual funds and field level details to ensure correct inputs [KG: mutual_funds] [KG: field_level_details].\n- Compliance Checks: The order must pass through validations and warnings to meet regulatory compliance and avoid errors [KG: validations_warning].\n- System Integration: Integrates with systems like PMS application and CAMS for fund management and transaction processing [KG: pms_app] [KG: cams].\n\n**Additional Details:**\n- Fund Cut-off Times: Orders consider the end-of-day and fund cut-off times to meet processing deadlines [KG: end_day_cutoff_time].\n- Transaction Documentation: Includes transaction slips and nomination forms for record-keeping and legal purposes [KG: transaction_slip] [KG: nomination_form].\n  - Document Management: Secure storage and retrieval of documents.\n  - Email Notifications: Transaction status updates and confirmations are communicated via email [KG: email].\n\n**Important:**\n- Supervisor Approval: Orders may be reviewed in a supervisor’s queue for final approval before execution [KG: supervisor_s_queue].\n- Finalization: After validation and approval, transaction details are updated, and statuses are reported in the order book [KG: order_book_report].\n\nThis structured approach ensures mutual fund orders are efficiently processed and aligned with customer goals and legal requirements.	2025-10-17 15:11:01.609031
2	What are the steps in mutual funds order placement?	concise	t	**Direct Answer:** The mutual funds order placement involves several essential steps, from initiation to validation and processing. This ensures accurate execution and compliance with regulatory requirements [1].\n\n**Key Points:**\n• Step 1: Orders are initiated by customers through relevant systems like PMS [1].\n• Step 2: Customer information is validated for completeness and compliance [2].\n• Step 3: Order details are displayed for review, including fund status and transaction details [1].\n• Step 4: Orders undergo further processing, including risk profiling and prerequisite checks [1][2].\n\n**Note:** Observing fund cut-off times is crucial for timely transactions.	2025-10-17 15:12:06.081961
3	What is OTP verification?	balanced	t	• Key Point: OTP verification is a security step completed on the OTP verification screen. [KG: OTP verification screen]  \n• Important: It enforces two factor authentication as a compliance requirement. [KG: Two factor authentication]  \n• Note: The User performs this verification to continue securely. [KG: User]	2025-10-19 08:44:37.469927
4	What is OTP?	balanced	t	• Key Point: OTP verification is a security step completed on the OTP verification screen. [KG: OTP verification screen]  \n• Important: It enforces two factor authentication as a compliance requirement. [KG: Two factor authentication]  \n• Note: The User performs this verification to continue securely. [KG: User]	2025-10-19 08:59:40.409612
5	on which number is it sent?	balanced	t	• Key Point: The graph does not specify any phone number for delivery. [KG: Order]\n\n• Important: The only delivery channel mentioned is Email, not SMS/phone. [KG: Email]\n\n• Note: No contact number field is shown in the provided context. [KG: Order]	2025-10-19 09:00:41.438451
\.
