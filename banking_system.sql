--
-- PostgreSQL database dump
--

\restrict JtX1eDEHGKQyEEtzYJSJmHGLV1csbrIgm5eT0hfZMGmTxf4cPMZ8xnFxwmK0NTL

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-09-23 14:29:19

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

--
-- TOC entry 224 (class 1259 OID 16412)
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account (
    account_id integer NOT NULL,
    account_holder_id integer NOT NULL,
    branch_id integer NOT NULL,
    account_number character varying(30) NOT NULL,
    account_type character varying(30) NOT NULL,
    balance numeric(15,2) DEFAULT 0.00,
    opening_date date DEFAULT CURRENT_DATE,
    status character varying(20) DEFAULT 'active'::character varying,
    CONSTRAINT chk_account_balance CHECK ((balance >= (0)::numeric)),
    CONSTRAINT chk_account_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'blocked'::character varying, 'closed'::character varying])::text[]))),
    CONSTRAINT chk_account_type CHECK (((account_type)::text = ANY ((ARRAY['savings'::character varying, 'current'::character varying, 'business'::character varying])::text[])))
);


ALTER TABLE public.account OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16411)
-- Name: account_account_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.account ALTER COLUMN account_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.account_account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 220 (class 1259 OID 16390)
-- Name: account_holder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_holder (
    account_holder_id integer NOT NULL,
    account_holder_name character varying(150) NOT NULL,
    email character varying(150),
    phone character varying(20),
    date_of_birth date,
    occupation character varying(100),
    address character varying(255)
);


ALTER TABLE public.account_holder OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16389)
-- Name: account_holder_account_holder_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.account_holder ALTER COLUMN account_holder_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.account_holder_account_holder_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 230 (class 1259 OID 16479)
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    log_id integer NOT NULL,
    employee_id integer NOT NULL,
    action_type character varying(50) NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id integer,
    action_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    description text
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16478)
-- Name: audit_log_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_log ALTER COLUMN log_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.audit_log_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 234 (class 1259 OID 16508)
-- Name: bank_transaction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_transaction (
    transaction_id integer CONSTRAINT transaction_transaction_id_not_null NOT NULL,
    account_id integer CONSTRAINT transaction_account_id_not_null NOT NULL,
    merchant_id integer,
    transaction_type character varying(30) CONSTRAINT transaction_transaction_type_not_null NOT NULL,
    amount numeric(15,2) CONSTRAINT transaction_amount_not_null NOT NULL,
    transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'completed'::character varying,
    CONSTRAINT chk_transaction_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT chk_transaction_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'reversed'::character varying])::text[]))),
    CONSTRAINT chk_transaction_type CHECK (((transaction_type)::text = ANY ((ARRAY['deposit'::character varying, 'withdrawal'::character varying, 'transfer'::character varying, 'payment'::character varying, 'purchase'::character varying])::text[])))
);


ALTER TABLE public.bank_transaction OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16402)
-- Name: branch; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.branch (
    branch_id integer NOT NULL,
    branch_name character varying(150) NOT NULL,
    city character varying(100),
    address character varying(255),
    phone character varying(20)
);


ALTER TABLE public.branch OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16401)
-- Name: branch_branch_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.branch ALTER COLUMN branch_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.branch_branch_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 228 (class 1259 OID 16456)
-- Name: card; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.card (
    card_id integer NOT NULL,
    account_id integer NOT NULL,
    card_number character varying(30) NOT NULL,
    card_type character varying(30) NOT NULL,
    issue_date date NOT NULL,
    expire_date date NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    CONSTRAINT chk_card_dates CHECK ((expire_date > issue_date)),
    CONSTRAINT chk_card_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'blocked'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT chk_card_type CHECK (((card_type)::text = ANY ((ARRAY['debit'::character varying, 'credit'::character varying])::text[])))
);


ALTER TABLE public.card OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16455)
-- Name: card_card_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.card ALTER COLUMN card_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.card_card_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 226 (class 1259 OID 16441)
-- Name: employee; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee (
    employee_id integer NOT NULL,
    branch_id integer NOT NULL,
    employee_name character varying(150) NOT NULL,
    designation character varying(100),
    hiring_date date,
    salary numeric(12,2),
    CONSTRAINT chk_employee_salary CHECK ((salary >= (0)::numeric))
);


ALTER TABLE public.employee OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16440)
-- Name: employee_employee_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.employee ALTER COLUMN employee_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.employee_employee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 238 (class 1259 OID 16546)
-- Name: fraud_alert; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fraud_alert (
    fraud_alert_id integer NOT NULL,
    transaction_id integer NOT NULL,
    fraud_rule_id integer NOT NULL,
    risk_score numeric(5,2),
    alert_reason text,
    detected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'open'::character varying,
    CONSTRAINT chk_fraud_alert_status CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'investigating'::character varying, 'confirmed'::character varying, 'false_positive'::character varying, 'resolved'::character varying])::text[]))),
    CONSTRAINT chk_risk_score CHECK (((risk_score >= (0)::numeric) AND (risk_score <= (100)::numeric)))
);


ALTER TABLE public.fraud_alert OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16545)
-- Name: fraud_alert_fraud_alert_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.fraud_alert ALTER COLUMN fraud_alert_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.fraud_alert_fraud_alert_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 236 (class 1259 OID 16533)
-- Name: fraud_rule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fraud_rule (
    fraud_rule_id integer NOT NULL,
    fraud_rule_name character varying(150) NOT NULL,
    description text,
    severity character varying(20) NOT NULL,
    threshold_value numeric(15,2),
    CONSTRAINT chk_fraud_rule_severity CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT chk_threshold_value CHECK ((threshold_value >= (0)::numeric))
);


ALTER TABLE public.fraud_rule OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16532)
-- Name: fraud_rule_fraud_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.fraud_rule ALTER COLUMN fraud_rule_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.fraud_rule_fraud_rule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 240 (class 1259 OID 16571)
-- Name: loan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loan (
    loan_id integer NOT NULL,
    account_holder_id integer NOT NULL,
    loan_type character varying(50) NOT NULL,
    principal_amount numeric(15,2) NOT NULL,
    interest_rate numeric(5,2) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    status character varying(20) DEFAULT 'active'::character varying,
    CONSTRAINT chk_loan_dates CHECK (((end_date IS NULL) OR (end_date > start_date))),
    CONSTRAINT chk_loan_interest CHECK ((interest_rate >= (0)::numeric)),
    CONSTRAINT chk_loan_principal CHECK ((principal_amount > (0)::numeric)),
    CONSTRAINT chk_loan_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'defaulted'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.loan OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16570)
-- Name: loan_loan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.loan ALTER COLUMN loan_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.loan_loan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 242 (class 1259 OID 16593)
-- Name: loan_payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loan_payment (
    payment_id integer NOT NULL,
    loan_id integer NOT NULL,
    payment_amount numeric(15,2) NOT NULL,
    payment_date date DEFAULT CURRENT_DATE,
    payment_status character varying(20) DEFAULT 'paid'::character varying,
    CONSTRAINT chk_loan_payment_amount CHECK ((payment_amount > (0)::numeric)),
    CONSTRAINT chk_loan_payment_status CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying, 'late'::character varying])::text[])))
);


ALTER TABLE public.loan_payment OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16592)
-- Name: loan_payment_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.loan_payment ALTER COLUMN payment_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.loan_payment_payment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 232 (class 1259 OID 16497)
-- Name: merchant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.merchant (
    merchant_id integer NOT NULL,
    merchant_name character varying(150) NOT NULL,
    category character varying(100),
    city character varying(100),
    risk_level character varying(20) DEFAULT 'low'::character varying,
    contact_number character varying(20),
    registration_date date DEFAULT CURRENT_DATE,
    CONSTRAINT chk_merchant_risk CHECK (((risk_level)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[])))
);


ALTER TABLE public.merchant OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16496)
-- Name: merchant_merchant_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.merchant ALTER COLUMN merchant_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.merchant_merchant_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 233 (class 1259 OID 16507)
-- Name: transaction_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.bank_transaction ALTER COLUMN transaction_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.transaction_transaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 5092 (class 0 OID 16412)
-- Dependencies: 224
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account (account_id, account_holder_id, branch_id, account_number, account_type, balance, opening_date, status) FROM stdin;
1	1	1	100100001	savings	150000.00	2021-01-10	active
2	2	2	100200001	current	850000.00	2019-05-15	active
3	3	2	100200002	savings	220000.00	2022-03-20	active
4	4	1	100100002	current	450000.00	2020-07-12	active
5	5	3	100300001	savings	95000.00	2023-01-05	active
6	6	4	100400001	business	1200000.00	2018-11-25	active
7	7	5	100500001	savings	175000.00	2021-09-18	active
8	8	2	100200003	current	600000.00	2020-02-28	blocked
\.


--
-- TOC entry 5088 (class 0 OID 16390)
-- Dependencies: 220
-- Data for Name: account_holder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_holder (account_holder_id, account_holder_name, email, phone, date_of_birth, occupation, address) FROM stdin;
2	Karim Hasan	karim@gmail.com	01822222222	1988-08-20	Businessman	Gulshan, Dhaka
3	Nusrat Jahan	nusrat@gmail.com	01933333333	1997-02-15	Teacher	Uttara, Dhaka
4	Tanvir Hossain	tanvir@gmail.com	01644444444	1992-11-10	Accountant	Mirpur, Dhaka
5	Sadia Rahman	sadia@gmail.com	01555555555	1999-07-25	Student	Chittagong
6	Fahim Chowdhury	fahim@gmail.com	01366666666	1985-03-18	Entrepreneur	Sylhet
7	Mim Akter	mim@gmail.com	01477777777	1996-09-30	Doctor	Rajshahi
8	Arif Khan	arif@gmail.com	01788888888	1990-12-05	Manager	Banani, Dhaka
1	Rahim Ahmed	rahim@gmail.com	01711111111	1995-05-06	Software Engineer	Dhanmondi, Dhaka
\.


--
-- TOC entry 5098 (class 0 OID 16479)
-- Dependencies: 230
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (log_id, employee_id, action_type, table_name, record_id, action_time, description) FROM stdin;
1	1	CREATE	account	1	2026-08-01 09:00:00	Created new customer account.
2	2	UPDATE	account	4	2026-08-05 10:15:00	Updated account information.
3	3	BLOCK	account	8	2026-08-16 23:50:00	Account blocked due to suspicious activity.
4	4	REVIEW	fraud_alert	1	2026-08-05 15:00:00	Reviewed high-value transaction alert.
5	5	REVIEW	fraud_alert	6	2026-08-14 04:00:00	Reviewed high-risk merchant transaction.
6	6	UPDATE	loan	2	2026-08-10 11:30:00	Updated business loan information.
7	7	CREATE	loan_payment	15	2026-08-25 14:00:00	Loan payment recorded.
8	8	BLOCK	card	8	2026-08-17 02:00:00	Card blocked after suspicious transaction detected.
\.


--
-- TOC entry 5102 (class 0 OID 16508)
-- Dependencies: 234
-- Data for Name: bank_transaction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_transaction (transaction_id, account_id, merchant_id, transaction_type, amount, transaction_date, status) FROM stdin;
1	1	1	purchase	2500.00	2026-08-01 10:15:00	completed
2	1	2	purchase	4500.00	2026-08-02 18:20:00	completed
3	1	3	purchase	1800.00	2026-08-03 20:10:00	completed
4	1	\N	deposit	50000.00	2026-08-05 09:30:00	completed
5	2	4	purchase	750000.00	2026-08-05 14:25:00	completed
6	2	1	purchase	12500.00	2026-08-06 16:45:00	completed
7	2	6	purchase	320000.00	2026-08-07 11:30:00	completed
8	2	\N	withdrawal	250000.00	2026-08-08 12:15:00	completed
9	3	1	purchase	5500.00	2026-08-08 10:00:00	completed
10	3	3	purchase	2200.00	2026-08-09 19:10:00	completed
11	3	\N	transfer	25000.00	2026-08-10 13:20:00	completed
12	4	2	purchase	6500.00	2026-08-10 17:45:00	completed
13	4	4	purchase	550000.00	2026-08-11 22:30:00	completed
14	4	\N	withdrawal	300000.00	2026-08-12 09:15:00	completed
15	5	3	purchase	1800.00	2026-08-12 20:30:00	completed
16	5	1	purchase	3200.00	2026-08-13 12:10:00	completed
17	6	6	purchase	450000.00	2026-08-13 15:20:00	completed
18	6	7	transfer	750000.00	2026-08-14 02:15:00	completed
19	6	\N	withdrawal	400000.00	2026-08-14 03:10:00	completed
20	7	2	purchase	3500.00	2026-08-15 16:30:00	completed
21	7	3	purchase	2100.00	2026-08-16 19:20:00	completed
22	8	5	purchase	900000.00	2026-08-16 23:45:00	completed
23	8	7	transfer	250000.00	2026-08-17 01:15:00	completed
\.


--
-- TOC entry 5090 (class 0 OID 16402)
-- Dependencies: 222
-- Data for Name: branch; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branch (branch_id, branch_name, city, address, phone) FROM stdin;
1	Dhaka Main Branch	Dhaka	Motijheel, Dhaka	02-9551001
2	Gulshan Branch	Dhaka	Gulshan-1, Dhaka	02-9882001
3	Chittagong Branch	Chittagong	Agrabad, Chittagong	031-721001
4	Sylhet Branch	Sylhet	Zindabazar, Sylhet	0821-711001
5	Rajshahi Branch	Rajshahi	Shaheb Bazar, Rajshahi	0721-811001
\.


--
-- TOC entry 5096 (class 0 OID 16456)
-- Dependencies: 228
-- Data for Name: card; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.card (card_id, account_id, card_number, card_type, issue_date, expire_date, status) FROM stdin;
1	1	453200000001	debit	2021-01-15	2026-01-15	expired
2	2	453200000002	credit	2019-06-01	2027-06-01	active
3	3	453200000003	debit	2022-04-01	2027-04-01	active
4	4	453200000004	credit	2020-08-01	2026-08-01	expired
5	5	453200000005	debit	2023-02-01	2028-02-01	active
6	6	453200000006	credit	2019-01-10	2027-01-10	active
7	7	453200000007	debit	2021-10-01	2026-10-01	active
8	8	453200000008	credit	2020-03-15	2027-03-15	blocked
\.


--
-- TOC entry 5094 (class 0 OID 16441)
-- Dependencies: 226
-- Data for Name: employee; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee (employee_id, branch_id, employee_name, designation, hiring_date, salary) FROM stdin;
1	1	Mahmud Islam	Branch Manager	2018-01-15	85000.00
2	1	Rashed Karim	Bank Officer	2020-06-10	55000.00
3	2	Shamim Ahmed	Branch Manager	2017-03-20	90000.00
4	2	Jannatul Ferdous	Bank Officer	2021-02-05	52000.00
5	3	Imran Hossain	Branch Manager	2019-08-12	80000.00
6	3	Nadia Sultana	Bank Officer	2022-01-10	48000.00
7	4	Sabbir Rahman	Branch Manager	2016-05-18	82000.00
8	5	Tareq Hasan	Branch Manager	2020-09-01	78000.00
\.


--
-- TOC entry 5106 (class 0 OID 16546)
-- Dependencies: 238
-- Data for Name: fraud_alert; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fraud_alert (fraud_alert_id, transaction_id, fraud_rule_id, risk_score, alert_reason, detected_at, status) FROM stdin;
1	5	1	88.50	Transaction amount exceeds the high-value threshold.	2026-08-05 14:26:00	open
2	7	1	76.00	Large purchase detected above the configured threshold.	2026-08-07 11:31:00	investigating
3	8	4	82.00	Large withdrawal detected from the account.	2026-08-08 12:16:00	open
4	13	1	84.50	Transaction amount exceeds the high-value threshold.	2026-08-11 22:31:00	investigating
5	14	4	91.00	Unusually large withdrawal detected.	2026-08-12 09:16:00	open
6	18	3	95.00	Transaction involves a high-risk merchant.	2026-08-14 02:16:00	confirmed
7	18	6	97.00	Large transfer involving a high-risk financial service.	2026-08-14 02:17:00	confirmed
8	19	4	89.00	Large withdrawal detected shortly after another suspicious transaction.	2026-08-14 03:11:00	open
9	22	5	99.00	Transaction detected from a blocked account.	2026-08-16 23:46:00	confirmed
10	23	6	96.00	Large transfer involving a high-risk financial service.	2026-08-17 01:16:00	open
11	17	1	23.00	fdsfd	2026-09-23 00:25:26.12241	confirmed
\.


--
-- TOC entry 5104 (class 0 OID 16533)
-- Dependencies: 236
-- Data for Name: fraud_rule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fraud_rule (fraud_rule_id, fraud_rule_name, description, severity, threshold_value) FROM stdin;
1	High Value Transaction	Transaction amount exceeds the defined high-value threshold.	high	500000.00
2	Rapid Multiple Transactions	Multiple transactions occur within a short period of time.	medium	3.00
3	High Risk Merchant	Transaction is made with a merchant classified as high risk.	high	0.00
4	Unusual Large Withdrawal	Large withdrawal detected from an account.	high	200000.00
5	Blocked Account Transaction	Transaction attempted from an account that is blocked.	critical	0.00
6	Suspicious International Transfer	Large or unusual transfer involving a high-risk financial service.	critical	100000.00
\.


--
-- TOC entry 5108 (class 0 OID 16571)
-- Dependencies: 240
-- Data for Name: loan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loan (loan_id, account_holder_id, loan_type, principal_amount, interest_rate, start_date, end_date, status) FROM stdin;
1	1	Personal Loan	300000.00	9.50	2024-01-15	2027-01-15	active
2	2	Business Loan	2500000.00	8.75	2023-06-01	2028-06-01	active
3	3	Education Loan	500000.00	7.50	2024-09-01	2027-09-01	active
4	4	Home Loan	5000000.00	7.25	2022-03-15	2032-03-15	active
5	5	Personal Loan	200000.00	10.00	2025-01-10	2027-01-10	active
6	6	Business Loan	3500000.00	8.50	2021-05-20	2029-05-20	active
7	7	Education Loan	750000.00	7.75	2023-08-15	2028-08-15	completed
8	8	Personal Loan	400000.00	11.00	2024-04-10	2027-04-10	defaulted
\.


--
-- TOC entry 5110 (class 0 OID 16593)
-- Dependencies: 242
-- Data for Name: loan_payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loan_payment (payment_id, loan_id, payment_amount, payment_date, payment_status) FROM stdin;
1	1	15000.00	2026-06-10	paid
2	1	15000.00	2026-07-10	paid
3	1	15000.00	2026-08-10	paid
4	2	75000.00	2026-06-05	paid
5	2	75000.00	2026-07-05	paid
6	2	75000.00	2026-08-05	paid
7	3	18000.00	2026-06-15	paid
8	3	18000.00	2026-07-15	paid
9	4	60000.00	2026-06-20	paid
10	4	60000.00	2026-07-20	paid
11	4	60000.00	2026-08-20	paid
12	5	10000.00	2026-06-10	paid
13	5	10000.00	2026-07-10	paid
14	6	95000.00	2026-06-25	paid
15	6	95000.00	2026-07-25	paid
16	6	95000.00	2026-08-25	paid
17	7	25000.00	2026-06-15	paid
18	7	25000.00	2026-07-15	paid
19	8	5000.00	2026-06-10	late
20	8	5000.00	2026-07-10	failed
\.


--
-- TOC entry 5100 (class 0 OID 16497)
-- Dependencies: 232
-- Data for Name: merchant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.merchant (merchant_id, merchant_name, category, city, risk_level, contact_number, registration_date) FROM stdin;
1	Daraz Bangladesh	E-commerce	Dhaka	low	09612345678	2026-09-22
2	Shwapno Super Shop	Grocery	Dhaka	low	09611111111	2026-09-22
3	Star Kabab	Restaurant	Dhaka	low	01712345678	2026-09-22
4	Tech World BD	Electronics	Dhaka	medium	01812345678	2026-09-22
5	ABC Casino Online	Gambling	Unknown	high	01912345678	2026-09-22
6	Global Electronics	Electronics	Chittagong	medium	01612345678	2026-09-22
7	International Money Transfer	Financial Service	Dhaka	high	01512345678	2026-09-20
\.


--
-- TOC entry 5116 (class 0 OID 0)
-- Dependencies: 223
-- Name: account_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.account_account_id_seq', 8, true);


--
-- TOC entry 5117 (class 0 OID 0)
-- Dependencies: 219
-- Name: account_holder_account_holder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.account_holder_account_holder_id_seq', 13, true);


--
-- TOC entry 5118 (class 0 OID 0)
-- Dependencies: 229
-- Name: audit_log_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_log_log_id_seq', 8, true);


--
-- TOC entry 5119 (class 0 OID 0)
-- Dependencies: 221
-- Name: branch_branch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.branch_branch_id_seq', 6, true);


--
-- TOC entry 5120 (class 0 OID 0)
-- Dependencies: 227
-- Name: card_card_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.card_card_id_seq', 9, true);


--
-- TOC entry 5121 (class 0 OID 0)
-- Dependencies: 225
-- Name: employee_employee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employee_employee_id_seq', 9, true);


--
-- TOC entry 5122 (class 0 OID 0)
-- Dependencies: 237
-- Name: fraud_alert_fraud_alert_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fraud_alert_fraud_alert_id_seq', 11, true);


--
-- TOC entry 5123 (class 0 OID 0)
-- Dependencies: 235
-- Name: fraud_rule_fraud_rule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fraud_rule_fraud_rule_id_seq', 7, true);


--
-- TOC entry 5124 (class 0 OID 0)
-- Dependencies: 239
-- Name: loan_loan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loan_loan_id_seq', 9, true);


--
-- TOC entry 5125 (class 0 OID 0)
-- Dependencies: 241
-- Name: loan_payment_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loan_payment_payment_id_seq', 20, true);


--
-- TOC entry 5126 (class 0 OID 0)
-- Dependencies: 231
-- Name: merchant_merchant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.merchant_merchant_id_seq', 8, true);


--
-- TOC entry 5127 (class 0 OID 0)
-- Dependencies: 233
-- Name: transaction_transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transaction_transaction_id_seq', 23, true);


--
-- TOC entry 4906 (class 2606 OID 16429)
-- Name: account account_account_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_account_number_key UNIQUE (account_number);


--
-- TOC entry 4900 (class 2606 OID 16400)
-- Name: account_holder account_holder_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_holder
    ADD CONSTRAINT account_holder_email_key UNIQUE (email);


--
-- TOC entry 4902 (class 2606 OID 16398)
-- Name: account_holder account_holder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_holder
    ADD CONSTRAINT account_holder_pkey PRIMARY KEY (account_holder_id);


--
-- TOC entry 4908 (class 2606 OID 16427)
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (account_id);


--
-- TOC entry 4916 (class 2606 OID 16490)
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (log_id);


--
-- TOC entry 4904 (class 2606 OID 16410)
-- Name: branch branch_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch
    ADD CONSTRAINT branch_pkey PRIMARY KEY (branch_id);


--
-- TOC entry 4912 (class 2606 OID 16472)
-- Name: card card_card_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_card_number_key UNIQUE (card_number);


--
-- TOC entry 4914 (class 2606 OID 16470)
-- Name: card card_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT card_pkey PRIMARY KEY (card_id);


--
-- TOC entry 4910 (class 2606 OID 16449)
-- Name: employee employee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_pkey PRIMARY KEY (employee_id);


--
-- TOC entry 4924 (class 2606 OID 16559)
-- Name: fraud_alert fraud_alert_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fraud_alert
    ADD CONSTRAINT fraud_alert_pkey PRIMARY KEY (fraud_alert_id);


--
-- TOC entry 4922 (class 2606 OID 16544)
-- Name: fraud_rule fraud_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fraud_rule
    ADD CONSTRAINT fraud_rule_pkey PRIMARY KEY (fraud_rule_id);


--
-- TOC entry 4928 (class 2606 OID 16604)
-- Name: loan_payment loan_payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_payment
    ADD CONSTRAINT loan_payment_pkey PRIMARY KEY (payment_id);


--
-- TOC entry 4926 (class 2606 OID 16586)
-- Name: loan loan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan
    ADD CONSTRAINT loan_pkey PRIMARY KEY (loan_id);


--
-- TOC entry 4918 (class 2606 OID 16506)
-- Name: merchant merchant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant
    ADD CONSTRAINT merchant_pkey PRIMARY KEY (merchant_id);


--
-- TOC entry 4920 (class 2606 OID 16521)
-- Name: bank_transaction transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_transaction
    ADD CONSTRAINT transaction_pkey PRIMARY KEY (transaction_id);


--
-- TOC entry 4929 (class 2606 OID 16435)
-- Name: account fk_account_branch; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT fk_account_branch FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id);


--
-- TOC entry 4930 (class 2606 OID 16430)
-- Name: account fk_account_holder; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT fk_account_holder FOREIGN KEY (account_holder_id) REFERENCES public.account_holder(account_holder_id);


--
-- TOC entry 4933 (class 2606 OID 16491)
-- Name: audit_log fk_audit_employee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT fk_audit_employee FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id);


--
-- TOC entry 4932 (class 2606 OID 16473)
-- Name: card fk_card_account; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.card
    ADD CONSTRAINT fk_card_account FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE;


--
-- TOC entry 4931 (class 2606 OID 16450)
-- Name: employee fk_employee_branch; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT fk_employee_branch FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id);


--
-- TOC entry 4936 (class 2606 OID 16565)
-- Name: fraud_alert fk_fraud_alert_rule; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fraud_alert
    ADD CONSTRAINT fk_fraud_alert_rule FOREIGN KEY (fraud_rule_id) REFERENCES public.fraud_rule(fraud_rule_id);


--
-- TOC entry 4937 (class 2606 OID 16560)
-- Name: fraud_alert fk_fraud_alert_transaction; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fraud_alert
    ADD CONSTRAINT fk_fraud_alert_transaction FOREIGN KEY (transaction_id) REFERENCES public.bank_transaction(transaction_id) ON DELETE CASCADE;


--
-- TOC entry 4938 (class 2606 OID 16587)
-- Name: loan fk_loan_account_holder; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan
    ADD CONSTRAINT fk_loan_account_holder FOREIGN KEY (account_holder_id) REFERENCES public.account_holder(account_holder_id);


--
-- TOC entry 4939 (class 2606 OID 16605)
-- Name: loan_payment fk_loan_payment_loan; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_payment
    ADD CONSTRAINT fk_loan_payment_loan FOREIGN KEY (loan_id) REFERENCES public.loan(loan_id) ON DELETE CASCADE;


--
-- TOC entry 4934 (class 2606 OID 16522)
-- Name: bank_transaction fk_transaction_account; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_transaction
    ADD CONSTRAINT fk_transaction_account FOREIGN KEY (account_id) REFERENCES public.account(account_id);


--
-- TOC entry 4935 (class 2606 OID 16527)
-- Name: bank_transaction fk_transaction_merchant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_transaction
    ADD CONSTRAINT fk_transaction_merchant FOREIGN KEY (merchant_id) REFERENCES public.merchant(merchant_id);


-- Completed on 2026-09-23 14:29:19

--
-- PostgreSQL database dump complete
--

\unrestrict JtX1eDEHGKQyEEtzYJSJmHGLV1csbrIgm5eT0hfZMGmTxf4cPMZ8xnFxwmK0NTL

