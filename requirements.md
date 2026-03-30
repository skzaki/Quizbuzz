# Quiz Platform Project Documentation

## 1. Project Overview

This project is a full-stack online quiz and contest management platform designed for two main user groups: participants and administrators. It supports contest discovery, secure joining, live quiz participation, automatic answer saving, result evaluation, certificate access, payment handling, and a full-featured admin dashboard for operational control. [file:1]

The platform combines standard REST APIs for transactional operations with Socket.IO-based real-time communication for waiting room management, live quiz transitions, and progress recovery. This makes the system suitable for scheduled or manually started contests where reliability, fairness, and responsiveness are important. [file:1]

---

## 2. Main Objectives

The project aims to provide the following capabilities: [file:1]

- Allow participants to browse and join contests.
- Support secure authentication using JWT and OTP-based flows.
- Enable a waiting-room-based live contest experience.
- Save quiz progress continuously during the contest.
- Evaluate submissions asynchronously using a background worker.
- Provide result pages and certificate access after contest completion.
- Offer an admin dashboard for contest, question, payment, and analytics management.
- Maintain system performance using Redis caching and BullMQ queue processing. [file:1]

---

## 3. High-Level Architecture

The system is divided into four major layers: [file:1]

1. Frontend application built with React and Vite.
2. Backend API built with Node.js and Express.
3. Real-time communication layer built with Socket.IO.
4. Data and processing layer using MongoDB, Redis, and BullMQ workers. [file:1]

At a high level, the frontend handles user interaction and navigation, the backend manages validation and business logic, Socket.IO handles real-time events, MongoDB stores persistent records, Redis stores fast temporary state, and the worker service evaluates quiz submissions in the background. [file:1]

---

## 4. Frontend Architecture

### 4.1 Technology Stack

The frontend stack includes: [file:1]

- React (Vite)
- Tailwind CSS
- React Router
- Socket.IO client [file:1]

### 4.2 Routing Structure

The application has two primary route groups: participant routes and admin routes. [file:1]

#### Participant routes

- `/` → Landing page showing available contests. [file:1]
- `/login` → Login page using OTP-based authentication. [file:1]
- `/contest/join` → Contest join form using registration ID and contest credentials. [file:1]
- `/contest/waiting-room` → Waiting room where users stay until the quiz begins. [file:1]
- `/contest/live/:contestId` → Live contest page for answering questions. [file:1]
- `/contest/result/:submissionId` → Final result page after evaluation. [file:1]
- `/contest/result/evaluate/:submissionId` → Evaluation/thank-you screen before final result. [file:1]

#### Admin routes

These routes are protected by an admin authorization layer. [file:1]

- `/admin` → Dashboard home. [file:1]
- `/admin/contests` → Contest management page. [file:1]
- `/admin/contests/:id` → Contest detail page. [file:1]
- `/admin/questions` → Question bank management page. [file:1]
- `/admin/payments` → Payment management page. [file:1]
- `/admin/analytics` → Analytics and reporting page. [file:1]

### 4.3 Frontend Context System

The frontend uses shared context for global app state: [file:1]

- `AuthContext` stores the JWT token and user identity, including whether the user is an admin or a participant. [file:1]
- `ThemeContext` stores the current theme mode and allows dark/light toggle behavior across the UI. [file:1]

### 4.4 Frontend Service Modules

The frontend defines helper service files to isolate specialized logic: [file:1]

- `contestApi.js` handles API calls related to contest submission and polling evaluation status. [file:1]
- `paymentService.js` handles Razorpay payment interactions. [file:1]
- `faceMonitor.js` supports webcam-based monitoring during live contests for exam integrity. [file:1]

---

## 5. Participant Workflow

The participant journey follows a structured sequence from contest discovery to result viewing. [file:1]

### Step 1: Discover contests

A user lands on the homepage and sees a list of available contests. [file:1]

### Step 2: Join contest

The user navigates to `/contest/join` and enters a registration ID and contest credentials. The backend validates these details and returns a JWT token on success. [file:1]

### Step 3: Enter waiting room

The user enters the waiting room page, where the frontend establishes a Socket.IO connection and joins a waiting room named using a `waiting-{contestId}` convention. [file:1]

### Step 4: Quiz start event

When the contest starts, either by schedule or manual admin action, the server emits a `quiz-started` event. The user is then redirected to the live contest page. [file:1]

### Step 5: Live quiz and progress saving

During the contest, the frontend emits `save-progress` events whenever the current question changes or answers are updated. This ensures progress is preserved even if the user disconnects. [file:1]

### Step 6: Submit answers

Once the user finishes the contest, the frontend makes a REST API call to submit the quiz responses. [file:1]

### Step 7: Evaluation screen

After submission, the user is redirected to an evaluation/thank-you page while the backend processes the submission asynchronously. [file:1]

### Step 8: Result page

After evaluation completes, the user is shown the final result page with score and performance details. [file:1]

---

## 6. Backend Architecture

### 6.1 Technology Stack

The backend stack includes: [file:1]

- Node.js
- Express
- Socket.IO
- BullMQ
- JWT
- Zod validation [file:1]

### 6.2 Entry Point

The backend entry file creates the HTTP server, attaches the Socket.IO server at `/ws/`, connects to MongoDB, and timestamps logs in IST. [file:1]

### 6.3 Middleware Stack

The Express application uses the following middleware: [file:1]

- `helmet` for security headers. [file:1]
- `cors` for controlled cross-origin access, including allowed frontend origins. [file:1]
- `compression` for gzip response compression. [file:1]
- `morgan` for request logging. [file:1]
- Rate limiting for abuse prevention. [file:1]

### 6.4 API Route Groups

The backend is divided into four main route groups: [file:1]

- `/api/auth` → Login and OTP operations. [file:1]
- `/api/contests` → Participant-facing contest operations. [file:1]
- `/api/admin/contests` → Admin CRUD and contest management operations. [file:1]
- `/api/payments` → Payment processing and Razorpay webhooks. [file:1]

---

## 7. Authentication and Session Design

The authentication layer uses JWT plus Redis-backed session validation for stronger security. [file:1]

### Authentication flow

1. `POST /api/auth/login` validates credentials and returns a JWT. [file:1]
2. `POST /api/auth/send-otp` sends an OTP to phone or email. [file:1]
3. `POST /api/auth/verify-otp` verifies the OTP and activates the session. [file:1]

### Session model

Each JWT includes: [file:1]

- `userId`
- `sessionId` [file:1]

For every protected request, the backend: [file:1]

- Verifies the JWT.
- Looks up the session in Redis.
- Checks the request IP address.
- Checks the request User-Agent.
- Rejects the request if session or client details do not match. [file:1]

This layered model reduces the chance of unauthorized token reuse. [file:1]

---

## 8. Contest APIs

### Participant contest endpoints

The participant-side contest routes include: [file:1]

- `POST /validate-credentials` → Validate contest entry credentials. [file:1]
- `GET /:slug/questions` → Return contest questions without answers. [file:1]
- `POST /:slug/submit` → Save answers and queue evaluation. [file:1]
- `GET /:submissionId/status` → Return evaluation status. [file:1]
- `GET /:submissionId/results` → Return evaluated results. [file:1]
- `GET /:slug/certificate` → Return certificate URL. [file:1]

### Admin contest endpoints

The admin contest routes are protected by both authentication and admin authorization middleware. They provide full CRUD, question assignment, bulk operations, and statistics. [file:1]

---

## 9. Real-Time Architecture with Socket.IO

The project uses Socket.IO for waiting room activity, quiz start signaling, progress persistence, and reconnection handling. [file:1]

### Supported events

- `join-waiting-room` → Client joins the contest lobby. [file:1]
- `quiz-started` → Server notifies participants the contest is live. [file:1]
- `save-progress` → Client sends current answers and question state. [file:1]
- `heartbeat` → Client updates activity and current question position. [file:1]
- `resume-quiz` → Server restores saved state after reconnection. [file:1]
- `leave-waiting-room` → Client exits the waiting room. [file:1]
- `get-room-status` → Admin requests participant room metrics. [file:1]
- `disconnect` → System marks disconnect but retains progress in Redis. [file:1]

### Room model

The server uses room naming patterns such as: [file:1]

- `waiting-{contestId}` for users waiting for the contest to begin. [file:1]
- `quiz-{contestId}` for users actively taking the contest. [file:1]

### Scheduled start

When users enter a waiting room before the contest starts, the backend can register a `setTimeout` so the server automatically emits `quiz-started` at the scheduled time. Manual override by an admin is also supported. [file:1]

---

## 10. Database Design

The system uses MongoDB for persistent records and Redis for temporary and performance-critical state. [file:1]

### 10.1 MongoDB Collections

#### `User`
Stores participant details such as name, email, phone, college, and registration ID. [file:1]

#### `Admin`
Stores admin account details including email and password. [file:1]

#### `Contest`
Stores contest information such as title, slug, start time, deadline, registration fee, prize details, rules, and topics. [file:1]

#### `Question`
Stores question bank items including question text, options, correct answer data, difficulty, hint, and explanation. [file:1]

#### `Payment`
Stores Razorpay payment details including order ID, payment ID, status, and amount. [file:1]

#### `Submission`
Stores submitted answers, score, and evaluation status. [file:1]

#### `Session`
Stores active session metadata such as session ID, user ID, IP, User-Agent, and last activity. [file:1]

#### `Certificate`
Stores certificate URLs linked to user and contest. [file:1]

### 10.2 Relationships

- A `Contest` references many `Question` records through a question bank array. [file:1]
- A `Contest` references many participants. [file:1]
- A `Submission` belongs to one user and one contest. [file:1]
- A `Payment` belongs to one user and one contest. [file:1]
- A `Certificate` belongs to one user and one contest. [file:1]
- A `Session` belongs to one user. [file:1]

### 10.3 Slug generation

Contest slugs are generated automatically from the title using a slugify process in a pre-validation hook. [file:1]

---

## 11. Redis Usage

Redis is used for fast, temporary, and frequently accessed data. [file:1]

### 11.1 Session store

Key format: `session:{sessionId}` [file:1]

This stores the active session object for fast authentication checks. [file:1]

### 11.2 Live quiz state

Key format: `contest:{slug}:user:{userId}` [file:1]

This stores the participant’s current question index and answers so the session can resume after a disconnect. [file:1]

### 11.3 Correct answers cache

Key format: `contest:{slug}:correct_answers` [file:1]

This stores the answer key for a contest and is cached for 24 hours to reduce repeated database lookups during evaluation. [file:1]

### 11.4 Submission status cache

Key format: `submission:{id}:status` [file:1]

This stores evaluated result data for a short period so frontend polling can read status quickly. The file states this cache is kept for 1 hour after processing. [file:1]

---

## 12. Evaluation Worker

The platform uses a separate worker service running as a different Docker container for evaluation processing. This worker is powered by BullMQ and uses Redis as the queue backend. [file:1]

### Evaluation flow

1. A participant submits answers. [file:1]
2. The backend stores the raw submission in MongoDB. [file:1]
3. The backend adds a job to the `contest-evaluation` queue. [file:1]
4. The worker picks up jobs with up to 10 concurrent workers. [file:1]
5. The worker retrieves the submission from MongoDB. [file:1]
6. The worker fetches the correct answers from Redis, or MongoDB if needed. [file:1]
7. The worker evaluates each answer. [file:1]
8. The worker updates the submission with score and `evaluated` status. [file:1]
9. The worker caches result status in Redis. [file:1]
10. The worker removes the user’s temporary in-progress quiz state from Redis. [file:1]

### Scoring logic

The documented scoring logic is: [file:1]

- Correct answer: `+1` [file:1]
- Wrong answer: `-0.I studied the attached project file and created a **detailed Markdown documentation draft** you can save as something like `PROJECT_DOCUMENTATION.md`. The document below is based on the architecture, workflow, routes, admin design blueprint, backend flow, database flow, and deployment notes contained in your file. [file:1]

# Quiz Platform Project Documentation [file:1]

## Project overview

This project is a full-stack online quiz and contest platform built for two main user groups: participants and administrators. Participants can discover contests, join securely, wait for the live quiz to start, take the quiz in real time, and view evaluated results, while administrators can manage contests, questions, payments, analytics, and live contest operations through a dedicated admin dashboard. [file:1]

The architecture combines a React frontend, a Node.js and Express backend, Socket.IO for real-time communication, MongoDB for persistent storage, Redis for fast temporary state, and BullMQ for background evaluation jobs. This combination allows the platform to support live quiz behavior, secure authentication, scalable evaluation, and recoverable quiz sessions. [file:1]

## Objectives

The main goal of the project is to provide a secure, real-time, manageable online contest and quiz system. The platform is designed to reduce manual work, improve participant experience, support admin control, and maintain system reliability during timed assessments. [file:1]

Core objectives include: [file:1]

- Provide a clean participant journey from contest discovery to result viewing. [file:1]
- Support admin-controlled contest creation, editing, publishing, and monitoring. [file:1]
- Enable real-time quiz start and progress saving using sockets. [file:1]
- Prevent progress loss during connection interruptions through Redis-backed state recovery. [file:1]
- Process submissions asynchronously through a queue-based evaluation worker. [file:1]
- Offer payment handling and reporting support through Razorpay integration. [file:1]

## Technology stack

The frontend uses React with Vite, Tailwind CSS, React Router, and the Socket.IO client. The backend uses Node.js, Express, Socket.IO, JWT authentication, Zod validation, and BullMQ. Data is stored using MongoDB and Redis, and the worker runs separately for evaluation processing. [file:1]

### Frontend stack

- React (Vite) for the user interface and app structure. [file:1]
- Tailwind CSS for styling. [file:1]
- React Router for navigation and protected routes. [file:1]
- Socket.IO client for waiting room events, quiz start events, and progress updates. [file:1]

### Backend stack

- Node.js and Express for API handling and server logic. [file:1]
- Socket.IO for real-time communication. [file:1]
- BullMQ for background job processing. [file:1]
- JWT for token-based authentication. [file:1]
- Zod for request validation. [file:1]

### Data and infrastructure

- MongoDB for users, contests, questions, submissions, sessions, payments, and certificates. [file:1]
- Redis for session lookup, live quiz state, answer cache, and submission status cache. [file:1]
- Docker-based deployment with a separate worker service and an Nginx-served frontend build. [file:1]

## System architecture

The project follows a layered architecture where the frontend handles presentation and user interactions, the backend manages business logic and security, Redis handles short-lived fast-access state, MongoDB stores permanent records, and the worker processes evaluations in the background. [file:1]

At a high level, the system contains these major layers: [file:1]

1. Participant frontend flow. [file:1]
2. Admin dashboard flow. [file:1]
3. REST API and authentication layer. [file:1]
4. Real-time communication layer with Socket.IO. [file:1]
5. Database and caching layer with MongoDB and Redis. [file:1]
6. Background evaluation worker using BullMQ. [file:1]

## Frontend architecture

The frontend is divided into participant routes and admin routes. Participant routes support the contest lifecycle, while admin routes provide management features protected by an admin guard. [file:1]

### Participant routes

The user-facing route structure includes the following pages: [file:1]

- `/` → Landing page showing available contests. [file:1]
- `/login` → Login page with OTP-based authentication support. [file:1]
- `/contest/join` → Page to enter registration ID and contest credentials. [file:1]
- `/contest/waiting-room` → Lobby page where users wait for the quiz to begin. [file:1]
- `/contest/live/:contestId` → Live contest page. [file:1]
- `/contest/result/:submissionId` → Final result page after evaluation. [file:1]
- `/contest/result/evaluate/:submissionId` → Intermediate evaluation or thank-you page while results are being processed. [file:1]

### Admin routes

The admin section is protected by `AdminRoute` and includes management pages for core operations. These routes include: [file:1]

- `/admin` → Dashboard overview. [file:1]
- `/admin/contests` → Contest management list page. [file:1]
- `/admin/contests/:id` → Contest detail page. [file:1]
- `/admin/questions` → Question bank management. [file:1]
- `/admin/payments` → Payment management. [file:1]
- `/admin/analytics` → Analytics and reporting. [file:1]

### Frontend shared contexts

The frontend uses shared context providers to manage app-wide state. `AuthContext` stores JWT tokens and user role information, while `ThemeContext` manages dark and light theme behavior. [file:1]

### Frontend service files

The file describes several service-level modules used by the frontend: [file:1]

- `contestApi.js` handles REST operations such as contest submission and result polling. [file:1]
- `paymentService.js` manages Razorpay payment integration. [file:1]
- `faceMonitor.js` supports webcam-based face monitoring during live contests for integrity checks. [file:1]

## Participant workflow

The participant workflow is designed as a guided sequence from discovery to evaluation. The process is real-time where needed and request-response based where appropriate. [file:1]

### Step-by-step participant flow

1. The user opens the landing page and sees available contests. [file:1]
2. The user navigates to the join page and enters registration ID and contest credentials. [file:1]
3. The backend validates the participant and returns a JWT token. [file:1]
4. The user enters the waiting room and connects through Socket.IO to a waiting room channel such as `waiting-{contestId}`. [file:1]
5. When the contest starts, the server emits a `quiz-started` event and the user is redirected to the live quiz page. [file:1]
6. As the user moves between questions, the frontend sends `save-progress` events so progress is stored continuously. [file:1]
7. On completion, the frontend submits answers through a REST API call to `/api/contests/:slug/submit`. [file:1]
8. The user is redirected to an evaluation screen while the submission is processed. [file:1]
9. After evaluation completes, the user is redirected to the final result page. [file:1]

### Why REST and sockets are both used

The file clearly distinguishes between one-time operations and live operations. REST API calls are used for tasks like login, fetching questions, final submission, and result retrieval, while Socket.IO is used for real-time waiting room communication, live start events, heartbeat tracking, reconnect handling, and progress preservation. [file:1]

## Backend architecture

The backend acts as the main processing layer of the platform. It starts the HTTP server, attaches Socket.IO, connects to MongoDB, applies middleware, and exposes grouped API routes. [file:1]

### Entry point

The main server entry point performs these functions: [file:1]

- Creates an HTTP server from the Express app. [file:1]
- Attaches a Socket.IO server at `/ws/`. [file:1]
- Connects to MongoDB. [file:1]
- Uses IST timestamped logging. [file:1]

### Middleware stack

The Express application applies a middleware chain for security, compatibility, optimization, and visibility. The file lists the following middleware: [file:1]

- `helmet` for security headers. [file:1]
- `cors` to allow configured frontend origins such as the production domain and localhost. [file:1]
- `compression` for gzip-compressed responses. [file:1]
- `morgan` for HTTP request logging. [file:1]
- Rate limiting for abuse prevention. [file:1]

### API route groups

The backend is split into four major route groups: [file:1]

- `/api/auth` for login, OTP sending, OTP verification, and resend flow. [file:1]
- `/api/contests` for participant operations like validation, fetching questions, submission, result polling, and certificates. [file:1]
- `/api/admin/contests` for admin CRUD operations and contest administration. [file:1]
- `/api/payments` for payment processing and Razorpay webhook handling. [file:1]

## Authentication and session model

Authentication in this project uses layered verification rather than relying only on a token. JWT identifies the user and session, while Redis-backed session validation enforces stronger control. [file:1]

### Authentication flow

The documented authentication sequence includes: [file:1]

1. `POST /api/auth/login` validates credentials and returns a JWT. [file:1]
2. `POST /api/auth/send-otp` sends an OTP to the user. [file:1]
3. `POST /api/auth/verify-otp` verifies the OTP and activates the session. [file:1]

### Session security

Every token includes `userId` and `sessionId`, and `authMiddleware` performs multiple checks before allowing access. The backend verifies the JWT, retrieves the session from Redis, and compares the current IP address and User-Agent against the recorded session data; mismatches result in rejection. [file:1]

This design improves security by making stolen tokens less useful if they are replayed from a different device or location. Redis is used because session lookup must be fast on every authenticated request. [file:1]

## Contest APIs

The participant contest routes are responsible for joining, question retrieval, submission, and result status checks. The file defines these endpoints: [file:1]

- `POST /validate-credentials` → validates contest credentials and registration information. [file:1]
- `GET /:slug/questions` → returns quiz questions without exposing answers. [file:1]
- `POST /:slug/submit` → saves a submission and queues evaluation. [file:1]
- `GET /:submissionId/status` → returns current evaluation status. [file:1]
- `GET /:submissionId/results` → returns final evaluated results. [file:1]
- `GET /:slug/certificate` → returns certificate URL where applicable. [file:1]

Admin routes are protected with both authentication and admin authorization middleware, ensuring that only authenticated admins can create, edit, delete, and manage contest resources. [file:1]

## Real-time communication

Socket.IO powers the live behavior of the project. It manages participant waiting rooms, quiz starts, heartbeat tracking, quiz resumption after disconnects, and admin visibility into room activity. [file:1]

### Documented socket events

The architecture file lists these socket events: [file:1]

- `join-waiting-room` → client joins a contest waiting room. [file:1]
- `quiz-started` → server notifies users that the quiz has started. [file:1]
- `save-progress` → client sends current answers and question position. [file:1]
- `heartbeat` → client updates active state. [file:1]
- `resume-quiz` → server restores quiz state after reconnect. [file:1]
- `leave-waiting-room` → client exits the lobby before quiz start. [file:1]
- `get-room-status` → admin checks active participant counts. [file:1]
- `disconnect` → user disconnects but progress remains preserved. [file:1]

### Waiting room and scheduling logic

Users initially join rooms like `waiting-{contestId}`. When the contest start time arrives, or when the admin starts the contest manually, the server emits the start event and shifts users into a live quiz room such as `quiz-{contestId}`. The file also describes a scheduled start mechanism using `setTimeout` to trigger start events automatically if the contest has not yet begun. [file:1]

## Database design

The project uses MongoDB for permanent records and Redis for fast temporary state and cache management. The documentation in the file clearly separates these responsibilities. [file:1]

### MongoDB collections

The described MongoDB collections are: [file:1]

- `User` for participant profile data such as name, email, phone, college, and registration ID. [file:1]
- `Admin` for administrator account records. [file:1]
- `Contest` for contest metadata such as title, slug, time windows, fee, prizes, rules, and topics. [file:1]
- `Question` for question bank entries with options, answer, difficulty, hint, and explanation. [file:1]
- `Payment` for Razorpay payment records. [file:1]
- `Submission` for user answers, score, and evaluation status. [file:1]
- `Session` for active login sessions and device details. [file:1]
- `Certificate` for generated certificate URLs mapped to users and contests. [file:1]

### Collection relationships

The project establishes several relationships across entities: [file:1]

- A contest contains many questions through a question bank array of ObjectIds. [file:1]
- A contest contains many participants. [file:1]
- A submission belongs to one user and one contest. [file:1]
- A payment belongs to one user and one contest. [file:1]
- A certificate belongs to one user and one contest. [file:1]
- A session belongs to one user. [file:1]

### Slug generation

Contest slugs are automatically generated from the title using `slugify` in a pre-validation hook. This makes URLs more human-readable and avoids requiring manual slug entry. [file:1]

## Redis usage

Redis is used as the fast in-memory layer of the platform. The file identifies four key uses. [file:1]

### 1. Session store

Keys such as `session:{sessionId}` hold session data used for fast authentication checks. This allows each authenticated request to validate the session quickly. [file:1]

### 2. User quiz state

Keys such as `contest:{slug}:user:{userId}` hold in-progress quiz data including current question index and answers. This allows recovery after disconnection or browser interruption. [file:1]

### 3. Correct answers cache

Keys such as `contest:{slug}:correct_answers` cache the answer key for a contest, typically for 24 hours, so the evaluation worker can avoid repeated MongoDB lookups. [file:1]

### 4. Submission status cache

Keys such as `submission:{id}:status` store evaluated submission status and results temporarily so frontend polling can read quickly without heavy database access. [file:1]

## Evaluation worker

The project includes a separate worker service that consumes jobs from a BullMQ queue and evaluates submissions asynchronously. This keeps submission requests fast even under high load. [file:1]

### Worker flow

The documented worker process follows these steps: [file:1]

1. A participant submits answers. [file:1]
2. The backend stores the raw submission in MongoDB and pushes a job to the `contest-evaluation` queue. [file:1]
3. The worker picks the job, with support for up to 10 concurrent jobs. [file:1]
4. The worker fetches the submission from MongoDB. [file:1]
5. The worker gets correct answers from Redis, or falls back to MongoDB if needed. [file:1]
6. The worker scores each answer according to the marking rules. [file:1]
7. The worker updates MongoDB with the final score and status. [file:1]
8. The worker caches the result in Redis. [file:1]
9. The worker removes the user’s temporary in-progress state from Redis. [file:1]

### Marking rules

The scoring logic described in the file is: [file:1]

- Correct answer → `+1` point. [file:1]
- Wrong answer → `-0.25` point. [file:1]
- Skipped answer → `0` point. [file:1]

## Admin dashboard design blueprint

A major part of the file is a complete admin dashboard blueprint. This section defines the intended UI structure, interaction patterns, and route-based page organization for admin users. [file:1]

### Global admin design decisions

The documented UI decisions are: [file:1]

- Dark and light theme toggle support. [file:1]
- Sidebar plus top navbar layout. [file:1]
- Full-page multi-step contest create and edit wizard. [file:1]
- Contest list page with search, filters, sortable columns, pagination, bulk selection, row actions, and status badges. [file:1]
- Dashboard home with stats and charts. [file:1]
- Contest deletion confirmation by typing the contest name. [file:1]
- Toast notifications for feedback. [file:1]
- Contest status flow: Draft → Published → Ongoing → Completed. [file:1]

### Admin page map

The design blueprint defines the following admin pages: [file:1]

- `/admin` → Dashboard home with cards, charts, and recent contests. [file:1]
- `/admin/contests` → Contests list page. [file:1]
- `/admin/contests/create` → Create contest wizard. [file:1]
- `/admin/contests/:id` → Contest detail page. [file:1]
- `/admin/contests/:id/edit` → Edit contest wizard. [file:1]
- `/admin/questions` → Question bank page. [file:1]
- `/admin/payments` → Payment page. [file:1]
- `/admin/analytics` → Analytics page. [file:1]

### Layout shell

The shared admin layout contains a fixed sidebar and top navbar. The sidebar includes Dashboard, Contests, Questions, Payments, Analytics, Settings, Profile, and Logout zones in the design blueprint, while the top navbar includes search, notifications, theme toggle, and admin avatar controls. [file:1]

## Admin contest management

The contests module is one of the most fully specified parts of the project. It includes a list page, create/edit wizard, detail page, bulk operations, and live waiting room monitoring. [file:1]

### Contests list page

The list page is designed with: [file:1]

- Search by title. [file:1]
- Filter by contest status. [file:1]
- Sort controls. [file:1]
- Bulk actions. [file:1]
- Pagination. [file:1]
- Row-level actions such as edit, detail view, duplicate, and delete. [file:1]
- Status badges for Draft, Published, Ongoing, and Completed. [file:1]

### Contest create and edit wizard

The create/edit wizard is defined as a multi-step process with six steps: [file:1]

1. Basic info. [file:1]
2. Schedule. [file:1]
3. Rules and topics. [file:1]
4. Fee and prizes. [file:1]
5. Question assignment. [file:1]
6. Review and submit. [file:1]

The wizard includes slug preview, date/time inputs, topic tags, dynamic rules, registration fee settings, prize configuration, question search and bulk selection from the bank, assigned question ordering, and a final review stage before saving or publishing. [file:1]

### Contest detail page

The contest detail page is planned with multiple tabs: [file:1]

- Waiting Room. [file:1]
- Questions. [file:1]
- Submissions. [file:1]
- Leaderboard. [file:1]
- Logs. [file:1]
- Export. [file:1]

The waiting room tab is intended to show a real-time participant count using socket-based updates. The page also supports Start Now and Stop controls, question management, leaderboard preview, result export, and activity logs. [file:1]

## Question bank module

The Question Bank admin section is documented as a searchable, filterable question management area. It includes difficulty filtering, topic filtering, bulk selection, row actions, and a form or drawer for adding and editing questions. [file:1]

Each question record includes question text, topic, difficulty, four answer options, correct option, optional hint, and optional explanation. Bulk operations include adding selected questions to contests or deleting them. [file:1]

## Payments module

The payment section is planned to show Razorpay payment records with filtering and summary data. The file references payment stats, filters, payment tables, and export functionality as part of the UI implementation direction. [file:1]

The backend also includes payment-related routes and webhook handling through `/api/payments`, linking the frontend payment management area with actual transaction processing. [file:1]

## Analytics module

The analytics area is intended to present contest-level statistics and performance data. The design notes mention dashboard charts, contest status breakdown, revenue over time, participant trends, difficulty accuracy, topic performance, and performance tables. [file:1]

This suggests the platform is designed not only for quiz delivery but also for operational insights and decision support for admins. [file:1]

## Project folder and component conversion notes

The file includes a later implementation discussion about converting the design blueprint into actual React and Tailwind component files. It notes an existing frontend structure with page files and component folders for admin sections, plus new admin-specific layout files such as sidebar, top navbar, and admin layout wrappers. [file:1]

The implementation notes describe an approach of building new admin components in `src/components/admin/...` and wrapping admin routes with a new `AdminLayout`, while keeping participant routes intact. [file:1]

## Deployment and development workflow

The notes in the file indicate the project is deployed on a VPS, with the frontend served through Docker and Nginx. The recommended workflow for seeing UI changes is to edit code, commit changes, push to the chosen branch, rebuild the frontend container, and then refresh the deployed admin route in the browser. [file:1]

The file specifically describes a workflow using a project path on the VPS, branch-based Git usage, and `docker compose up -d --build frontend` to rebuild the frontend after changes. It also notes that admin pages are protected and may redirect to login first. [file:1]

## Key strengths of the project

Based on the file, the project has several strong architectural qualities: [file:1]

- Clear separation of participant and admin flows. [file:1]
- Real-time contest start and progress-saving design. [file:1]
- Resilient quiz-state recovery through Redis. [file:1]
- Layered security using JWT, Redis session lookup, IP verification, and User-Agent validation. [file:1]
- Scalable submission evaluation using BullMQ workers. [file:1]
- Well-defined admin dashboard information architecture. [file:1]
- Extensible modular frontend component strategy. [file:1]

## Limitations and implementation considerations

The file mostly captures architecture and planning rather than a fully verified code audit, so some elements represent intended design and implementation direction rather than confirmed final production behavior. For example, the admin UI blueprint is described in detail, and later portions discuss converting it into actual component files, indicating that some modules may still be in development or replacement stages. [file:1]

Because of this, any final technical report should distinguish between: implemented features, designed features, and in-progress features. That distinction will make the documentation more accurate for academic, client, or team handoff use. [file:1]

## Suggested document structure for final project report

If you want to turn this into a polished project report, a strong final structure would be: [file:1]

- Introduction. [file:1]
- Problem statement. [file:1]
- Objectives. [file:1]
- Technology stack. [file:1]
- System architecture. [file:1]
- Frontend workflow. [file:1]
- Backend workflow. [file:1]
- Database design. [file:1]
- Real-time communication flow. [file:1]
- Admin dashboard modules. [file:1]
- Security design. [file:1]
- Deployment workflow. [file:1]
- Strengths and future improvements. [file:1]

---
# Authentication and Role-Based Access Flow

## Overview

This project uses a **single login system** for both participants and administrators. Instead of creating two completely separate login pages, the application uses one shared login screen and one shared authentication process, then decides what the logged-in person is allowed to access based on their role.  

This approach keeps the user experience simple, reduces duplicated frontend code, and makes backend authentication easier to manage. At the same time, it still provides strong separation between normal participant access and privileged admin access.

---

## Why Use One Login Screen for Both?

Using the same login page for both user types has several advantages:

- It gives the application a cleaner and simpler entry point.
- It avoids maintaining separate login forms for users and admins.
- It keeps the authentication logic centralized.
- It makes role-based routing easier to control from one place.
- It allows the backend to decide permissions securely instead of relying on frontend assumptions.

In simple words, **everyone enters through the same door**, but once inside, the system checks who they are and sends them only to the rooms they are allowed to enter.

---

## Main Idea

The login page is shared, but access is not shared equally.

After login:

- A **participant/user** can access contest-related pages only.
- An **admin** can access both authenticated areas and protected admin management pages.
- The system identifies the role from backend data and stores it in the authentication state.

This means the login screen is common, but permissions are role-based.

---

## Authentication Flow

## Step 1: User opens the login page

Both participants and admins use the same route, for example:

```txt
/login
```

The screen can ask for credentials such as:

- Email or phone number
- Password, OTP, or both
- Any required verification details

The UI does not need separate "Admin Login" and "User Login" pages unless you want to add a small label or toggle for clarity.

---

## Step 2: Credentials are sent to the backend

When the user submits the login form, the frontend sends the entered credentials to the backend authentication API.

Example flow:

```txt
POST /api/auth/login
```

The backend checks:

- Whether the account exists
- Whether the password or OTP is valid
- Whether the account belongs to a participant or an admin
- Whether session creation is allowed

If valid, the backend creates an authenticated session.

---

## Step 3: Backend returns token and role information

After successful authentication, the backend returns:

- JWT token
- Session ID
- Basic user details
- Role information

Example response structure:

```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "123",
    "name": "Aman",
    "email": "aman@example.com",
    "role": "admin"
  },
  "sessionId": "session_abc123"
}
```

Or for a participant:

```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "456",
    "name": "Riya",
    "email": "riya@example.com",
    "role": "user"
  },
  "sessionId": "session_xyz789"
}
```

The key field here is:

```txt
role
```

This role decides what the person can access after login.

---

## Step 4: Frontend stores authentication state

The frontend stores the authentication data inside a shared authentication context or global state.

Usually it stores:

- JWT token
- User object
- Role
- Login status

Example stored state:

```js
{
  token: "jwt_token_here",
  user: {
    id: "123",
    name: "Aman",
    role: "admin"
  },
  isAuthenticated: true
}
```

Now the app knows:

- Is this person logged in?
- Are they an admin or normal user?

---

## Step 5: Redirect based on role

After login, the frontend checks the returned role and redirects the person to the correct area.

### If role is `user`

Redirect to participant area, such as:

```txt
/
```

or

```txt
/contest/join
```

depending on your desired user experience.

### If role is `admin`

Redirect to:

```txt
/admin
```

This gives the admin immediate access to the dashboard.

---

## Shared Login Screen Logic

A single login page can handle both roles using this simple logic:

```js
async function handleLogin(formData) {
  const response = await loginApi(formData);

  saveAuth(response.token, response.user);

  if (response.user.role === "admin") {
    navigate("/admin");
  } else {
    navigate("/");
  }
}
```

This is the core reason one login screen works well: the backend returns the role, and the frontend redirects accordingly.

---

## How Access Is Controlled

Sharing one login screen does **not** mean sharing all access.

The project must use **role-based access control** at two levels:

1. Frontend route protection
2. Backend API protection

Both are necessary.

---

## Frontend Route Protection

The frontend should protect pages using route guards.

### Public routes

Anyone can access:

- `/`
- `/login`
- `/contest/join` if public joining is allowed

### Authenticated user routes

Only logged-in users can access:

- `/contest/waiting-room`
- `/contest/live/:contestId`
- `/contest/result/:submissionId`

### Admin-only routes

Only admins can access:

- `/admin`
- `/admin/contests`
- `/admin/questions`
- `/admin/payments`
- `/admin/analytics`

This is usually done using a protected component such as:

```jsx
const AdminRoute = ({ children }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/login" replace />;
  return children;
};
```

This means:

- Logged-out users cannot enter admin pages.
- Logged-in normal users still cannot enter admin pages.
- Only admin role users are allowed.

---

## Backend API Protection

Frontend route protection improves the user experience, but true security must be enforced in the backend.

Even if a participant manually types:

```txt
/admin
```

or tries to call an admin API directly, the backend must block access.

### Example backend protection layers

For admin routes:

```txt
Request
→ authMiddleware
→ adminMiddleware
→ actual admin controller
```

### `authMiddleware` checks

- Is the JWT valid?
- Is the session still active?
- Does the session match the request metadata?

### `adminMiddleware` checks

- Does this authenticated account have admin role?
- If not, reject the request

This prevents privilege abuse even if someone tries to bypass the frontend.

---

## How the Same Login Works Internally

Even though the screen is the same, the backend determines the identity category.

There are two common approaches.

## Approach 1: Single auth collection with role field

One user collection stores everyone:

```json
{
  "name": "Aman",
  "email": "aman@example.com",
  "password": "hashed_password",
  "role": "admin"
}
```

and

```json
{
  "name": "Riya",
  "email": "riya@example.com",
  "password": "hashed_password",
  "role": "user"
}
```

### Advantages

- Easier login logic
- Easier token generation
- Easier role checks
- Cleaner authentication architecture

---

## Approach 2: Separate `User` and `Admin` collections

The project file suggests separate `User` and `Admin` records exist. In that case, the same login screen can still work.

Backend logic would do something like this:

1. Check admin collection first, or check both collections.
2. If found in admin collection and credentials match, return role `admin`.
3. Otherwise check user collection.
4. If found and valid, return role `user`.

Example backend pseudocode:

```js
async function login(email, password) {
  const admin = await Admin.findOne({ email });
  if (admin && comparePassword(password, admin.password)) {
    return buildLoginResponse(admin, "admin");
  }

  const user = await User.findOne({ email });
  if (user && comparePassword(password, user.password)) {
    return buildLoginResponse(user, "user");
  }

  throw new Error("Invalid credentials");
}
```

This still allows a shared login page because the role resolution happens in the backend.

---

## Recommended Login UX

For the best user experience, the shared login page can be designed like this:

### Common fields

- Email / phone / registration identifier
- Password or OTP
- Login button

### Optional helper text

You may show text such as:

```txt
Use your registered participant or admin credentials to sign in.
```

This keeps the screen clear without making two separate forms.

### Optional subtle role hint

You can add a small note:

```txt
Admins and participants both use this login.
```

This reduces confusion without changing the core flow.

---

## Role Information in Token

Once login succeeds, the JWT should contain enough information for authorization.

Typical token payload:

```json
{
  "userId": "123",
  "sessionId": "abc456",
  "role": "admin"
}
```

or

```json
{
  "userId": "789",
  "sessionId": "def999",
  "role": "user"
}
```

Why include role in the token?

- It helps the backend quickly identify access level
- It supports route and API authorization
- It reduces repeated database lookups for role checks

However, sensitive authorization should still be validated with session or database checks when necessary.

---

## Session Handling

The project uses JWT with session validation. This means login is not based only on token existence.

After login:

- A session is created
- Session ID is stored in Redis
- Token contains session ID
- Every authenticated request is checked against the session store

This improves security because:

- Expired or deleted sessions can be invalidated
- Stolen tokens become harder to reuse
- Device/IP/User-Agent mismatch checks can reject suspicious requests

This is especially important for admin accounts because they have elevated privileges.

---

## Participant Experience After Login

Once logged in as a normal participant, the person mainly uses the platform for contest participation.

### Typical participant journey

1. Login from shared login page
2. Redirect to contest area
3. Join a contest
4. Enter waiting room
5. Take quiz
6. Submit answers
7. View result
8. Download certificate if available

The participant does not see admin dashboard links, contest management controls, payment reports, or analytics panels.

---

## Admin Experience After Login

Once logged in as an admin, the person is redirected to the management dashboard.

### Typical admin journey

1. Login from shared login page
2. Redirect to `/admin`
3. View dashboard summary
4. Create or edit contests
5. Assign questions
6. Monitor waiting room activity
7. Start contests manually if needed
8. Check submissions and leaderboard
9. View payments
10. Review analytics

The admin has broader access because the role permits it.

---

## UI Difference After Login

Even though login is shared, the interface after login should change based on role.

### For users

Show:

- Contest list
- Join button
- Waiting room
- Live contest
- Results
- Certificates

Hide:

- Admin sidebar
- Question management
- Payment management
- Analytics
- Contest CRUD tools

### For admins

Show:

- Dashboard sidebar
- Contests management
- Question bank
- Payments
- Analytics
- Start/stop contest controls
- Export tools

This creates a clean role-specific experience.

---

## Example End-to-End Scenario

### Participant example

Riya opens `/login`, enters her registered credentials, and logs in. The backend identifies her as a normal participant, returns role `user`, and the frontend redirects her to the participant-facing pages. She can join a contest and view results, but if she tries to open `/admin`, she is blocked.

### Admin example

Aman opens the same `/login` page, enters admin credentials, and logs in. The backend identifies him as an admin, returns role `admin`, and the frontend redirects him to `/admin`. He can manage contests and analytics, but regular participants cannot access those pages.

This proves that one login page can still support two very different experiences.

---

## Security Rules

To make this design safe, the system should enforce these rules:

- Never trust frontend role checks alone.
- Always verify JWT and active session in the backend.
- Protect admin APIs with admin-specific middleware.
- Do not expose admin navigation to normal users.
- Redirect unauthorized access attempts away from protected pages.
- Log important authentication and admin actions.

---

## Best Architecture Recommendation

For this project, the best practical model is:

- One shared login page
- One authentication service
- One auth context in frontend
- Role returned from backend
- Route guards in frontend
- Role-based middleware in backend
- Shared token/session management
- Separate dashboards and permissions after login

This gives the simplicity of one login system with the safety of role-based separation.

---

## Conclusion

The user and admin can use the **same login screen** because authentication and authorization are two different things. Authentication checks **who the person is**, while authorization decides **what that person is allowed to access**.

In this project, both user and admin log in from the same page, but once authenticated, the backend returns their role, the frontend stores it, and the system gives each one a different experience. Participants get contest access, while admins get management access. This makes the platform easier to maintain, cleaner to use, and more secure when implemented with proper route guards and backend role checks.
---
# Razorpay Payment Integration

## Overview

This project supports paid contest registration using **Razorpay** as the payment gateway. The payment system is designed so that a participant can pay the contest registration fee before being allowed to complete contest enrollment, while administrators can monitor all payment activity from the admin dashboard. [file:1]

The architecture notes describe a dedicated frontend service named `paymentService.js` for Razorpay integration, a backend route group `/api/payments` for payment management and Razorpay webhooks, and a `Payment` collection in MongoDB that stores payment details such as `orderId`, `paymentId`, `status`, and `amount`. This means payment is treated as a first-class module in the system, not as an afterthought. [file:1]

---

## Why Razorpay is used

Razorpay is suitable for this platform because it provides a fast hosted checkout flow, server-side payment verification support, webhook events, and a clean way to track paid, pending, failed, and refunded payment states. The project’s admin dashboard also includes a Payments section specifically intended to display Razorpay payment records and payment status by user and contest. [file:1]

For this quiz platform, Razorpay is useful because some contests can have a registration fee stored in the `Contest` model, and the participant should only be treated as fully enrolled after payment succeeds for paid contests. The architecture file explicitly includes `registerFee` or registration fee details in contest data and payment management as a core admin feature. [file:1]

---

## Payment module role in the system

The payment module connects three major parts of the platform: participant registration, backend verification, and admin monitoring. On the frontend, `paymentService.js` handles opening the Razorpay checkout and reporting success or failure; on the backend, `/api/payments` manages payment records and webhook processing; in the database, the `Payment` collection stores the permanent transaction record. [file:1]

In simple words, the flow is:

1. Admin creates a contest with a fee. [file:1]
2. User tries to join that contest. [file:1]
3. The app checks whether the contest is free or paid. [file:1]
4. If paid, Razorpay checkout opens through the frontend payment service. [file:1]
5. Backend records and verifies the payment. [file:1]
6. If successful, the user is allowed into the contest flow. [file:1]
7. Admin can later view the transaction in the payment dashboard. [file:1]

---

## Where payment fits in the user flow

The user flow in the architecture starts with landing on the homepage, going to `/contest/join`, entering registration credentials, receiving a JWT, then entering the waiting room and eventually taking the quiz. The frontend notes also mention `paymentService.js` for Razorpay integration, which means the payment step fits into the **contest joining stage** whenever the selected contest is not free. [file:1]

A practical paid contest flow would work like this: [file:1]

1. User selects a contest from the landing page. [file:1]
2. User opens `/contest/join` and enters registration ID plus contest credentials. [file:1]
3. Backend validates the participant and contest credentials. [file:1]
4. Backend checks the contest’s registration fee from the contest data. [file:1]
5. If the contest is free, the user can continue directly. [file:1]
6. If the contest is paid, the frontend calls `paymentService.js` to start Razorpay checkout. [file:1]
7. After successful payment verification, the user is marked as eligible to continue to the waiting room. [file:1]
8. Then the normal live contest flow continues. [file:1]

This design keeps payment tightly linked to enrollment rather than treating it as a completely separate feature. [file:1]

---

## Admin use of the payment module

The admin side includes a dedicated route `/admin/payments`, and the design notes describe this page as a management area where admins can view Razorpay payment records and see payment status per user or contest. The later UI blueprint expands this into a full Payments page with stats, filters, status breakdown, revenue views, and export support. [file:1]

According to the project notes, the admin payments area is intended to show: [file:1]

- Total revenue. [file:1]
- Successful payment count and success rate. [file:1]
- Pending payments. [file:1]
- Failed and refunded payments. [file:1]
- Payment table with participant name, contest, Razorpay order ID, amount, status, and date. [file:1]
- Filters by contest and payment status. [file:1]
- Export options such as CSV. [file:1]

So from the admin perspective, Razorpay integration is not just about collecting money; it is also about financial visibility, reconciliation, and contest-level payment tracking. [file:1]

---

## Frontend integration design

The frontend notes explicitly mention `paymentService.js` as the module responsible for Razorpay integration. This service is the correct place to isolate all payment-specific logic so that contest pages stay clean and focused on flow handling rather than gateway details. [file:1]

### Responsibilities of `paymentService.js`

A well-structured `paymentService.js` in this project should handle the following: [file:1]

- Loading or using the Razorpay checkout SDK. [file:1]
- Calling the backend to create a payment order. [file:1]
- Opening the Razorpay checkout popup with the correct amount, currency, and user details. [file:1]
- Receiving Razorpay success callback data such as payment ID, order ID, and signature. [file:1]
- Sending the payment response to the backend for verification. [file:1]
- Returning final success or failure information back to the contest join UI. [file:1]

### Example frontend responsibility split

The contest join page should decide **when** payment is needed, while `paymentService.js` should decide **how** the Razorpay process runs. This separation matches the architecture style used elsewhere in the project, where service files handle specialized logic and components stay cleaner. [file:1]

### Example frontend flow

```txt
Contest Join Page
→ validate participant credentials
→ check if contest fee > 0
→ call paymentService.startPayment(...)
→ Razorpay popup opens
→ paymentService sends success data to backend verification API
→ if verified, continue to contest waiting room
```

This approach matches the project’s frontend pattern of using dedicated service files such as `contestApi.js`, `paymentService.js`, and `faceMonitor.js`. [file:1]

---

## Backend payment architecture

The backend notes list `/api/payments` as one of the four main route groups, and its purpose is described as payment management plus Razorpay webhooks. This means payment processing is designed as an official backend subsystem, not just a frontend popup integration. [file:1]

### What `/api/payments` should handle

A typical backend payment module for this project should support: [file:1]

- Creating Razorpay orders before checkout. [file:1]
- Verifying payment signatures after checkout success. [file:1]
- Recording payment status in MongoDB. [file:1]
- Handling Razorpay webhook events for reliable asynchronous confirmation. [file:1]
- Returning payment data to admin dashboards. [file:1]
- Optionally supporting refund operations or refund status syncing. [file:1]

### Example backend endpoint design

Even though the notes do not list every payment endpoint explicitly, the architecture strongly supports a structure like this under `/api/payments`: [file:1]

- `POST /api/payments/create-order` → Create a Razorpay order for a contest fee.  
- `POST /api/payments/verify` → Verify Razorpay payment signature after frontend checkout.  
- `POST /api/payments/webhook` → Accept webhook events from Razorpay.  
- `GET /api/payments` → Admin fetches payment records.  
- `GET /api/payments/:id` → Admin fetches a specific payment record.  

These fit naturally into the described payment management and webhook architecture. [file:1]

---

## MongoDB payment model

The database notes explicitly define a `Payment` collection used for Razorpay payment records, with fields such as `orderId`, `paymentId`, `status`, and `amount`, and a relationship from `Payment` to both `User` and `Contest`. This gives the payment system persistent storage and traceability. [file:1]

### Suggested `Payment` document meaning

The payment record should represent one financial transaction attempt tied to one participant and one contest. The record should answer questions such as: [file:1]

- Which contest was this payment for? [file:1]
- Which participant made the payment? [file:1]
- What amount was charged? [file:1]
- What Razorpay order and payment IDs were used? [file:1]
- Was the payment successful, pending, failed, or refunded? [file:1]

### Core fields from the project notes

The file explicitly mentions these fields in the `Payment` collection: [file:1]

- `orderId` [file:1]
- `paymentId` [file:1]
- `status` [file:1]
- `amount` [file:1]

The same notes also say `Payment` is linked to `User` and `Contest`, which means the payment record should also reference both entities. [file:1]

### Example logical shape

```json
{
  "_id": "payment_record_id",
  "userId": "user_object_id",
  "contestId": "contest_object_id",
  "orderId": "order_RZP123",
  "paymentId": "pay_RZP456",
  "status": "paid",
  "amount": 99,
  "currency": "INR",
  "gateway": "razorpay",
  "createdAt": "2026-03-20T10:00:00Z"
}
```

This example is consistent with the project’s described payment fields and entity relationships. [file:1]

---

## Detailed payment flow

Below is a project-specific payment flow that fits the architecture described in your file. [file:1]

### Step 1: Admin creates a paid contest

In the admin contest wizard, the fee and prize details step includes registration fee configuration with Free or Paid options. This means the admin can define whether a contest requires payment and what amount must be charged. [file:1]

### Step 2: User begins contest join process

The user goes to `/contest/join` and submits registration details and contest credentials. The contest route layer already includes credential validation as part of the participant flow. [file:1]

### Step 3: Backend checks contest fee

After validating credentials, the backend checks the contest’s registration fee from the `Contest` record. If the fee is zero, the user continues directly; if the fee is greater than zero, the payment flow starts. The contest data in the database design explicitly includes registration fee information. [file:1]

### Step 4: Backend creates Razorpay order

The frontend asks the backend payment API to create a Razorpay order for the required amount. The backend then stores an initial payment record with a pending status and returns order details to the frontend. This fits the existence of `/api/payments` and the `Payment` collection. [file:1]

### Step 5: Frontend opens Razorpay checkout

`paymentService.js` opens the Razorpay checkout popup using the returned order data, amount, and participant information. The project file directly states that `paymentService.js` is used for Razorpay integration. [file:1]

### Step 6: User completes payment

If the user pays successfully in Razorpay, Razorpay returns identifiers such as order ID, payment ID, and a signature to the frontend callback. The frontend should not trust this alone; it should send these values to the backend for verification. This is the safest way to align payment flow with the project’s broader security-first architecture. [file:1]

### Step 7: Backend verifies signature

The backend verifies the Razorpay signature using the secret key. If verification succeeds, the backend updates the payment record to a success state and can mark the user as eligible for the contest. Since payment records are stored in MongoDB and admin payment management exists, this verification result should be persisted in the `Payment` collection. [file:1]

### Step 8: User continues into contest

After verification succeeds, the frontend proceeds with the participant contest flow, which in the architecture continues into the waiting room and eventually the live contest. This cleanly connects payment completion with contest access. [file:1]

### Step 9: Webhook confirms final state

Razorpay webhooks sent to `/api/payments` provide an additional layer of confirmation for payment events. The backend payment route group explicitly includes Razorpay webhooks, which is important because webhook confirmation is more reliable than trusting only the frontend callback. [file:1]

### Step 10: Admin monitors transaction

The admin later opens `/admin/payments` to inspect payment records, status, and revenue data. The project’s admin blueprint clearly includes payment monitoring as a key operational feature. [file:1]

---

## Free vs paid contest behavior

The contest model includes registration fee data, and the admin contest wizard includes a Free/Paid toggle. That means the platform should support two clean enrollment modes. [file:1]

### Free contest

For a free contest: [file:1]

- No Razorpay checkout is needed. [file:1]
- User goes from credential validation to contest access. [file:1]
- No payment record may be required unless you want to log a zero-value entry. [file:1]

### Paid contest

For a paid contest: [file:1]

- A payment order is created. [file:1]
- Razorpay checkout opens. [file:1]
- Backend verifies the payment. [file:1]
- User gets contest access only after success. [file:1]
- Admin sees the transaction in the Payments dashboard. [file:1]

This conditional behavior makes the platform flexible for both promotional free events and revenue-generating contests. [file:1]

---

## Recommended status flow

The Payments admin UI notes mention status filtering by paid, pending, failed, and refunded states. The payment system should therefore use a clear status lifecycle. [file:1]

### Recommended statuses

- `created` → Order created but checkout not completed yet.  
- `pending` → Payment in progress or awaiting confirmation.  
- `paid` or `successful` → Payment verified successfully.  
- `failed` → Payment attempt failed or verification failed.  
- `refunded` → Payment refunded later.  

These statuses fit the project’s admin payments view, which includes successful, pending, failed, and refunded categories. [file:1]

---

## Webhook importance

The backend route description explicitly includes Razorpay webhooks under `/api/payments`, which is a strong architectural choice. Webhooks are important because they let the backend receive trusted event notifications directly from Razorpay even if the frontend closes early, loses internet, or fails to send confirmation after checkout. [file:1]

### Why webhook support matters

Without webhooks: [file:1]

- A successful payment might not be recorded if the client disconnects. [file:1]
- Admin payment data could become inconsistent. [file:1]
- Contest access logic could be harder to trust. [file:1]

With webhooks: [file:1]

- The backend can independently confirm final payment state. [file:1]
- Payment records can be corrected or updated reliably. [file:1]
- Admin reporting becomes more accurate. [file:1]

Because the project already includes webhook handling in the architecture, this is a major strength of the payment design. [file:1]

---

## Security considerations

The project already uses layered security patterns in authentication, including JWT, Redis-backed sessions, IP checks, and User-Agent validation. The payment system should follow the same security mindset. [file:1]

### Key payment security rules

- Do not trust the frontend payment success callback alone.  
- Always verify Razorpay signatures on the backend.  
- Store all important transaction data in the `Payment` collection.  
- Use webhook events as a second source of truth.  
- Link each payment to both `User` and `Contest` so admin audit and contest access logic remain traceable. [file:1]

### Access control

Payment admin pages should remain protected by the same admin access pattern used elsewhere in the application, where admin routes are protected on the frontend by `AdminRoute` and on the backend by authentication plus admin authorization middleware. The architecture already defines this separation for admin functionality. [file:1]

---

## Admin dashboard payment reporting

The later admin UI blueprint describes a full Payments page with statistics, charts, filters, a payment table, and export functionality. This makes payment integration operationally useful, not just technically complete. [file:1]

### Information shown to admins

According to the design notes, the Payments page can display: [file:1]

- Total revenue. [file:1]
- Successful payment count and success rate. [file:1]
- Pending count. [file:1]
- Failed and refunded totals. [file:1]
- Revenue bar chart per contest. [file:1]
- Payment status breakdown chart. [file:1]
- Search by participant name or order ID. [file:1]
- Filter by contest and payment status. [file:1]
- Payment table with participant, contest, order ID, amount, status, and date. [file:1]
- Export CSV. [file:1]

This means Razorpay data is intended to support both daily admin operations and financial reporting. [file:1]

---

## Recommended integration sequence

A clean implementation sequence for this project would be: [file:1]

1. Add contest fee support in the contest creation/edit flow, which the blueprint already includes. [file:1]
2. Build backend order creation under `/api/payments`. [file:1]
3. Build `paymentService.js` to open Razorpay checkout. [file:1]
4. Build backend signature verification endpoint. [file:1]
5. Save records into the `Payment` collection. [file:1]
6. Add webhook handling for reliable status updates. [file:1]
7. Connect payment success to contest enrollment logic. [file:1]
8. Populate `/admin/payments` with live payment data. [file:1]

This implementation order matches the architecture and prevents UI-only payment features without backend reliability. [file:1]

---

## Example end-to-end scenario

A participant chooses a paid contest with a registration fee configured by the admin. The participant enters registration details on the join page, the backend validates the contest entry, and because the contest is paid, the frontend calls `paymentService.js` to open a Razorpay checkout. After the participant pays, the frontend sends the Razorpay response to the backend, which verifies the signature, updates the `Payment` record in MongoDB, and then allows the participant to enter the waiting room. Later, the admin opens `/admin/payments` and sees that transaction listed with amount, order ID, contest, and payment status. [file:1]

---

## Summary

Razorpay integration in this project is designed as a complete payment subsystem tied directly to paid contest registration. The frontend uses `paymentService.js`, the backend exposes `/api/payments` for payment management and webhooks, MongoDB stores transaction data in the `Payment` collection, and the admin dashboard includes a dedic
