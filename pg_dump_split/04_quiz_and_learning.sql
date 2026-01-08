CREATE TABLE public.quiz_questions (
    id integer NOT NULL,
    category text NOT NULL,
    topic text NOT NULL,
    difficulty text NOT NULL,
    question_text text NOT NULL,
    option_a text,
    option_b text,
    option_c text,
    option_d text,
    correct_answer text NOT NULL,
    question_type text NOT NULL,
    explanation text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.quiz_attempts (
    id integer NOT NULL,
    thread_id integer,
    total_questions integer NOT NULL,
    correct_answers integer NOT NULL,
    score_percentage integer NOT NULL,
    time_spent integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    topic text NOT NULL,
    category text NOT NULL,
    points_earned integer NOT NULL
);
CREATE TABLE public.quiz_responses (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    question_text text NOT NULL,
    user_answer text NOT NULL,
    correct_answer text NOT NULL,
    is_correct boolean NOT NULL,
    topic text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.user_mastery (
    id integer NOT NULL,
    overall_score integer DEFAULT 0 NOT NULL,
    current_level text DEFAULT 'Novice'::text NOT NULL,
    quiz_performance_score integer DEFAULT 0 NOT NULL,
    topic_coverage_score integer DEFAULT 0 NOT NULL,
    retention_score integer DEFAULT 0 NOT NULL,
    topics_mastered integer DEFAULT 0 NOT NULL,
    total_quizzes_taken integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    total_cumulative_points integer DEFAULT 0 NOT NULL
);
CREATE TABLE public.ba_knowledge_questions (
    id integer NOT NULL,
    category text NOT NULL,
    question text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE SEQUENCE public.ba_knowledge_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.ba_knowledge_questions_id_seq OWNED BY public.ba_knowledge_questions.id;
CREATE SEQUENCE public.quiz_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.quiz_attempts_id_seq OWNED BY public.quiz_attempts.id;
CREATE SEQUENCE public.quiz_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.quiz_questions_id_seq OWNED BY public.quiz_questions.id;
CREATE SEQUENCE public.quiz_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.quiz_responses_id_seq OWNED BY public.quiz_responses.id;
CREATE SEQUENCE public.user_mastery_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_mastery_id_seq OWNED BY public.user_mastery.id;
COPY public.quiz_questions (id, category, topic, difficulty, question_text, option_a, option_b, option_c, option_d, correct_answer, question_type, explanation, created_at) FROM stdin;
71	Order Management	Order Flow Fundamentals	2	What is the primary objective of the Order Flow for Equity, Fixed Income, ETF, and Structured Products?	Generate market research reports	Capture orders, place, execute, confirm, and settle	Only capture and route orders	Only reconcile trades after settlement	B	multiple_choice	The order flow process encompasses the complete lifecycle from order capture through settlement.	2025-10-30 06:32:11.122638
72	Order Management	Order Flow Fundamentals	2	Which combination best describes who can initiate orders in the OMS?	Compliance and Legal only	Relationship Manager, ISD, AMD, or Treasury	Customers directly via self-service only	Only the Trading Desk	B	multiple_choice	Multiple authorized internal roles can initiate orders in the OMS.	2025-10-30 06:32:11.122638
73	Order Management	Order Flow Fundamentals	2	For NDPMS portfolios, when the mode of instruction is mail, fax, or telephone, what must the system check?	KYC refresh status	Communication Indemnity document	Tax residency declaration status	Collateral eligibility	B	multiple_choice	Communication Indemnity is required for non-digital instruction modes.	2025-10-30 06:32:11.122638
74	Order Management	Order Flow Fundamentals	3	During order capture, how does OMS treat document validations conceptually?	It ignores expiry dates and checks only submission	It validates document expiry dates for some documents and submission status for others	It validates only that documents exist	It delegates all document validation to the broker	B	multiple_choice	Different documents have different validation requirements based on their nature.	2025-10-30 06:32:11.122638
75	Order Management	Order Flow Fundamentals	3	Which document is more likely checked for submission status rather than expiry date?	W8 Ben	FATCA	Risk Profile Document	Passport	C	multiple_choice	Risk Profile Document is typically checked for submission, not expiry.	2025-10-30 06:32:11.122638
76	Order Management	Order Flow Fundamentals	2	What happens if "Good till day" is selected for a limit order in OMS?	The order auto-converts to a market order	OMS shows an error based on time-in-force checks	The order gets routed but flagged for manual review	OMS cancels the order automatically	B	multiple_choice	Time-in-force checks prevent incorrect "Good till day" selection for limit orders.	2025-10-30 06:32:11.122638
77	Order Management	Order Flow Fundamentals	3	Which of the following is included in pre-trade validations?	Broker capital adequacy validation	NCMV being negative validation	Exchange holiday calendar validation only	Post-trade fee netting validation	B	multiple_choice	NCMV negative validation is a key pre-trade check.	2025-10-30 06:32:11.122638
78	Order Management	Order Flow Fundamentals	2	For NDPM investors placing Equity/ETF orders, what does OMS default?	Custodian account	Trading account meant for equity transactions	Settlement account of the broker	Margin account with the exchange	B	multiple_choice	OMS defaults to the trading account for equity transactions for NDPM investors.	2025-10-30 06:32:11.122638
79	Order Management	Order Flow Fundamentals	3	What determines whether a transaction can proceed after OMS fetches the cash balance from T24?	The size of the order exceeds a threshold	Whether Dr/Cr is allowed in the relevant account	Whether the client is VIP	Daily P&L limit of the desk	B	multiple_choice	The Dr/Cr permission determines if debits or credits are allowed.	2025-10-30 06:32:11.122638
80	Order Management	Order Flow Fundamentals	1	For limit orders, what flexibility does OMS provide?	It disables price fields	It allows modification of the limit price	It forces market conversion	It fixes price based on last close	B	multiple_choice	Limit orders allow price modification by the user.	2025-10-30 06:32:11.122638
81	Order Management	Order Capture & Document Validation	2	In bond buy orders, how is bank income conceptually captured in OMS?	Through slippage fees	Through PB Buy Price vs. PB Sell Price differential	Through exchange rebates	Through custody spread	B	multiple_choice	The price differential represents the bank's income on bond transactions.	2025-10-30 06:32:41.628645
82	Order Management	Order Capture & Document Validation	3	When funding an Equity buy order for NDPM investors, what does OMS consider?	Only the immediate cash balance	Future-dated sell and buy orders to be settled before the buy order, in addition to cash balance	Only margin availability	Only loan-to-value thresholds	B	multiple_choice	OMS considers all pending settlements to calculate available funds.	2025-10-30 06:32:41.628645
83	Order Management	Order Capture & Document Validation	2	After authorization, what is blocked on the client's account, and what special handling applies to market orders?	Fees only; market orders are blocked without buffer	Order Amount and Fees; market orders use a buffer for lien	Commission only; market orders are not blocked	Taxes only; market orders auto-release	B	multiple_choice	Market orders use a buffer due to price uncertainty at execution.	2025-10-30 06:32:41.628645
84	Order Management	Order Capture & Document Validation	2	What are the potential order statuses based on checklists during order capture?	Pending or Failed	Clean or Discrepant	Held or Released	Draft or Confirmed	B	multiple_choice	Orders are classified as Clean (all checks pass) or Discrepant (issues found).	2025-10-30 06:32:41.628645
85	Order Management	Order Capture & Document Validation	2	Which business rule governs subscription order placement?	They can be placed regardless of cash balance	They require only securities availability	They can be placed only if adequate cash balance exists	They require pre-allocated collateral	C	multiple_choice	Subscription orders require sufficient cash balance.	2025-10-30 06:32:41.628645
86	Order Management	Order Capture & Document Validation	3	If there is a change in FX rate or fee, what is required operationally?	No action needed	Auto-approval by OMS	SMS to Head of RM, and Ops validates approval and uploads the approval document	Immediate trade cancellation	C	multiple_choice	FX rate or fee changes require supervisory approval and documentation.	2025-10-30 06:32:41.628645
87	Order Management	Order Capture & Document Validation	2	Which event can trigger an alert in OMS during order flow?	Holiday calendar update	Change in FX rate or fee override	Broker rating change	End-of-day batch close	B	multiple_choice	FX rate or fee changes trigger automatic alerts for oversight.	2025-10-30 06:32:41.628645
88	Order Management	Order Capture & Document Validation	2	What is the objective of the Order Reversal/Cancellation process?	Automate tax reporting	Cancel or reverse trades when a mistake is identified	Auto-allocate trades among portfolios	Generate MIS reports	B	multiple_choice	The reversal process corrects errors in order execution.	2025-10-30 06:32:41.628645
89	Order Management	Order Capture & Document Validation	2	Which is a valid reason to initiate order cancellation/trade reversal?	Client wealth threshold changed	Security/Price is wrong	Market was volatile	Dividends were declared	B	multiple_choice	Incorrect security or price requires order cancellation or reversal.	2025-10-30 06:32:41.628645
90	Order Management	Order Capture & Document Validation	2	If an order is initiated but not placed in market and the quantity is wrong, what should the user do?	Cancel and recreate the client profile	Modify the order to correct the quantity	Execute then reverse immediately	Place an offsetting hedge trade	B	multiple_choice	Orders not yet placed can be modified directly.	2025-10-30 06:32:41.628645
91	Order Management	Order Modification & Cancellation	3	If the order is placed in market but not executed and quantity is wrong, how is correction handled conceptually?	Delete the order silently	Modify in OMS to send amendment to Bloomberg, or modify in both if no interface	Allow execution then reverse	Switch to market order automatically	B	multiple_choice	Market-placed orders require coordination between OMS and Bloomberg.	2025-10-30 06:33:06.681363
92	Order Management	Order Modification & Cancellation	2	If an order is executed but the quantity is less than required, how is the shortfall addressed?	Cancel the executed trade	Place another order for the differential quantity	Adjust the price and rebook	Wait for next settlement cycle	B	multiple_choice	Additional orders cover shortfalls from partial execution.	2025-10-30 06:33:06.681363
93	Order Management	Order Modification & Cancellation	3	If an order is executed but the quantity is more than required, what correction is made?	Ignore, since execution is final	Trade correction: extra quantity taken on bank's books; fees/accounting for extra reversed in customer's account; later squared off	Reverse entire trade	Pass extra to another client	B	multiple_choice	Over-execution requires bank to absorb excess and reverse customer charges.	2025-10-30 06:33:06.681363
94	Order Management	Order Modification & Cancellation	2	If the customer is wrong and the order is not placed in market, what should be done in OMS?	Amend customer on the fly	Cancel the order in OMS	Execute then reverse	Send manual notification only	B	multiple_choice	Un-placed orders can be cancelled and recreated for correct customer.	2025-10-30 06:33:06.681363
95	Order Management	Order Modification & Cancellation	3	If the customer is wrong, and the order is placed but not executed, how should cancellation be handled?	Only in Bloomberg	Only in OMS	In OMS with cancellation sent to Bloomberg if interface exists; otherwise cancel in both	No action; wait for expiry	C	multiple_choice	Both systems must be updated for placed but unexecuted orders.	2025-10-30 06:33:06.681363
96	Order Management	Order Modification & Cancellation	3	If the customer is wrong but the trade is already executed or settled, what is the conceptual correction?	No correction possible	Reverse for wrong customer; place a matching order for the right customer (won't flow to Bloomberg automatically) and match with executed trade	Only update the name on the trade	Split the trade between customers	B	multiple_choice	Executed trades require reversal and manual matching to correct customer.	2025-10-30 06:33:06.681363
97	Order Management	Order Modification & Cancellation	2	In which scenarios do partial confirmations typically arise?	Subscription orders	Redemption and Switch orders	IPO allocations	Dividend reinvestments only	B	multiple_choice	Redemption and switch orders often have partial confirmations.	2025-10-30 06:33:06.681363
98	Order Management	Order Modification & Cancellation	3	In unit-based partial confirmations, which order gets "Contracted" then "Settled"?	The new order for the unconfirmed units	The modified order matching inbound confirmed units	Neither; both remain Pending	Only the original order	B	multiple_choice	The modified order reflecting confirmed units proceeds to settlement.	2025-10-30 06:33:06.681363
99	Order Management	Order Modification & Cancellation	3	In unit-based partial confirmations, which records are updated in the system for the accepted portion?	Neither transaction nor holding master	Only the holding master	Transaction and holding master for the modified order; not updated for the rejected order	Only the transaction master for both orders	C	multiple_choice	Only the modified order updates transaction and holding records.	2025-10-30 06:33:06.681363
100	Order Management	Order Modification & Cancellation	3	In amount-based partial confirmations, which order is marked "Rejected"?	The order for the amount in the inbound file	The order for the difference between outbound and inbound amounts	The original order regardless of acceptance	None	B	multiple_choice	The differential amount is rejected and not processed.	2025-10-30 06:33:06.681363
101	Order Management	Partial Confirmations & Status	2	After a reversal of a previously accepted partial confirmation, what happens to the modified (settled) order?	It remains Settled	It changes to Reversed	It becomes Pending	It becomes Canceled	B	multiple_choice	Reversals update the order status to Reversed.	2025-10-30 06:33:32.744938
102	Order Management	Partial Confirmations & Status	4	How are transactions processed under the FIFO design on any day?	Normal – In, Normal – Out, Reversal – In, Reversal – Out	Reversal – Out, Reversal – In, Normal – In, Normal – Out	Normal – Out, Normal – In, Reversal – Out, Reversal – In	Normal – In, Reversal – In, Normal – Out, Reversal – Out	B	multiple_choice	FIFO processes reversals first to maintain accurate lot tracking.	2025-10-30 06:33:32.744938
103	Order Management	Partial Confirmations & Status	3	Under FIFO, what detail is maintained for every "Out" transaction?	Broker settlement rate	The transaction from which the units were sold	Average cost across all lots only	Only the settlement date	B	multiple_choice	FIFO tracks source transactions for accurate gains/losses.	2025-10-30 06:33:32.744938
104	Order Management	Partial Confirmations & Status	2	What does the reconciliation process conceptually produce?	A regulatory filing	A view comparing holdings with uploaded file, showing matching and non-matching records	A final tax certificate	A trade blotter only	B	multiple_choice	Reconciliation identifies discrepancies between systems.	2025-10-30 06:33:32.744938
105	Order Management	Partial Confirmations & Status	2	What typically triggers the reconciliation process?	End-of-month close	Upload of a reconciliation file	Market open	New instrument onboarding	B	multiple_choice	File upload initiates the reconciliation workflow.	2025-10-30 06:33:32.744938
106	Order Management	Partial Confirmations & Status	2	Which business rule applies to holdings reconciliation?	Uploaded records should match existing holdings	Variances are ignored under 5%	Only price differences are checked	Only quantity increases are flagged	A	multiple_choice	Holdings should match external records exactly.	2025-10-30 06:33:32.744938
107	Order Management	Partial Confirmations & Status	2	When are order status updates performed in the broader order-processing journey?	During the order to trade matching event	Only after settlement	Only at order initiation	Only during account opening	A	multiple_choice	Order-to-trade matching updates order statuses.	2025-10-30 06:33:32.744938
108	Order Management	Partial Confirmations & Status	2	When are transaction master updates performed?	During tax filing	During the order to trade matching event	During corporate actions only	During market holidays	B	multiple_choice	Transaction records are updated during order matching.	2025-10-30 06:33:32.744938
109	Order Management	Partial Confirmations & Status	2	Display of units in Order Capture and Customer Dashboard is part of which event?	Order initiation event	Order execution event	Reconciliation event	Maintenance event	B	multiple_choice	Units are displayed after execution.	2025-10-30 06:33:32.744938
110	Order Management	Partial Confirmations & Status	3	What governance applies when defining reconciliation rules and tolerances?	Informal notes	Add/View/Modify with Authorization	Only read-access allowed	Broker approval only	B	multiple_choice	Reconciliation rule changes require proper authorization.	2025-10-30 06:33:32.744938
111	Order Management	Account Management & FIFO	2	Why is the Dr/Cr flag important before proceeding with an order?	It indicates tax status	It determines whether debits/credits are allowed in the chosen account	It sets market-making permissions	It influences FX conversion rates	B	multiple_choice	Dr/Cr permissions control account transaction types.	2025-10-30 06:33:54.336962
112	Order Management	Account Management & FIFO	2	Conceptually, what does "Clean" vs. "Discrepant" status signal during order capture?	Whether checklist-based conditions are satisfied	Whether market is open	Whether the broker has responded	Whether settlement agent is mapped	A	multiple_choice	Clean means all pre-requisites met; Discrepant indicates issues.	2025-10-30 06:33:54.336962
113	Order Management	Account Management & FIFO	2	What should OMS do if Valid till Date is less than the Business Date?	Proceed and alert later	Show an error	Adjust automatically by +1 day	Send for manual override only	B	multiple_choice	Past validity dates are invalid and trigger errors.	2025-10-30 06:33:54.336962
114	Order Management	Account Management & FIFO	2	Which aspect of pre-trade checks helps prevent orders when markets are unavailable?	NCMV negative validation	Market status (open/close) validation	Minimum customer lot size validation	Security trade multiple validation	B	multiple_choice	Market status validation prevents trading outside market hours.	2025-10-30 06:33:54.336962
115	Order Management	Account Management & FIFO	2	Why is the "Time in force" check essential for limit orders?	To ensure appropriate validity settings and prevent incorrect "Good till day" use	To auto-convert to market orders	To combine multiple client orders	To calculate average price	A	multiple_choice	Time in force determines order validity duration.	2025-10-30 06:33:54.336962
116	Order Management	Account Management & FIFO	2	Operationally, who is notified of FX rate or fee changes for oversight?	Head of RM receives SMS	Head of Compliance receives email	Trader receives chat message	Client receives SMS	A	multiple_choice	Head of RM is alerted via SMS for rate/fee changes.	2025-10-30 06:33:54.336962
117	Order Management	Account Management & FIFO	2	What best describes OMS handling of market orders in terms of lien?	No lien is marked	Lien is marked with a buffer	Lien is waived for VIPs	Lien equals exactly the base amount without any buffer	B	multiple_choice	Buffer accounts for price movement in market orders.	2025-10-30 06:33:54.336962
118	Order Management	Account Management & FIFO	3	In partial confirmations, do both the modified and new orders share the same order number?	No, they must differ	Yes, they share the same order number	Only in amount-based cases	Only in unit-based cases	B	multiple_choice	Partial confirmations maintain the original order number.	2025-10-30 06:33:54.336962
119	Order Management	Account Management & FIFO	3	Under FIFO, which recordkeeping helps accurate gains/losses?	Maintaining linked lots for "Out" transactions and remaining units for "In" transactions	Only average cost updates	Only broker fee accruals	Only settlement dates	A	multiple_choice	FIFO tracks lot linkages for accurate cost basis.	2025-10-30 06:33:54.336962
120	Order Management	Account Management & FIFO	2	Which reconciliation outcome captures user actions for mismatches?	Auto-resolve without notes	System allows entering text to capture action taken	Only downloads a CSV	Deletes unmatched records	B	multiple_choice	Users document resolution actions for audit trail.	2025-10-30 06:33:54.336962
121	Order Management	Reconciliation Process	2	What conceptual role does Operations play in reconciliation?	Maker-only for new instruments	Responsible for running reconciliation and capturing actions	Only observes alerts	Assigns execution venues	B	multiple_choice	Operations runs and manages the reconciliation process.	2025-10-30 06:34:11.641936
122	Order Management	Reconciliation Process	2	Which orders are least likely to have partial confirmations according to the process?	Redemption orders	Switch orders	Subscription orders	Switch-out reversals	C	multiple_choice	Subscription orders typically confirm in full.	2025-10-30 06:34:11.641936
123	Order Management	Reconciliation Process	2	What is the conceptual purpose of the "Order Routing" step in the flow?	To select the appropriate next step after initiation	To perform end-of-day reconciliation	To compute tax at source	To close all pending orders	A	multiple_choice	Order routing determines the processing workflow.	2025-10-30 06:34:11.641936
124	Order Management	Reconciliation Process	2	What is a typical output of the Order Flow process relevant to stakeholders?	Only cash statements	Orders, Trades, and Position	Only fee schedules	Only risk ratings	B	multiple_choice	Order flow produces orders, trades, and position updates.	2025-10-30 06:34:11.641936
125	Order Management	Reconciliation Process	2	What is the typical trigger for the Order Flow processes discussed?	Automatic at market open	Manual	Nightly batch	Client approval workflow	B	multiple_choice	Order flow is manually initiated by authorized users.	2025-10-30 06:34:11.641936
126	Order Management	Reconciliation Process	2	Which pre-trade validation safeguards against clients trading outside permitted multiples?	Security Trade Multiple validation	Dividend entitlement check	Corporate action lock check	Custodian fee check	A	multiple_choice	Trade multiples ensure compliance with instrument rules.	2025-10-30 06:34:11.641936
127	Order Management	Reconciliation Process	2	Which pre-trade validation ensures minimum client trade size is respected?	Minimum customer lot size validation	Broker credit limit validation	FX cut-off validation	Settlement cycle validation	A	multiple_choice	Minimum lot size prevents undersized trades.	2025-10-30 06:34:11.641936
128	Order Management	Reconciliation Process	2	In the order lifecycle, when are holdings master updates typically performed?	During order to trade matching	During maintenance	Pre-trade only	During reconciliation only	A	multiple_choice	Holdings update during order-to-trade matching.	2025-10-30 06:34:11.641936
129	Order Management	Reconciliation Process	3	Why is a buffer applied to liens for market orders conceptually?	To accommodate price movement risk on immediate execution	To lower client fees	To offset broker rebates	To capture exchange holidays	A	multiple_choice	Buffer protects against adverse price movements.	2025-10-30 06:34:11.641936
130	Order Management	Reconciliation Process	2	Which high-level reconciliation categories are mentioned in the process?	Transaction, AUM, and Trail Fee reconciliation	Only cash reconciliation	Only counterparty reconciliation	Only tax reconciliation	A	multiple_choice	Multiple reconciliation types ensure data accuracy.	2025-10-30 06:34:11.641936
131	Order Management	Pre-Trade Validations	3	Which set lists valid pre-trade validations in OMS?	Market status; Time in force check for limit orders; NCMV negative	Corporate action announcements; FX holidays	Only client KYC expiry	Only broker rating check	A	multiple_choice	Multiple validations ensure order quality and compliance.	2025-10-30 06:34:37.81634
132	Order Management	Pre-Trade Validations	3	Which pair is explicitly checked for document expiry in the OMS process?	Risk Profile, Leverage Agreement	W8 Ben, FATCA	Broker Agreement, Custody Agreement	Market Disclosure, POA	B	multiple_choice	W8 Ben and FATCA have expiry dates that must be validated.	2025-10-30 06:34:37.81634
133	Order Management	Pre-Trade Validations	2	For NDPM Equity/ETF orders, what account is defaulted by OMS?	Custody account	Trading account for equity	Loan account	Nostro account	B	multiple_choice	Equity orders default to the designated trading account.	2025-10-30 06:34:37.81634
134	Order Management	Pre-Trade Validations	2	For Bonds, if only a cash account exists, what does OMS do?	Blocks the trade	Defaults the cash account; otherwise user selects	Selects trading account by default	Requests broker selection automatically	B	multiple_choice	OMS provides intelligent defaults based on available accounts.	2025-10-30 06:34:37.81634
135	Order Management	Pre-Trade Validations	2	Which system does OMS call to fetch cash balance and Dr/Cr permissions?	T24	Swift	Bloomberg	Reuters	A	multiple_choice	T24 is the core banking system providing account data.	2025-10-30 06:34:37.81634
136	Order Management	Pre-Trade Validations	2	How does OMS treat liens for market orders?	No lien	Lien with a buffer percentage	Fixed lien of zero	Lien equals fees only	B	multiple_choice	Buffer compensates for execution price uncertainty.	2025-10-30 06:34:37.81634
137	Order Management	Pre-Trade Validations	1	What amounts are blocked upon authorization?	Only fees	Only principal	Order Amount plus Fees	Only taxes	C	multiple_choice	Both principal and fees are blocked to ensure settlement.	2025-10-30 06:34:37.81634
138	Order Management	Pre-Trade Validations	2	In bond buy order capture, which two prices can be recorded?	Ask and Bid	PB Buy Price and PB Sell Price	Open and Close	NAV and Spread	B	multiple_choice	PB prices capture client and market pricing.	2025-10-30 06:34:37.81634
139	Order Management	Pre-Trade Validations	2	For Equity buy orders, what additional data is considered besides current cash balance?	Only previous day's trades	Future-dated orders settling before the buy order	Only loan headroom	Only FX forward cover	B	multiple_choice	Pending settlements affect available cash calculation.	2025-10-30 06:34:37.81634
140	Order Management	Pre-Trade Validations	1	What is the system behavior if Valid till Date is earlier than the Business Date?	Accept with warning	Show error and disallow	Auto-extend validity	Send to manual queue	B	multiple_choice	Past validity dates are rejected with an error.	2025-10-30 06:34:37.81634
141	Order Management	Order Execution & Settlement	2	Which sub-process addresses "Customer is wrong" after trade execution/settlement?	Order Cancellation (not executed)	Order Reversal – Customer is wrong	Order Initiation	Order Routing	B	multiple_choice	Executed trades require reversal process for customer corrections.	2025-10-30 06:34:57.978253
142	Order Management	Order Execution & Settlement	3	In "quantity is wrong and more than actual," what happens to fees and accounting entries for the extra quantity?	They remain as is	They are reversed in the customer's account	They are billed to the broker	They are deferred to next cycle	B	multiple_choice	Customer is not charged for over-execution errors.	2025-10-30 06:34:57.978253
143	Order Management	Order Execution & Settlement	3	When are trades taken on the bank's books (due to extra executed quantity) typically squared off?	Immediately at initiation	By the trader later in the market	At month-end only	Never; they remain proprietary	B	multiple_choice	Traders manage proprietary positions to close out errors.	2025-10-30 06:34:57.978253
144	Order Management	Order Execution & Settlement	3	After reversing a trade for the wrong customer, the matching order for the right customer will:	Flow automatically to Bloomberg	Not flow automatically to Bloomberg and must be matched to the executed trade	Be auto-created by OMS	Be rejected by OMS	B	multiple_choice	Corrected orders require manual matching with executed trades.	2025-10-30 06:34:57.978253
145	Order Management	Order Execution & Settlement	3	In unit-based partial confirmation, which order receives statuses "Contracted" then "Settled"?	The order for unconfirmed units	The modified order for inbound-confirmed units	The original outbound order only	None	B	multiple_choice	Confirmed portion proceeds through normal settlement.	2025-10-30 06:34:57.978253
146	Order Management	Order Execution & Settlement	2	In partial confirmations, do both orders share the same order number?	Yes	No	Only for redemption	Only for switches	A	multiple_choice	Partial confirmations maintain order number consistency.	2025-10-30 06:34:57.978253
147	Order Management	Order Execution & Settlement	3	In amount-based partial confirmation, how are units for the modified order determined?	Fixed by broker	Based on Indicative NAV used while placing the order	Based on average market price	Based on settlement price	B	multiple_choice	Original indicative NAV determines unit calculation.	2025-10-30 06:34:57.978253
148	Order Management	Order Execution & Settlement	3	In unit-based partial confirmation, how is the transaction amount for the modified order derived?	From real-time NAV	From indicative NAV used at order placement	From bid-ask midpoint	From previous EOD NAV	B	multiple_choice	Amount uses indicative NAV from order placement time.	2025-10-30 06:34:57.978253
149	Order Management	Order Execution & Settlement	2	After a reversal of a partially confirmed transaction, what is the status of the previously settled modified order?	Reversed	Canceled	Discrepant	Pending	A	multiple_choice	Reversed status indicates transaction has been reversed.	2025-10-30 06:34:57.978253
150	Order Management	Order Execution & Settlement	4	Which transaction category is processed first under FIFO on any given day?	Normal – In	Normal – Out	Reversal – Out	Reversal – In	C	multiple_choice	Reversal Out processes first to maintain lot integrity.	2025-10-30 06:34:57.978253
151	Order Management	Transaction Management & Alerts	3	What specific record is maintained for every "Out" transaction?	Charges and commission breakdown only	The source transaction/lot from which units were sold	The credit rating of the issuer	The margin utilization	B	multiple_choice	Source lot tracking enables accurate cost basis calculation.	2025-10-30 06:35:14.937615
152	Order Management	Transaction Management & Alerts	3	For every "In" transaction, OMS maintains which details?	Units remaining in the lot and units sold	Only units sold	Only cash flow entries	Only broker execution times	A	multiple_choice	In transactions track remaining units for future sales.	2025-10-30 06:35:14.937615
153	Order Management	Transaction Management & Alerts	2	What convenience does the system provide for reconciliation review?	Blocks export	Provides an option to download the reconciliation view	Auto-archives without view	Hides non-matching rows	B	multiple_choice	Download functionality enables offline review and analysis.	2025-10-30 06:35:14.937615
154	Order Management	Transaction Management & Alerts	2	What validation applies during reconciliation data entry?	Optional fields only	Mandatory field verification for fields marked with "*"	No validation	Only numeric fields	B	multiple_choice	Mandatory field validation ensures data completeness.	2025-10-30 06:35:14.937615
155	Order Management	Transaction Management & Alerts	1	Who is the designated actor for the reconciliation process?	Legal	Operations	Clients	Brokers	B	multiple_choice	Operations team manages reconciliation activities.	2025-10-30 06:35:14.937615
156	Order Management	Transaction Management & Alerts	1	What is the trigger for the reconciliation process?	Market close	Upload of reconciliation file	Broker confirmation	Dividend declaration	B	multiple_choice	File upload initiates reconciliation workflow.	2025-10-30 06:35:14.937615
157	Order Management	Transaction Management & Alerts	1	What is the output of the reconciliation process?	Audit log only	Reconciled view	Settlement instruction	Fee approval	B	multiple_choice	Reconciled view shows matched and unmatched records.	2025-10-30 06:35:14.937615
158	Order Management	Transaction Management & Alerts	2	What alert is generated in the Order Flow when certain parameters change?	Only tax rate change alert	Alert when FX rate changes or fee override occurs	Alert for every market open	Alert for all corporate actions	B	multiple_choice	FX and fee changes trigger supervisory alerts.	2025-10-30 06:35:14.937615
159	Order Management	Transaction Management & Alerts	2	Who are listed as actors/entitlements for Order Flow?	Head of Compliance, CFO	Relationship Manager, Branch Teller	Broker, Custodian	Client, Regulator	B	multiple_choice	RM and Branch Teller are authorized order initiators.	2025-10-30 06:35:14.937615
160	Order Management	Transaction Management & Alerts	1	What are key outputs of the Order Flow process useful to a BA?	Orders, Trades, Position	Only cash ledger	Only issuer ratings	Only trade confirmations	A	multiple_choice	Order flow produces comprehensive trading data.	2025-10-30 06:35:14.937615
161	Order Management	Advanced Validations & Partial Confirmations	2	What specific time-in-force check applies to limit orders?	"Good till canceled" is mandatory	Error if "Good till day" is selected	Only IOC allowed	Only FOK allowed	B	multiple_choice	Good till day is restricted for limit orders.	2025-10-30 06:35:34.656996
162	Order Management	Advanced Validations & Partial Confirmations	1	Which market condition does OMS validate before order placement?	Only volatility bands	Market status (open/close)	Broker margin status	FX position limits	B	multiple_choice	Market must be open to accept orders.	2025-10-30 06:35:34.656996
163	Order Management	Advanced Validations & Partial Confirmations	2	Which validation ensures the order quantity aligns with permitted instrument settings?	Minimum customer lot size only	Security Trade Multiple validation	Fee override validation	FX haircut validation	B	multiple_choice	Trade multiples enforce instrument-specific quantity rules.	2025-10-30 06:35:34.656996
164	Order Management	Advanced Validations & Partial Confirmations	2	Which pre-trade validation ensures client-specific size thresholds are respected?	Corporate action block	Minimum customer lot size validation	Broker settlement calendar	Market-wide price bands	B	multiple_choice	Minimum lot size is client and instrument specific.	2025-10-30 06:35:34.656996
165	Order Management	Advanced Validations & Partial Confirmations	2	Within the Order Management System, which process name corresponds to holdings/trade reconciliation?	OMS Order Routing	OMS Trade/Holding Reconciliation	OMS Maintenance	OMS Pricing	B	multiple_choice	Dedicated reconciliation process manages holdings verification.	2025-10-30 06:35:34.656996
166	Order Management	Advanced Validations & Partial Confirmations	2	Partial confirmations typically do NOT apply to which order type?	Redemption	Switch	Subscription	Switch-out	C	multiple_choice	Subscriptions usually confirm in full or reject completely.	2025-10-30 06:35:34.656996
167	Order Management	Advanced Validations & Partial Confirmations	2	In partial confirmations accepted during reconciliation, what is the status progression for the modified order?	Pending → Failed	Contracted → Settled	Draft → Approved	Held → Released	B	multiple_choice	Confirmed portion follows normal settlement workflow.	2025-10-30 06:35:34.656996
168	Order Management	Advanced Validations & Partial Confirmations	3	In amount-based partial confirmations, how are units determined for the accepted portion?	Based on indicative NAV used while placing the order	Based on live market NAV at settlement	Based on broker quotes only	Units remain the original estimate	A	multiple_choice	Indicative NAV at order time determines unit allocation.	2025-10-30 06:35:34.656996
169	Order Management	Advanced Validations & Partial Confirmations	3	In partial confirmations, what happens to the "new order" representing the unconfirmed portion?	It becomes Settled	It is marked Rejected and not used to update transaction/holding masters	It remains Pending indefinitely	It auto-splits further	B	multiple_choice	Rejected portion does not update holdings or transactions.	2025-10-30 06:35:34.656996
170	Order Management	Advanced Validations & Partial Confirmations	2	During order capture, what pricing flexibility does OMS provide for indicative prices?	Locks indicative price permanently	Allows modification to real-time price if desired	Only allows broker-driven prices	Disables all price edits	B	multiple_choice	Users can update prices to reflect current market conditions.	2025-10-30 06:35:34.656996
\.
COPY public.quiz_attempts (id, thread_id, total_questions, correct_answers, score_percentage, time_spent, created_at, topic, category, points_earned) FROM stdin;
2	\N	10	6	60	\N	2025-10-30 07:50:13.012956	Order Flow Fundamentals	Order Management	60
3	\N	10	7	70	\N	2025-10-30 08:18:39.204116	Order Flow Fundamentals	Order Management	70
4	\N	10	7	70	\N	2025-10-30 08:20:57.688852	Partial Confirmations & Status	Order Management	70
5	\N	10	1	10	\N	2025-10-31 07:09:30.832359	Order Capture & Document Validation	Order Management	10
6	\N	10	5	50	\N	2025-12-15 08:32:03.772973	Order Flow Fundamentals	Order Management	50
\.
COPY public.quiz_responses (id, attempt_id, question_text, user_answer, correct_answer, is_correct, topic, created_at) FROM stdin;
\.
COPY public.user_mastery (id, overall_score, current_level, quiz_performance_score, topic_coverage_score, retention_score, topics_mastered, total_quizzes_taken, updated_at, total_cumulative_points) FROM stdin;
1	43	Intermediate	260	0	0	2	5	2025-12-15 08:32:03.97	260
\.
COPY public.ba_knowledge_questions (id, category, question, is_active, created_at) FROM stdin;
1	Product Overview	What are the core modules of the WealthForce platform and how do they interact?	f	2025-12-17 11:07:01.710924
2	Product Overview	Which user personas are supported and what are their primary workflows?	f	2025-12-17 11:07:01.948013
3	Product Overview	What key business problems does the product solve for wealth managers and advisors?	f	2025-12-17 11:07:02.182558
4	Product Overview	What asset classes and investment products are supported end to end?	f	2025-12-17 11:07:02.530147
5	Product Overview	What are the major product limitations or exclusions we should know?	f	2025-12-17 11:07:02.763233
6	Customer Lifecycle	How does the client onboarding journey flow from lead to funded account?	f	2025-12-17 11:07:02.999312
7	Customer Lifecycle	What are the steps and approvals in the KYC/AML process?	f	2025-12-17 11:07:03.233992
8	Customer Lifecycle	How are client consent and document signatures captured and stored?	f	2025-12-17 11:07:03.468905
9	Customer Lifecycle	How does the system manage updates to client profiles and periodic reviews?	f	2025-12-17 11:07:03.702183
10	Customer Lifecycle	How does offboarding or account closure work and what data is retained?	f	2025-12-17 11:07:03.936669
11	Accounts & Profiles	What account types are supported (individual, joint, HUF, corporate, trust)?	f	2025-12-17 11:07:04.171882
12	Accounts & Profiles	How are risk profiles captured, scored, and versioned over time?	f	2025-12-17 11:07:04.410652
13	Accounts & Profiles	How are investment goals modeled and linked to portfolios?	f	2025-12-17 11:07:04.681721
14	Accounts & Profiles	How are beneficiaries and nominees managed?	f	2025-12-17 11:07:04.984852
15	Accounts & Profiles	How are fees, tax status, and residency attributes stored and applied?	f	2025-12-17 11:07:05.293241
16	Orders & Transactions	What is the full order lifecycle from placement to settlement?	f	2025-12-17 11:07:05.60034
17	Orders & Transactions	How does the system handle SIP, SWP, and STP scheduling and failures?	f	2025-12-17 11:07:05.90875
18	Orders & Transactions	How are NAV cutoffs, pricing dates, and holidays handled?	f	2025-12-17 11:07:06.21568
19	Orders & Transactions	How are corporate actions (dividends, splits) reflected in holdings?	f	2025-12-17 11:07:06.521697
20	Orders & Transactions	What reconciliation steps exist for failed or reversed transactions?	f	2025-12-17 11:07:07.058413
21	Portfolio & Advisory	How does portfolio construction and rebalancing work?	f	2025-12-17 11:07:07.292874
22	Portfolio & Advisory	What suitability checks are enforced before recommendations?	f	2025-12-17 11:07:07.527008
23	Portfolio & Advisory	How are model portfolios defined and customized per client?	f	2025-12-17 11:07:07.761261
24	Portfolio & Advisory	How are advisory notes and rationale stored alongside recommendations?	f	2025-12-17 11:07:07.995729
25	Portfolio & Advisory	How does the system track performance vs benchmark?	f	2025-12-17 11:07:08.230067
26	Reporting & Analytics	What standard client reports are available out of the box?	f	2025-12-17 11:07:08.463284
27	Reporting & Analytics	How are performance metrics (IRR, XIRR, TWR) calculated?	f	2025-12-17 11:07:08.697648
28	Reporting & Analytics	What analytics are available for RM productivity and pipeline?	f	2025-12-17 11:07:09.04121
29	Reporting & Analytics	How does the system generate regulatory or tax reports?	f	2025-12-17 11:07:09.275909
30	Reporting & Analytics	What report scheduling and distribution options exist?	f	2025-12-17 11:07:09.59035
31	Compliance & Risk	What regulatory rules (SEBI, AMFI, FINRA) are encoded in the product?	f	2025-12-17 11:07:09.894129
63	Compliance & Risk	How are compliance breaches detected, logged, and escalated?	f	2025-12-17 11:07:44.273866
64	Compliance & Risk	What audit trails are maintained for advisory and order actions?	f	2025-12-17 11:07:44.512235
65	Compliance & Risk	How are conflict-of-interest checks handled?	f	2025-12-17 11:07:44.823396
66	Compliance & Risk	How are risk limits and concentration constraints enforced?	f	2025-12-17 11:07:45.060611
67	Data & Integrations	What core integrations exist (custodian, AMC, market data, CRM)?	f	2025-12-17 11:07:45.299437
68	Data & Integrations	What APIs are exposed for third-party integrations?	f	2025-12-17 11:07:45.543559
69	Data & Integrations	How is data synchronized and what is the refresh frequency?	f	2025-12-17 11:07:45.7818
70	Data & Integrations	How are master data changes governed and versioned?	f	2025-12-17 11:07:46.018917
71	Data & Integrations	What is the data model for holdings, transactions, and valuations?	f	2025-12-17 11:07:46.256103
72	Operations & Support	What operational dashboards exist for exception handling?	f	2025-12-17 11:07:46.494688
73	Operations & Support	How are service requests and tickets tracked?	f	2025-12-17 11:07:46.731864
74	Operations & Support	What batch jobs run daily and what are their SLAs?	f	2025-12-17 11:07:46.969056
75	Operations & Support	How are errors, retries, and compensating actions managed?	f	2025-12-17 11:07:47.206261
76	Operations & Support	What is the process for release management and feature toggles?	f	2025-12-17 11:07:47.444861
77	Security & Access	What authentication mechanisms are supported (SSO, MFA)?	f	2025-12-17 11:07:47.685426
78	Security & Access	How is role-based access control structured across teams?	f	2025-12-17 11:07:47.94928
79	Security & Access	How is sensitive data encrypted at rest and in transit?	f	2025-12-17 11:07:48.192149
80	Security & Access	What data retention and deletion policies are implemented?	f	2025-12-17 11:07:48.429276
81	Security & Access	How are privileged actions logged and reviewed?	f	2025-12-17 11:07:48.666364
121	Product Features	What are the main features provided by the direct equity unit balance display in the wealth management system?	f	2025-12-17 11:54:51.776712
122	Product Features	How does the unrealized gain/loss calculation work in the direct equity security currency for wealth management?	f	2025-12-17 11:54:52.028251
123	Risk Management	What methods are employed to assess cloud infrastructure risks in wealth management?	f	2025-12-17 11:54:52.269621
124	Risk Management	How does the organization manage defects & security vulnerabilities within its wealth management system?	f	2025-12-17 11:54:52.512156
125	Investment Strategies	What types of model portfolios are maintained for wealth management?	f	2025-12-17 11:54:52.754474
126	Investment Strategies	How is risk appetite mapped in developing wealth management strategies?	f	2025-12-17 11:54:52.997025
127	Client Onboarding	What are the key steps involved in the customer onboarding process via the wealth management system?	f	2025-12-17 11:54:53.238386
128	Client Onboarding	What types of client category questionnaires are used during wealth management onboarding?	f	2025-12-17 11:54:53.480687
129	Fee Structure	How is the fee structure determined for asset management within the wealth management system?	f	2025-12-17 11:54:53.722449
130	Fee Structure	What fees are associated with advisory services in wealth management?	f	2025-12-17 11:54:53.963607
131	Performance Tracking	What metrics are used to track the performance of direct equity holdings in wealth management?	f	2025-12-17 11:54:54.205995
132	Performance Tracking	How is the weighted average cost of direct equity tracked and displayed in wealth management?	f	2025-12-17 11:54:54.448862
133	Regulatory Compliance	How does the compliance risk management framework operate within wealth management?	f	2025-12-17 11:54:54.690453
134	Regulatory Compliance	What procedures are in place for monitoring regulatory compliance risks for wealth management products?	f	2025-12-17 11:54:54.932464
135	Technology Integration	How does the wealth management system handle integrations with external trading platforms?	f	2025-12-17 11:54:55.175336
136	Technology Integration	What is the process for capturing trade data executed outside the wealth management system?	f	2025-12-17 11:54:55.417482
137	Customer Service	How are customer inquiries and service requests managed within the wealth management portal?	f	2025-12-17 11:54:55.659636
138	Customer Service	What are the methods for managing customer service management risks in wealth management?	f	2025-12-17 11:54:55.900947
139	Market Trends	What impact do market currency fluctuations have on wealth management decisions?	f	2025-12-17 11:54:56.142709
140	Market Trends	How are global tax regimes affecting the wealth management market?	f	2025-12-17 11:54:56.386417
141	Competitive Analysis	What are the key factors considered in the competitive analysis for the wealth management industry?	f	2025-12-17 11:54:56.627447
142	Competitive Analysis	How does the wealth management product distinguish itself from similar offerings by competitors?	f	2025-12-17 11:54:56.869721
143	Portfolio Diversification	How is portfolio diversification achieved in wealth management strategies?	f	2025-12-17 11:54:57.114214
144	Portfolio Diversification	What role do alternative investments play in the diversification of wealth management portfolios?	f	2025-12-17 11:54:57.356832
145	Product Features	How does the realized gain/loss data display assist clients in wealth management decision-making?	f	2025-12-17 11:54:57.599562
146	Product Features	What detailed view options are provided for wealth management account summaries?	f	2025-12-17 11:54:57.842064
147	Risk Management	What strategies are implemented for mitigating liquidity risks in wealth management?	f	2025-12-17 11:54:58.086441
148	Risk Management	How does the BELIEF framework support enterprise risk management in wealth management?	f	2025-12-17 11:54:58.328128
149	Investment Strategies	What is the role of the risk profile questionnaire in shaping client investment strategies?	f	2025-12-17 11:54:58.570517
150	Investment Strategies	How do personal investment objectives influence wealth management strategies for clients?	f	2025-12-17 11:54:58.812228
151	Client Onboarding	What systems are used to validate client identities during the onboarding process in wealth management?	f	2025-12-17 11:54:59.053487
152	Client Onboarding	What steps are involved in creating customer management profiles within the wealth management system?	f	2025-12-17 11:54:59.297837
153	Fee Structure	What are the industry standards for performance fees in private wealth management?	f	2025-12-17 11:54:59.539717
154	Fee Structure	How are custody and administration fees calculated in wealth management?	f	2025-12-17 11:54:59.78184
155	Performance Tracking	What tools are available for clients to view the performance of their investment accounts in wealth management?	f	2025-12-17 11:55:00.023661
156	Performance Tracking	How is investment account performance evaluated against benchmark indices in wealth management?	f	2025-12-17 11:55:00.267378
157	Regulatory Compliance	What compliance checks are integrated into the wealth management processes?	f	2025-12-17 11:55:00.50838
158	Regulatory Compliance	How are changes in regulatory environments incorporated into the risk management strategies?	f	2025-12-17 11:55:00.749632
159	Technology Integration	What is the onboarding process for new technology partners in the wealth management ecosystem?	f	2025-12-17 11:55:00.990866
160	Technology Integration	How is secure data transmission ensured in external platform integrations for wealth management?	f	2025-12-17 11:55:01.233389
161	Customer Service	What processes are in place to measure customer satisfaction in wealth management services?	f	2025-12-17 11:55:01.475948
162	Customer Service	How do customer service dashboards contribute to effective wealth management operations?	f	2025-12-17 11:55:01.718399
163	Market Trends	How do social and economic risks influence wealth management strategies?	f	2025-12-17 11:55:01.962476
164	Market Trends	What competitive risks are most prevalent in the wealth management sector?	f	2025-12-17 11:55:02.206771
165	Competitive Analysis	How does the wealth management product address the needs of high-net-worth individuals?	f	2025-12-17 11:55:02.453065
166	Competitive Analysis	What are the primary competitive advantages of the current wealth management system?	f	2025-12-17 11:55:02.75895
167	Portfolio Diversification	What is the process for reassessing portfolio allocations in response to market changes?	f	2025-12-17 11:55:03.001512
168	Portfolio Diversification	How often is asset rebalancing recommended within wealth management portfolios?	f	2025-12-17 11:55:03.24287
169	Platform Vision & Value	Which business outcomes drive investment in this wealth platform?	t	2025-12-17 19:57:01.989283
170	Platform Vision & Value	How does the platform improve RM productivity and operating risk?	t	2025-12-17 19:57:02.236919
171	Functional Modules	How are RM dashboards, tools, and 360° portfolio views organized?	t	2025-12-17 19:57:02.474689
172	Functional Modules	How do model portfolios connect investments, execution, and reporting modules?	t	2025-12-17 19:57:02.723982
173	User Journeys	How does the journey differ for RM portal versus client portal orders?	t	2025-12-17 19:57:02.95978
174	User Journeys	What are the stages from order placement through settlement status updates?	t	2025-12-17 19:57:03.196957
175	Client Onboarding & KYC	How do KYC and account masters gate downstream investment actions?	t	2025-12-17 19:57:03.444242
176	Client Onboarding & KYC	How are joint accounts represented across base, account, and portfolio structures?	t	2025-12-17 19:57:03.680841
177	Suitability & Recommendations	How is model recommendation tuned by risk, goals, and AUM?	t	2025-12-17 19:57:03.91652
178	Suitability & Recommendations	How do suitability thresholds affect model visibility and ranking outcomes?	t	2025-12-17 19:57:04.154878
179	Portfolio Construction	How is a model decomposed into weighted underlying security orders?	t	2025-12-17 19:57:04.39229
180	Portfolio Construction	How are minimum investments and multiples enforced after allocation?	t	2025-12-17 19:57:04.62844
181	Rebalancing	What triggers rebalancing, and who can initiate it?	t	2025-12-17 19:57:04.86712
182	Rebalancing	How does client opt-in for auto-rebalance change execution controls?	t	2025-12-17 19:57:05.104533
183	Orders & Transactions	How does one model order generate many client-level orders?	t	2025-12-17 19:57:05.341663
184	Orders & Transactions	How are Lumpsum, SIP, and SWP handled differently in validations?	t	2025-12-17 19:57:05.57772
185	Order Lifecycle	How do cut-off rules alter NAV date and client communication?	t	2025-12-17 19:57:05.814593
186	Order Lifecycle	How is the model order unique ID created, used, and expired?	t	2025-12-17 19:57:06.050374
187	Payments & Settlement	How does payment routing differ between consolidated and security-level debits?	t	2025-12-17 19:57:06.286837
188	Payments & Settlement	How do payment retries work across retries, grace windows, and references?	t	2025-12-17 19:57:06.526482
189	Data Model & Entities	How do customer, account, portfolio, model, and holdings relate end-to-end?	t	2025-12-17 19:57:06.761547
190	Data Model & Entities	How do portfolio architecture types handle goals and folios differently?	t	2025-12-17 19:57:06.997826
191	Data Model & Entities	How is a goal-linked portfolio represented when folios are absent?	t	2025-12-17 19:57:07.346802
192	Business Rules & Validations	Which fields are mandatory, and how is missing data handled?	t	2025-12-17 19:57:07.584665
193	Business Rules & Validations	How does model status and channel eligibility prevent invalid orders?	t	2025-12-17 19:57:07.819918
194	Business Rules & Validations	How are lock-in and ELSS restrictions enforced during redemption or switch?	t	2025-12-17 19:57:08.062323
195	Workflow & Approvals	How is maker-checker approval configured at order versus SIP setup?	t	2025-12-17 19:57:08.298242
196	Workflow & Approvals	How do multi-level approvals affect turnaround time and audit readiness?	t	2025-12-17 19:57:08.534531
197	Exception Handling & Overrides	How are soft-stop warnings versus hard-stop blocks configured and justified?	t	2025-12-17 19:57:08.772031
198	Exception Handling & Overrides	How are common error cases surfaced to users and operations teams?	t	2025-12-17 19:57:09.011755
199	Integrations & APIs	Which services orchestrate model order initiation, consent, and payment updates?	t	2025-12-17 19:57:09.247859
200	Integrations & APIs	How does reverse feed from execution processors update settlement statuses?	t	2025-12-17 19:57:09.48481
201	Integrations & APIs	How are adapters chosen between API, files, and database connectors?	t	2025-12-17 19:57:09.720347
202	External Dependencies	Which upstream dependencies must be ready before placing model orders?	t	2025-12-17 19:57:09.956064
203	External Dependencies	How do RTA/BSE STAR integrations shape order routing and confirmations?	t	2025-12-17 19:57:10.192611
204	Security & Identity	How do SSO, OAuth tokens, and RBAC combine across channels?	t	2025-12-17 19:57:10.427929
205	Security & Identity	How is least-privilege enforced across services, databases, and admin consoles?	t	2025-12-17 19:57:10.665495
206	Security & Identity	How does segregation-of-duties prevent toxic permission combinations?	t	2025-12-17 19:57:10.902588
207	Audit & Logging	Which events are audited for immutability across orders, payments, and access?	t	2025-12-17 19:57:11.139652
208	Audit & Logging	How are PII and credentials masked in logs and reports?	t	2025-12-17 19:57:11.3767
209	Compliance & Regulatory	How are SEBI nominee changes reflected in workflows and validations?	t	2025-12-17 19:57:11.616466
210	Compliance & Regulatory	How do retention and purging policies align with regulatory timelines?	t	2025-12-17 19:57:11.852565
211	Operations & Monitoring	How are runbooks structured for incidents, scaling, access, and backups?	t	2025-12-17 19:57:12.088407
212	Operations & Monitoring	How is service dependency mapping used for impact analysis during outages?	t	2025-12-17 19:57:12.324231
213	Scalability & Performance	How do microservices scale independently under variable order volumes?	t	2025-12-17 19:57:12.561797
214	Scalability & Performance	How do CQRS, sharding, or partitioning decisions affect reporting latency?	t	2025-12-17 19:57:12.797548
215	Configurability & Extensibility	Which platform behaviors are configurable without code changes, and why?	t	2025-12-17 19:57:13.033302
216	Configurability & Extensibility	How are API versions managed to avoid breaking external integrations?	t	2025-12-17 19:57:13.269467
217	Risks & Edge Cases	What happens when unique IDs expire mid-journey or payments fail?	t	2025-12-17 19:57:13.505966
218	Risks & Edge Cases	Which assumptions about data granularity and reconciliation create delivery risk?	t	2025-12-17 19:57:13.741755
\.
