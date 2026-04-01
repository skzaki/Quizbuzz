# Quizbuzz — Project Requirements & Fix Plan

**Branch:** `third` (latest) | Compared against: `main`, `second`  
**Stack:** React 19 · Vite · Node.js / Express 5 · MongoDB · Redis · BullMQ · Socket.io · Docker  
**Document purpose:** Complete project reference combining architecture, known bugs, and the full ordered fix plan.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Authentication & Session Design](#6-authentication--session-design)
7. [Contest APIs](#7-contest-apis)
8. [Real-Time Communication (Socket.io)](#8-real-time-communication-socketio)
9. [Database Design](#9-database-design)
10. [Redis Usage](#10-redis-usage)
11. [Evaluation Worker](#11-evaluation-worker)
12. [Payment Integration (Razorpay)](#12-payment-integration-razorpay)
13. [Admin Dashboard](#13-admin-dashboard)
14. [DevOps & Deployment](#14-devops--deployment)
15. [Code Review Findings](#15-code-review-findings)
16. [Bug Registry](#16-bug-registry)
17. [Fix Plan — Phase 1: Critical (Deploy Blockers)](#17-fix-plan--phase-1-critical-deploy-blockers)
18. [Fix Plan — Phase 2: High-Severity Bugs](#18-fix-plan--phase-2-high-severity-bugs)
19. [Fix Plan — Phase 3: Code Quality & Moderate Fixes](#19-fix-plan--phase-3-code-quality--moderate-fixes)
20. [Fix Plan — Phase 4: DevOps & Infrastructure](#20-fix-plan--phase-4-devops--infrastructure)
21. [Fix Plan — Phase 5: Missing Features & Polish](#21-fix-plan--phase-5-missing-features--polish)
22. [Environment Variables Reference](#22-environment-variables-reference)
23. [Branch Comparison Summary](#23-branch-comparison-summary)
24. [Execution Checklist](#24-execution-checklist)

---

## 1. Project Overview

Quizbuzz is a full-stack, real-time online quiz and contest management platform. It serves two primary user groups:

- **Participants** — discover contests, join securely, wait in a lobby, take a live quiz, and view evaluated results with certificates.
- **Administrators** — create and manage contests, assign questions, monitor live sessions, view payments, and analyse platform-wide data.

The platform combines standard REST APIs for transactional operations with Socket.io-based real-time communication for waiting-room management, live quiz transitions, and progress recovery. It is designed for scheduled or manually started contests where reliability, fairness, and responsiveness are paramount.

### Core goals

- Secure participant authentication using JWT and OTP-based flows.
- Waiting-room-based live contest experience with automatic quiz-start signalling.
- Continuous progress saving so network interruptions do not lose answers.
- Asynchronous submission evaluation via BullMQ workers.
- Result pages, leaderboards, and PDF certificate access post-contest.
- Full admin dashboard for contest, question, payment, and analytics management.
- Redis-backed performance caching and session management.

---

## 2. Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 19 + Vite 7 | UI framework and build tool |
| React Router v7 | Client-side routing and navigation |
| Tailwind CSS v4 | Utility-first styling |
| ShadCN UI | Reusable component library |
| Socket.io-client 4 | Real-time WebSocket communication |
| TensorFlow.js + MediaPipe | Face landmark detection (proctoring) |
| CryptoJS | Client-side question encryption |
| Recharts | Analytics charts |
| react-hot-toast | Toast notification system |
| jwt-decode | JWT parsing on the client |

### Backend

| Technology | Purpose |
|---|---|
| Node.js (ESM) | Runtime |
| Express 5 | HTTP framework |
| Socket.io 4 | WebSocket server |
| Mongoose 8 | MongoDB ODM |
| Redis (node-redis v5) | Session store, caching, queue backend |
| BullMQ 5 | Background job queues |
| Zod 4 | Request validation |
| JWT (jsonwebtoken) | Stateless authentication tokens |
| PDFKit | PDF certificate generation |
| Helmet | Security headers |
| Morgan | HTTP request logging |
| Winston | Structured application logging (installed, not yet wired) |
| Compression | Gzip response compression |
| express-rate-limit | Rate limiting middleware |

### Infrastructure

| Technology | Purpose |
|---|---|
| MongoDB | Primary persistent data store |
| Redis | Sessions, live quiz state, answer cache, job queue |
| Docker + Docker Compose | Containerised multi-service deployment |
| Nginx | Frontend static file serving and reverse proxy |
| GitHub Actions | CI/CD pipeline |

---

## 3. System Architecture

```
Browser (React 19 / Vite)
  │
  ├── REST  →  Nginx (:3000)  →  /api/*  →  Express Backend (:5000)
  │                                               │
  │                                       ┌───────┴────────┐
  │                                     MongoDB           Redis
  │                                               │
  └── WebSocket  →  Socket.io (/ws/)             └── BullMQ Queue
                                                          │
                                               Evaluation Worker (separate container)
```

**Data flow summary:**

1. The browser communicates with the backend over REST for login, fetching questions, submission, and results.
2. The browser opens a WebSocket to Socket.io for waiting room events, quiz-start signals, and live progress saving.
3. The backend reads/writes to MongoDB for permanent records and to Redis for fast session and state lookup.
4. On submission, a BullMQ job is created. The evaluation worker (a separate Docker container) picks it up, scores it, updates MongoDB, and caches the result in Redis.

---

## 4. Frontend Architecture

### 4.1 Routing structure

#### Participant routes

| Path | Component | Auth required |
|---|---|---|
| `/` | `Landing` | No |
| `/login` | `Login` | No |
| `/contest/join` | `ContestJoin` | No |
| `/contest/waiting-room` | `WaitingRoom` | Yes (contestToken) |
| `/contest/live/:contestId` | `LiveContest` | Yes (contestToken) |
| `/contest/result/:submissionId` | `ContestResult` | Yes (contestToken) |
| `/contest/result/evaluate/:submissionId` | `ThankYouScreen` | Yes (contestToken) |

#### Admin routes (all protected by `AdminRoute`)

| Path | Component |
|---|---|
| `/admin` | `AdminDashboard` |
| `/admin/contests` | `ContestManagement` |
| `/admin/contests/:id` | `AdminContestDetail` |
| `/admin/questions` | `QuestionBank` |
| `/admin/payments` | `PaymentManagement` |
| `/admin/analytics` | `Analytics` |

### 4.2 Auth context

There are **two** context directories in the third branch — one of them is stale and must be deleted (see Fix F-24).

| File | Status | localStorage key | Notes |
|---|---|---|---|
| `src/context/AuthContext.jsx` | **DELETE** | `qb-token`, `qb-user` | Old implementation — wrong keys |
| `src/contexts/AuthContext.jsx` | **KEEP** | `authToken` | Current implementation with JWT decode, role enforcement, stale-token cleanup |

The active `AuthContext` (in `contexts/`) uses `jwtDecode` to parse the token on mount, enforces that only admin-role tokens are accepted, and discards expired or participant tokens automatically.

Participant sessions use a **separate** localStorage key `contestToken` (set by `ContestJoin`) so they never overwrite the admin's `authToken`.

### 4.3 Token storage model

| Key | Set by | Used by | Contains |
|---|---|---|---|
| `authToken` | `Login` page after admin login | `AdminRoute`, admin API calls | Admin JWT |
| `contestToken` | `ContestJoin` after credential validation | `WaitingRoom`, `LiveContest`, `ContestResult` | Participant JWT |
| `contestInfo` | `ContestJoin` after OTP verified | `WaitingRoom`, `LiveContest` | Contest metadata |
| `userInfo` | `ContestJoin` after OTP verified | `WaitingRoom`, `LiveContest` | Participant profile |
| `questions_{slug}` | `LiveContest` after first fetch | `LiveContest` on reload | AES-encrypted question array |

### 4.4 Service modules

| File | Purpose |
|---|---|
| `src/services/contestApi.js` | Contest submission and result polling |
| `src/services/paymentService.js` | Razorpay checkout integration |
| `src/services/faceMonitor.js` | TensorFlow.js face landmark detection for proctoring |
| `src/hooks/useExamProtection.js` | Fullscreen enforcement, tab-switch detection, keyboard blocking |
| `src/hooks/useContestSocket.js` | Socket.io connection lifecycle management |
| `src/hooks/useTimer.js` | Countdown timer with sync correction |
| `src/utils/downloadCertificate.js` | Client-side certificate PDF download |

### 4.5 Key frontend components

| Component | Purpose |
|---|---|
| `AdminRoute` | HOC guarding all `/admin/*` routes |
| `ErrorBoundary` | React error boundary (defined but not yet used — see Fix F-46) |
| `OTPModal` | 4-digit OTP entry modal |
| `LiveContest` | Full quiz UI with proctoring, timer, answer saving |
| `ThankYouScreen` | Animated evaluation waiting screen |
| `ContestResult` | Scored result with leaderboard and certificate |

---

## 5. Backend Architecture

### 5.1 Entry points

| File | Role |
|---|---|
| `server.js` | Creates HTTP server, attaches Socket.io, calls `connectDB()`, overrides `console.*` with IST timestamps |
| `app.js` | Configures Express: helmet, CORS, compression, morgan, rate limiting, all route groups |
| `socket.js` | Registers all Socket.io event handlers |
| `worker/evaluationWorker.js` | Standalone BullMQ worker — run as a separate process/container |

### 5.2 Middleware stack (in order)

```
Request
  → helmet()                 — security headers
  → cors(coresOptions)       — origin whitelist
  → express.json()           — request body parsing (10 MB limit)
  → express.urlencoded()     — form body parsing
  → compression()            — gzip responses
  → morgan()                 — HTTP request logging
  → [globalRateLimit]        — ⚠️ currently commented out (see Fix F-07)
  → route handlers
```

### 5.3 Route groups

| Prefix | Router file | Auth |
|---|---|---|
| `/api/auth` | `routes/authRoutes.js` | Public (login); authMiddleware for OTP |
| `/api/contests` | `routes/contestRoutes.js` | Public for `/active`, `/validate-credentials`, `/:id/leaderboard`; authMiddleware for rest |
| `/api/admin/contests` | `routes/admin/contestRoutes.js` | authMiddleware + adminMiddleware |
| `/api/admin/questions` | `routes/admin/questionRoutes.js` | authMiddleware + adminMiddleware |
| `/api/payments` | `routes/admin/paymentRoutes.js` | authMiddleware only ⚠️ (see Fix F-03) |
| `/health` | inline in `app.js` | Public |
| `/api/logs` | inline in `app.js` | Unauthenticated ⚠️ (see Fix F-08) |

### 5.4 Controller map

| Controller | Endpoints |
|---|---|
| `authController.js` | `login`, `sendOtp`, `resendOtp`, `verifyOtp` |
| `contestController.js` | `validateCredentials`, `getContestBySlug`, `getContestQuestions`, `submitContest`, `getSubmissionStatus`, `getSubmissionResult`, `getContestLeaderboard`, `getContestCertificate` |
| `admin/contestController.js` | `getAllContests`, `getContestById`, `createContest`, `updateContest`, `updateContestStatus`, `deleteContest`, `getContestStatistics`, `bulkUpdateStatus`, `bulkDeleteContests`, `addQuestionsToContest` |
| `admin/contestParticipantsController.js` | `getContestParticipants`, `exportContestParticipants`, `issueCertificates` |
| `admin/paymentController.js` | `getAllPayments`, `getSinglePayment`, `updatePaymentStatus`, `exportPayments`, `getPaymentStatistics`, `getContests`, `getPaymentAnalytics`, `handleWebhook` |

---

## 6. Authentication & Session Design

### 6.1 Authentication flow

```
POST /api/auth/login
  → validate email + phone (trim, isDeleted check)
  → invalidate existing active sessions in DB
  → create new Session (MongoDB)
  → save session to Redis (24h TTL)
  → sign JWT { userId, sessionId, role, email, userName }
  → return { token, userInfo }

POST /api/auth/send-otp  (requires authMiddleware)
  → parse phone with libphonenumber-js
  → generate 4-digit OTP
  → save OTP to Redis (5 min TTL) under key otp:{phone}
  → send via WhatsApp + SMS
  → return success

POST /api/auth/verify-otp  (requires authMiddleware)
  → validate OTP format
  → verify against Redis stored OTP → delete on success
  → check if submission already exists for this user
  → return success or submissionId if already submitted
```

> **⚠️ Current state:** `sendOtp`, `resendOtp`, and `verifyOtp` all return hardcoded success responses in the `third` branch. The full OTP implementation exists in the `main` branch and must be restored. See **Fix F-01**.

### 6.2 Auth middleware

Every protected request passes through `authMiddleware`:

1. Extract Bearer token from `Authorization` header.
2. Verify JWT signature against `JWT_SECRET`.
3. Look up `session:{sessionId}` in Redis.
4. If Redis miss, fall back to MongoDB `Session` collection.
5. Verify `session.isActive === true` and `session.userId === decoded.userId`.
6. Update `session.lastActivity` in Redis.
7. Attach `req.user = decoded`, `req.sessionId`, `req.token`.

### 6.3 Admin middleware

`adminMiddleware` runs after `authMiddleware` on admin routes:

- Checks `req.user.role === 'admin'` or `'super_admin'`.
- Returns `403 FORBIDDEN` for any other role.

### 6.4 JWT payload structure

```json
{
  "userId": "<MongoDB ObjectId>",
  "sessionId": "<UUID>",
  "role": "admin | user",
  "email": "user@example.com",
  "userName": "First Last",
  "contestId": "<ObjectId>",
  "iat": 1234567890,
  "exp": 1234567890
}
```

`contestId` is only present in participant tokens issued by `validateCredentials`.

### 6.5 Session storage

Sessions are stored in both Redis (fast path) and MongoDB (fallback and audit):

| Store | Key | TTL | Purpose |
|---|---|---|---|
| Redis | `session:{sessionId}` | 24 hours | Fast auth check on every request |
| MongoDB | `Session` collection | Permanent | Audit trail and Redis recovery |

---

## 7. Contest APIs

### 7.1 Public participant endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/contests/active` | Get nearest upcoming or ongoing contest |
| `POST` | `/api/contests/validate-credentials` | Validate registrationId + phone + slug; returns JWT |
| `GET` | `/api/contests/:contestId/leaderboard` | Public leaderboard for a contest |

### 7.2 Authenticated participant endpoints

All require `authMiddleware`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/contests/:contestSlug/questions` | Fetch questions (no correct answers exposed) |
| `POST` | `/api/contests/:contestSlug/submit` | Submit quiz; creates BullMQ evaluation job |
| `GET` | `/api/contests/:submissionId/status` | Poll evaluation status |
| `GET` | `/api/contests/:submissionId/results` | Get full evaluated result with question breakdown |
| `GET` | `/api/contests/:contestSlug/certificate` | Stream PDF certificate |
| `GET` | `/api/contests/:contestSlug` | Get contest by slug |

### 7.3 Admin contest endpoints

All require `authMiddleware` + `adminMiddleware`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/contests` | List all contests (paginated, filterable, sortable) |
| `POST` | `/api/admin/contests` | Create contest |
| `GET` | `/api/admin/contests/:id` | Get contest detail |
| `PUT` | `/api/admin/contests/:id` | Update contest |
| `DELETE` | `/api/admin/contests/:id` | Soft-delete contest |
| `PATCH` | `/api/admin/contests/:id/status` | Update contest status |
| `GET` | `/api/admin/contests/:id/statistics` | Contest statistics |
| `POST` | `/api/admin/contests/:id/questions` | Add questions to contest |
| `GET` | `/api/admin/contests/:id/participants` | List participants |
| `GET` | `/api/admin/contests/:id/participants/export` | Export participants (CSV/JSON) |
| `POST` | `/api/admin/contests/:id/certificates/issue` | Issue certificates in bulk |
| `PATCH` | `/api/admin/contests/bulk-status` | Bulk status update |
| `DELETE` | `/api/admin/contests/bulk-delete` | Bulk soft-delete |

### 7.4 Payment endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/payments` | authMiddleware ⚠️ | Get all payments |
| `GET` | `/api/payments/:paymentId` | authMiddleware ⚠️ | Get single payment |
| `PATCH` | `/api/payments/:paymentId/status` | authMiddleware + adminMiddleware | Update payment status |
| `POST` | `/api/payments/export` | authMiddleware ⚠️ | Export payments |
| `POST` | `/api/payments/stats` | authMiddleware ⚠️ | Payment statistics |
| `GET` | `/api/payments/contests` | authMiddleware ⚠️ | Get contests for filter |
| `GET` | `/api/payments/analytics` | authMiddleware ⚠️ | Payment analytics |
| `POST` | `/api/payments/webhooks/payments` | None | Razorpay webhook |

> **⚠️** Endpoints marked with ⚠️ are missing `adminMiddleware` — any logged-in participant can access payment data. See **Fix F-03**.

---

## 8. Real-Time Communication (Socket.io)

### 8.1 Server configuration

Socket.io server is attached at path `/ws/`. CORS currently has a trailing-slash mismatch between `app.js` and `server.js` (see Fix F-11).

```js
// Correct (no trailing slash):
origin: ["https://quiz.ysminfosolution.com", "http://localhost:3000"]
```

### 8.2 Event catalogue

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join-waiting-room` | Client → Server | `{ contestId, userId, startTime }` | Join lobby; server checks for saved state and emits `resume-quiz` if found |
| `quiz-started` | Server → Client | `{ contestId }` | Contest is live; client navigates to `/contest/live/:id` |
| `save-progress` | Client → Server | `{ contestId, userId, currentQuestion, answers[] }` | Delta or full snapshot of current answers |
| `heartbeat` | Client → Server | `{ contestId, userId, questionIndex }` | Updates `currentQuestion` in Redis without overwriting answers |
| `resume-quiz` | Server → Client | `{ currentQuestion, answers[], ... }` | Sent on reconnect if saved state exists |
| `leave-waiting-room` | Client → Server | `{ contestId, userId }` | Remove from waiting room |
| `start-quiz` | Client → Server | `{ contestId }` | Admin manual start override |
| `get-room-status` | Client → Server | `{ contestId, room? }` | Admin queries participant counts |
| `room-status` | Server → Client | `{ waiting, quiz }` | Response to `get-room-status` |
| `participant-joined` | Server → Client | `{ userId }` | Broadcast to waiting room |
| `participant-left` | Server → Client | `{ userId }` | Broadcast to waiting room |
| `disconnect` | System | — | Server marks user disconnected but preserves progress |

### 8.3 Room naming convention

| Room | Members |
|---|---|
| `waiting-{contestSlug}` | Participants waiting for contest to start |
| `quiz-{contestSlug}` | Participants actively taking the contest |

### 8.4 Scheduled start

When a user joins a waiting room for a future contest, `scheduleQuizStart()` is called if no timeout is already registered for that contest. It:

1. Calculates `delay = startTime - now`.
2. Sets a `setTimeout` for that delay.
3. On fire: moves all sockets from `waiting-{slug}` to `quiz-{slug}`, emits `quiz-started`, stores correct answers in Redis.

### 8.5 Progress saving logic

The server merges incoming answers with existing Redis state on every `save-progress` event:

- If a new answer is non-empty → overwrite stored answer for that question.
- If a new answer is empty but old answer exists → keep old answer.
- If question never answered → store as unanswered.

This prevents accidental answer erasure on reconnect.

---

## 9. Database Design

### 9.1 MongoDB collections

#### `User`

```js
{
  registrationId: String,        // e.g. "QUIZ-001001"
  firstName: String,
  lastName: String,
  password: String,              // unused field — no bcrypt currently
  email: String,                 // unique, lowercase, trimmed
  phone: String,
  college: String,
  department: String,
  isAdmin: Boolean,              // true for admin users
  isDeleted: Boolean,
  timestamps: true
}
```

Indexes: `email` (unique), add `registrationId` index (see Fix F-48).

#### `Contest`

```js
{
  title: String,
  slug: String,                  // auto-generated from title via slugify, immutable
  description: String,
  details: String,
  topics: [String],
  rules: [String],
  registerFee: Number,
  duration: Number,              // minutes
  cutOff: Number,                // minimum score threshold
  startTime: Date,
  deadline: Date,
  status: enum['draft','upcoming','ongoing','completed','cancelled'],
  participants: [ObjectId → User],
  QuestionBank: [ObjectId → Question],
  prizes: [{ rankFrom, rankTo, amount, currency, benefits[] }],
  isDeleted: Boolean,
  timestamps: true
}
```

Indexes: `status`, `slug` (unique), add `startTime + isDeleted` compound (see Fix F-48).

#### `Question`

```js
{
  questionText: String,
  options: [String],             // 4 options
  correctOptionIndex: Number,    // 0-based index
  correctOptionText: String,     // must match options[correctOptionIndex]
  difficulty: enum['easy','medium','hard'],
  hint: String,
  explanation: String,
  isDeleted: Boolean,
  timestamps: true
}
```

#### `Submission`

```js
{
  userId: ObjectId → User,
  contestId: ObjectId → Contest,
  answers: [{
    questionId: ObjectId → Question,
    answer: String,              // selected option text
    answerIndex: Number,         // selected option index
    isCorrect: Boolean,
    correctAnswer: String,
    submittedAt: Date
  }],
  score: Number,
  totalQuestions: Number,
  status: enum['submitted','evaluated'],
  timestamps: true
}
```

Indexes: `{ userId, contestId }` unique, add `{ contestId, score: -1 }` (see Fix F-48).

#### `Payment`

```js
{
  userRef: ObjectId → User,
  contestRef: ObjectId → Contest,
  orderId: String,               // Razorpay order ID
  paymentId: String,             // Razorpay payment ID
  amount: Number,                // stored in paise (× 100) — verify unit consistency (see Fix F-17)
  status: String,                // 'pending' | 'paid' | 'failed' | 'refunded'
  description: String,
  adminNote: String,
  provider: String,              // default 'RazorPay'
  metadata: { ip, userAgent },
  isDeleted: Boolean,
  timestamps: true
}
```

Indexes: add `{ contestRef, createdAt: -1 }`, `{ userRef }`, `{ status, createdAt: -1 }` (see Fix F-48).

#### `Session`

```js
{
  userId: ObjectId → User,
  sessionId: String,             // UUID
  isActive: Boolean,
  joinedAt: Date,
  endedAt: Date,
  device: String,
  ipAddress: String,
  userAgent: String,
  lastActivity: Date,
  timestamps: true
}
```

Indexes: `sessionId` (unique), `{ userId, isActive }` compound.

#### `Certificate`

```js
{
  userRef: ObjectId → User,      // ⚠️ controller uses wrong field name — see Fix F-10
  contestRef: ObjectId → Contest, // ⚠️ controller uses wrong field name — see Fix F-10
  url: String,
  isDeleted: Boolean,
  timestamps: true
}
```

> **⚠️ Note:** The `contestParticipantsController.js` queries using `contestId`/`participantId` instead of `contestRef`/`userRef`. This means certificates are never correctly retrieved or created. See **Fix F-10**.

#### `Admin` (unused — scheduled for removal)

The `Admin` model is defined but never used. Admin users are regular `User` documents with `isAdmin: true`. This model is dead code. See **Fix F-29**.

### 9.2 Relationships

```
Contest ──┬── QuestionBank[] → Question[]
          ├── participants[]  → User[]
          └── prizes[]        (embedded)

Submission → User, Contest, Question (via answers[].questionId)
Payment    → User (userRef), Contest (contestRef)
Certificate → User (userRef), Contest (contestRef)
Session    → User
```

### 9.3 Slug generation

Contest slugs are auto-generated from the `title` field using `slugify` in a Mongoose `pre('validate')` hook. Slugs are marked `immutable: true` — they cannot be changed after creation.

---

## 10. Redis Usage

### 10.1 Key catalogue

| Key pattern | TTL | Set by | Read by | Purpose |
|---|---|---|---|---|
| `session:{sessionId}` | 24 hours | `authController`, `authMiddleware` | `authMiddleware` | Fast session validation |
| `otp:{phone}` | 5 minutes | `authController.sendOtp` | `authController.verifyOtp` | OTP verification |
| `contest:{slug}:user:{userId}` | 3 hours | Socket `save-progress`, `heartbeat` | Socket `join-waiting-room`, `submitContest` | Live quiz state (answers + question index) |
| `contest:{slug}:correct_answers` | 24 hours | `socket.scheduleQuizStart`, `evaluationWorker` | `evaluationWorker` | Answer key cache |
| `submission:{id}:status` | 30s (pending) / 1h (evaluated) | `evaluationWorker` | `getSubmissionStatus`, `getSubmissionResult` | Evaluation result cache |
| `submission:{id}:results` | 30s (pending) / 1h (evaluated) | `getSubmissionResult` | `getSubmissionResult` | Full result detail cache |
| `contest:{id}` | 5 minutes | `admin/contestController` | `admin/contestController` | Contest detail cache |
| `contests:{queryHash}` | 3 minutes | `admin/contestController` | `admin/contestController` | Contest list cache |
| `contest:stats:{id}` | 10 minutes | `admin/contestController` | `admin/contestController` | Statistics cache |
| `contest:{id}:participants:{queryHash}` | 5 minutes | `contestParticipantsController` | `contestParticipantsController` | Participants list cache |
| `payment:{id}` | 1 hour | `paymentController` | `paymentController` | Single payment cache |
| `payment:list:{base64hash}` | 5 minutes | `paymentController` | `paymentController` | Payments list cache |
| `payment:stats:{dateRange}_{groupBy}` | 30 minutes | `paymentController` | `paymentController` | Payment stats cache |
| `analytics:{period}:analytics` | 30 minutes | `paymentController` | `paymentController` | Payment analytics cache |

### 10.2 Redis client configuration

The current `redis.js` uses several `ioredis` options that are silently ignored by `node-redis` v5. The correct configuration is shown in Fix F-20.

> **⚠️ Redis has no persistence.** All data is lost on container restart. See Fix F-36.

---

## 11. Evaluation Worker

### 11.1 Architecture

The evaluation worker runs as a **separate Docker container** sharing the same image as the backend but started with `node worker/evaluationWorker.js`. It consumes jobs from the `contest-evaluation` BullMQ queue.

### 11.2 Job flow

```
submitContest API
  → save Submission to MongoDB (status: 'submitted')
  → add job to contest-evaluation queue
  → return { submissionId, jobId }

evaluationWorker
  1. Fetch Submission from MongoDB
  2. Get correct answers from Redis (key: contest:{slug}:correct_answers)
     └── If miss: fetch from MongoDB and re-cache in Redis
  3. Build userAnswersMap from submission.answers
  4. For each question in correct answers:
     → if answered correctly  → +1
     → if answered wrongly    → -0.25
     → if skipped / missing   → 0
  5. Update Submission: { score, answers (with isCorrect), status: 'evaluated' }
  6. Cache result in Redis (submission:{id}:status)
  7. Delete quiz state from Redis (contest:{slug}:user:{registrationId})
```

### 11.3 Scoring rules

| Answer state | Points |
|---|---|
| Correct | +1 |
| Wrong | −0.25 |
| Skipped / unanswered | 0 |

### 11.4 Worker configuration

| Setting | Value |
|---|---|
| Queue name | `contest-evaluation` |
| Concurrency | 10 |
| Attempts | 4 |
| Backoff | Exponential, 2000ms delay |
| Remove on complete | 50 jobs retained |
| Remove on fail | 100 jobs retained |

### 11.5 Graceful shutdown

The worker handles `SIGTERM` and `SIGINT` by:
1. Closing the BullMQ worker.
2. Closing the BullMQ queue.
3. Disconnecting the Redis client.

---

## 12. Payment Integration (Razorpay)

### 12.1 Payment flow

```
Admin creates contest with registerFee > 0
  ↓
Participant joins contest → backend validates credentials
  ↓
Frontend checks contest.registerFee
  ↓  (if > 0)
paymentService.js creates Razorpay order via backend
  ↓
Backend creates Payment record (status: 'pending') in MongoDB
  ↓
Razorpay checkout popup opens
  ↓
On success: frontend sends { razorpay_payment_id, razorpay_order_id, razorpay_signature }
  ↓
Backend verifies HMAC signature using WEBHOOK_SECRET
  ↓  (if valid)
Payment record updated to status: 'paid'
  ↓
Participant is allowed into waiting room
  ↓
Razorpay webhook → POST /api/payments/webhooks/payments → secondary confirmation
  ↓
Admin views transaction in /admin/payments dashboard
```

### 12.2 Payment statuses

| Status | Meaning |
|---|---|
| `pending` | Order created; checkout not completed |
| `paid` | Payment verified successfully |
| `failed` | Payment attempt failed or verification failed |
| `refunded` | Payment refunded |

### 12.3 Webhook security

> **⚠️ Current state:** The webhook handler only checks for the presence of the signature header — it does not verify the HMAC value. Anyone can forge a `payment.completed` webhook. See **Fix F-45**.

Correct implementation:

```js
const crypto = await import('crypto');
const expected = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(req.body) // must use express.raw() body
  .digest('hex');
if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

---

## 13. Admin Dashboard

### 13.1 Layout shell

The admin layout (`AdminLayout.jsx`) consists of:

- **Fixed sidebar** — navigation links: Dashboard, Contests, Questions, Payments, Analytics, Settings, Profile, Logout.
- **Top navbar** — search, notifications panel, theme toggle, admin avatar with dropdown.

Both dark and light theme modes are supported via `ThemeContext`.

### 13.2 Contest management page

- Search by title.
- Filter by contest status (draft, upcoming, ongoing, completed, cancelled, all).
- Sort by createdAt, startTime, title, registrationCount.
- Pagination (configurable limit, default 10).
- Bulk selection with bulk-status and bulk-delete operations.
- Row-level actions: view detail, edit, duplicate, delete.
- Status badges with colour coding.

### 13.3 Contest create / edit wizard (multi-step)

| Step | Fields |
|---|---|
| 1 Basic info | Title, description, details, topics, rules |
| 2 Schedule | Start date, start time, duration (minutes) |
| 3 Fee & prizes | Registration fee, prize pool with rank ranges and benefits |
| 4 Questions | Search and assign from question bank |
| 5 Review | Full summary before save or publish |

Zod validation is applied on each step. Slug is auto-generated from title and shown as a preview.

### 13.4 Contest detail page tabs

| Tab | Content |
|---|---|
| Overview | Contest metadata, participant count, revenue |
| Participants | Paginated list with search, status filter, scores, certificates |
| Questions | Assigned questions with add/remove controls |
| Analytics | Score distribution, topic breakdown, difficulty accuracy |

### 13.5 Question bank page

- Search by question text.
- Filter by difficulty (easy, medium, hard) and topic.
- Bulk selection → assign to contest or delete.
- Inline add question form / modal.
- Bulk import via JSON or CSV.

### 13.6 Payment management page

- Stats cards: total revenue, success rate, pending count, failed count.
- Revenue bar chart per contest.
- Filterable payment table (by contest, status, date range).
- Export to CSV.
- Status update per payment (admin override).

### 13.7 Analytics page

- User growth chart.
- Revenue over time chart.
- Contest engagement chart.
- Topic popularity chart.
- Top performers table.
- Performance analysis by difficulty.

---

## 14. DevOps & Deployment

### 14.1 Docker Compose services

| Service | Image | Port | Notes |
|---|---|---|---|
| `mongo` | `mongo` | 27017 | Persistent volume for data and config |
| `redis` | `redis:alpine` | 6379 | ⚠️ No persistence volume currently (see Fix F-36) |
| `backend` | Built from `./Backend` | 5000 | Runs `node server.js` |
| `worker` | Built from `./Backend` | — | Runs `node worker/evaluationWorker.js` |
| `frontend` | Built from `./Frontend` | 3000→80 | Multi-stage: Node build → Nginx serve |

### 14.2 Nginx configuration

The frontend Nginx config (`nginx.conf`) proxies `/api/*` requests to the backend container at `quizbuzz-backend:5000`. Static assets are served with 1-year cache headers. SPA fallback (`try_files $uri /index.html`) handles React Router deep links.

> **⚠️ Missing security headers.** See Fix F-49.

### 14.3 CI/CD pipeline

The GitHub Actions workflow (`deploy.yml`) triggers on pushes to `main`, `second`, or `third`.

```
test → build → deploy (SSH to VPS)
```

> **⚠️ Critical bug:** The deploy script runs `git pull origin main` regardless of which branch was pushed. Pushing to `third` deploys `main`. See **Fix F-12**.  
> **⚠️ Tests are fake:** The test job only runs `echo "Test passed"`. See **Fix F-39**.

### 14.4 Dockerfiles

| Service | Base image | Notable issues |
|---|---|---|
| Backend | `node:18-alpine` | Runs as root user — add non-root user (Fix F-41) |
| Frontend (build) | `node:22-alpine` | Version mismatch with backend (Fix F-41) |
| Frontend (serve) | `nginx:alpine` | Correct multi-stage setup |

---

## 15. Code Review Findings

### 15.1 Architecture-level issues

| Finding | Severity | Fix |
|---|---|---|
| OTP fully bypassed — hardcoded success in all 3 functions | Critical | F-01 |
| Payment routes missing adminMiddleware | Critical | F-03 |
| Hardcoded seed credentials in connectDB() | Critical | F-06 |
| Global rate limiter commented out | Critical | F-07 |
| CI/CD always deploys main regardless of branch | Critical | F-12 |
| CORS trailing-slash mismatch breaks Socket.io | Critical | F-11 |
| Redis has no persistence — all state lost on restart | High | F-36 |
| No Docker healthchecks — race conditions on startup | High | F-37 |

### 15.2 Backend code-level issues

| Finding | Severity | Fix |
|---|---|---|
| `areAllJobsCompleted()` called without `await` — always truthy | Critical | F-04 |
| `redisClient.setex` (lowercase) throws at runtime | Critical | F-09 |
| Certificate schema field mismatch (`contestId` vs `contestRef`) | Critical | F-10 |
| Login does not check `isDeleted` | High | F-02 |
| Hardcoded slug default `'quizbuzz-3'` | High | F-05 |
| `getContestStatus` ignores DB status field | High | F-13 |
| `updateContest` null crash on missing contest | High | F-14 |
| `createdBy` stores wrong ID (`req.user.id` vs `req.user.userId`) | High | F-15 |
| Statistics endpoint returns hardcoded placeholder values | High | F-16 |
| Payment amount * 0.01 inconsistency | High | F-17 |
| Export payments returns fake CDN URL | High | F-18 |
| `KeyGenerator` (capital K) silently ignored | High | F-19 |
| ioredis options passed to node-redis (all silently ignored) | High | F-20 |
| `redisClient.keys()` O(N) blocks Redis | Moderate | F-30 |
| Leaderboard score threshold hardcoded to 50 | Moderate | F-34 |
| Participant status filter uses non-existent `contestStatus` field | Moderate | F-27 |
| Inline route handlers in questionRoutes.js | Moderate | F-28 |
| Unused Admin model | Moderate | F-29 |
| No global Express error handler or 404 middleware | Moderate | F-35 |
| Winston installed but never used | Moderate | F-31 |
| `/api/logs` endpoint unauthenticated | High | F-08 |

### 15.3 Frontend code-level issues

| Finding | Severity | Fix |
|---|---|---|
| Duplicate AuthContext directories — stale one must be deleted | High | F-24 |
| WaitingRoom shows infinite loading if navigated to directly | High | F-21 |
| Submission retry loop retries on "already submitted" 400 | High | F-22 |
| Auto-save interval is 5 minutes — too long | High | F-23 |
| Option shuffling breaks answer-index server mapping | Moderate | F-33 |
| No centralized API client — raw fetch duplicated 20+ times | Moderate | F-32 |
| ErrorBoundary defined but not used anywhere | Moderate | F-46 |
| Stale localStorage not cleared after submission | Moderate | F-47 |
| TF.js / MediaPipe models loaded at contest start (3-10s lag) | Low | F-50 |

### 15.4 Schema / naming inconsistencies

| Finding | Severity | Fix |
|---|---|---|
| `cutOff` vs `cutoff` mismatch across schema and Zod | High | F-25 |
| `zodSchmea.js` filename typo | Moderate | F-26 |
| `zodParticipantsSchemee.js` filename typo | Moderate | F-26 |
| `optSms.js` filename typo | Moderate | F-26 |
| Multiple typos in error message strings | Low | F-51 |

### 15.5 Security findings

| Issue | Severity |
|---|---|
| OTP verification bypassed | Critical |
| No password hashing (bcrypt) for any user | Critical |
| Payment endpoints accessible to participants | Critical |
| Hardcoded credentials seeded into production DB | Critical |
| Global rate limiter disabled | Critical |
| Webhook signature not verified | High |
| `VITE_SECRET_KEY` baked into frontend bundle | High |
| `/api/logs` unauthenticated | High |
| Deleted users can log in | High |
| `authToken` in localStorage (XSS risk) | Moderate |
| No HTTPS enforcement at Nginx level | Moderate |
| Backend container runs as root | Moderate |

---

## 16. Bug Registry

| ID | Component | Description | Severity | Fix |
|---|---|---|---|---|
| BUG-01 | `authController.js` | OTP completely bypassed (hardcoded success) | Critical | F-01 |
| BUG-02 | `authController.js` | Login allows deleted users | High | F-02 |
| BUG-03 | `paymentRoutes.js` | Admin middleware missing on most payment endpoints | Critical | F-03 |
| BUG-04 | `contestController.js` | `areAllJobsCompleted()` missing `await` | Critical | F-04 |
| BUG-05 | `contestController.js` | Slug hardcoded as `'quizbuzz-3'` default | High | F-05 |
| BUG-06 | `DB.js` | Hardcoded credentials seeded on every restart | Critical | F-06 |
| BUG-07 | `app.js` | Global rate limiter commented out | Critical | F-07 |
| BUG-08 | `app.js` | `/api/logs` has no auth | High | F-08 |
| BUG-09 | `contestParticipantsController.js` | `setex` lowercase throws runtime error | Critical | F-09 |
| BUG-10 | `contestParticipantsController.js` | Certificate field names don't match schema | Critical | F-10 |
| BUG-11 | `server.js` | CORS origin trailing slash mismatch with `app.js` | Critical | F-11 |
| BUG-12 | `deploy.yml` | CI/CD always pulls main branch | Critical | F-12 |
| BUG-13 | `admin/contestController.js` | `getContestStatus` ignores DB status field | High | F-13 |
| BUG-14 | `admin/contestController.js` | Null crash in `updateContest` date logic | High | F-14 |
| BUG-15 | `admin/contestController.js` | `createdBy` stores wrong user ID | High | F-15 |
| BUG-16 | `admin/contestController.js` | Statistics endpoint has hardcoded placeholder values | High | F-16 |
| BUG-17 | `admin/paymentController.js` | Payment amount unit inconsistency (`* 0.01`) | High | F-17 |
| BUG-18 | `admin/paymentController.js` | Export payments returns fake CDN URL | High | F-18 |
| BUG-19 | `rateLimit.js` | `KeyGenerator` capital K silently ignored | High | F-19 |
| BUG-20 | `redis.js` | ioredis options silently ignored by node-redis | High | F-20 |
| BUG-21 | `WaitingRoom.jsx` | No redirect guard when `contestInfo` is null | High | F-21 |
| BUG-22 | `LiveContest.jsx` | Submission retry loop retries on 400 "already submitted" | High | F-22 |
| BUG-23 | `LiveContest.jsx` | Auto-save interval is 5 minutes | High | F-23 |
| BUG-24 | `src/context/` | Old `AuthContext` directory still present | High | F-24 |
| BUG-25 | `zodSchmea.js` | `cutoff` vs `cutOff` field name mismatch | High | F-25 |
| BUG-26 | Multiple files | Three filename typos | Moderate | F-26 |
| BUG-27 | `contestParticipantsController.js` | Status filter uses non-existent `contestStatus` | Moderate | F-27 |
| BUG-28 | `questionRoutes.js` | All CRUD logic inline in route file | Moderate | F-28 |
| BUG-29 | `DB.js` | Unused `Admin` model | Moderate | F-29 |
| BUG-30 | Multiple cache helpers | `redisClient.keys()` O(N) blocks Redis | Moderate | F-30 |
| BUG-31 | All controllers | Winston installed but unused | Moderate | F-31 |
| BUG-32 | All frontend pages | Raw `fetch` duplicated everywhere | Moderate | F-32 |
| BUG-33 | `LiveContest.jsx` | Option shuffling breaks server-side index mapping | Moderate | F-33 |
| BUG-34 | `contestController.js` | Leaderboard score threshold hardcoded to 50 | Moderate | F-34 |
| BUG-35 | `app.js` | No global error handler or 404 middleware | Moderate | F-35 |
| BUG-36 | `docker-compose.yml` | Redis has no persistence volume | High | F-36 |
| BUG-37 | `docker-compose.yml` | No Docker healthchecks | High | F-37 |
| BUG-38 | No `.env.example` files | New developers have no env template | High | F-38 |
| BUG-39 | `deploy.yml` | Test job runs `echo` not real tests | Moderate | F-39 |
| BUG-40 | `deploy.yml` | No rollback mechanism on failed deploy | Moderate | F-40 |
| BUG-41 | `Dockerfile` (Backend) | Runs as root user; Node version mismatch | Moderate | F-41 |
| BUG-42 | `server.js` | Socket.io uses in-memory Map — breaks horizontal scaling | Moderate | F-42 |

---

## 17. Fix Plan — Phase 1: Critical (Deploy Blockers)

These must be fixed before any production deployment.

---

### F-01 — Re-enable real OTP (sendOtp, resendOtp, verifyOtp)

**File:** `Backend/controller/authController.js`  
**Severity:** Critical  
**Problem:** All three OTP functions return hardcoded success. Anyone can bypass authentication.

**Fix — restore real `sendOtp`:**

```js
export const sendOtp = async (req, res) => {
  const { phone } = req.body;
  const userName = req.user.userName;
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, "IN");
    if (!phoneNumber?.isValid())
      return res.status(400).json({ message: "Enter a valid phone number (without '+91')" });
    const OTP = generateOtp();
    const saved = await saveOtp(phoneNumber.number, OTP);
    if (!saved) return res.status(500).json({ message: "Could not save OTP, please try again" });
    await sendOtpWhatsApp(phoneNumber.number, userName, OTP);
    await sendOtpSms(phoneNumber.number, OTP);
    return res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error(`sendOtp error: ${error.message}`);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
```

**Fix — restore real `verifyOtp`:**

```js
export const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  const slug = req.body.slug || 'quizbuzz-3'; // read from body
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, "IN");
    if (!phoneNumber?.isValid())
      return res.status(400).json({ message: "Enter a valid phone number" });
    if (!/^\d{4}$/.test(otp))
      return res.status(400).json({ message: "Invalid OTP format" });
    const result = await verifyAndDeleteOtp(phoneNumber.number, otp);
    if (!result.success)
      return res.status(401).json({ message: result.message });
    const contest = await Contest.findOne({ slug, isDeleted: false });
    if (!contest)
      return res.status(404).json({ message: "Contest not found" });
    const userId = req.user.userId;
    const existingSubmission = await Submission.findOne({ userId });
    if (existingSubmission)
      return res.json({ submissionId: existingSubmission._id, message: result.message });
    const now = new Date();
    const contestEndTime = new Date(contest.startTime.getTime() + parseInt(contest.duration) * 60000);
    if (now > contestEndTime)
      return res.status(400).json({ message: "Contest has ended. You can no longer join." });
    return res.json({ message: result.message });
  } catch (error) {
    console.error(`verifyOtp error: ${error.message}`);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
```

**Fix — restore real `resendOtp`:**

```js
export const resendOtp = async (req, res) => {
  // Call same logic as sendOtp
  return sendOtp(req, res);
};
```

---

### F-02 — Check isDeleted on login

**File:** `Backend/controller/authController.js`  
**Severity:** Critical

```js
// Before:
const user = await User.findOne({ email: cleanEmail });

// After:
const user = await User.findOne({ email: cleanEmail, isDeleted: false });
```

---

### F-03 — Add adminMiddleware to all payment routes

**File:** `Backend/routes/admin/paymentRoutes.js`  
**Severity:** Critical

```js
import { adminMiddleware } from '../../middleware/admin.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware); // ADD THIS — protects all routes below

router.post('/', getAllPayments);
router.post('/export', exportPayments);
router.post('/stats', getPaymentStatistics);
router.get('/contests', getContests);
router.get('/analytics', getPaymentAnalytics);

// Webhook — no auth (must be before router.use middleware)
// Move webhook to a separate un-protected router or use express.Router() without the middleware

router.get('/:paymentId', getSinglePayment);
router.patch('/:paymentId/status', updatePaymentStatus); // adminMiddleware already applied at router level
```

> **Note:** The Razorpay webhook endpoint (`/webhooks/payments`) must remain unauthenticated. Move it to a separate router defined before the `router.use(adminMiddleware)` line, or register it directly in `app.js`.

---

### F-04 — Add await to areAllJobsCompleted

**File:** `Backend/controller/contestController.js`  
**Severity:** Critical

```js
// Before:
const allDone = areAllJobsCompleted();

// After:
const allDone = await areAllJobsCompleted();
```

---

### F-05 — Remove hardcoded slug default

**File:** `Backend/controller/contestController.js`  
**Severity:** High

```js
// Before:
const { registrationId, phone, slug = 'quizbuzz-3' } = parsed.data;

// After:
const { registrationId, phone, slug } = parsed.data;
if (!slug) {
  return res.status(400).json({ message: "Contest slug is required" });
}
```

Also update the Zod schema in `zodSchmea.js` to make `slug` required (remove the default value from `validateCredentialsSchema`).

---

### F-06 — Remove hardcoded seed credentials from connectDB

**File:** `Backend/Models/DB.js`  
**Severity:** Critical

Remove the entire auto-seed block from `connectDB()`. Create a separate seed script:

```js
// Backend/scripts/seed.js
import dotenv from 'dotenv';
dotenv.config();
import { connectDB, User } from '../Models/DB.js';

await connectDB();

const existing = await User.findOne({ email: 'quiz@gmail.com' });
if (!existing) {
  await User.create({
    registrationId: 'quiz001',
    firstName: 'Quiz',
    lastName: 'Admin',
    email: 'quiz@gmail.com',
    phone: '9876543210',
    isAdmin: true,
    isDeleted: false,
  });
  console.log('Admin seeded.');
}
process.exit(0);
```

Run once manually: `node scripts/seed.js`

---

### F-07 — Enable global rate limiter

**File:** `Backend/app.js`  
**Severity:** Critical

```js
// Uncomment this line:
app.use(globalRateLimit);

// Also add auth-specific rate limit to login:
// In Backend/routes/authRoutes.js:
import { authRateLimit } from '../middleware/rateLimit.js';
router.post("/login", authRateLimit, login);
```

---

### F-08 — Protect /api/logs endpoint

**File:** `Backend/app.js`  
**Severity:** High

```js
// Before:
app.post("/api/logs", (req, res) => { ... });

// After:
app.post("/api/logs", authMiddleware, (req, res) => { ... });
```

---

### F-09 — Fix redisClient.setex casing

**File:** `Backend/controller/admin/contestParticipantsController.js`  
**Severity:** Critical

```js
// Before (line 191):
await redisClient.setex(cacheKey, CACHE_TTL.PARTICIPANTS, JSON.stringify(response));

// After:
await redisClient.setEx(cacheKey, CACHE_TTL.PARTICIPANTS, JSON.stringify(response));
```

---

### F-10 — Fix Certificate schema field names

**File:** `Backend/controller/admin/contestParticipantsController.js`  
**Severity:** Critical

The `Certificate` model uses `userRef` and `contestRef`. The controller incorrectly uses `contestId` and `participantId`.

**In `getContestParticipants`:**

```js
// Before:
const certificates = await Certificate.find({
  contestId,
  participantId: { $in: participantIds }
});
certificatesMap[cert.participantId.toString()] = cert;

// After:
const certificates = await Certificate.find({
  contestRef: contestId,
  userRef: { $in: participantIds }
});
certificatesMap[cert.userRef.toString()] = cert;
```

**In `issueCertificates`:**

```js
// Before:
const certificate = await Certificate.create({
  contestId,
  participantId: participant._id,
  participantName: ...,
  contestTitle: ...,
  certificateType: ...,
  score: ...,
  issueDate: ...,
  issuedBy: ...,
  // ... other non-schema fields
});

// After (only schema fields):
const certificate = await Certificate.create({
  userRef: participant._id,
  contestRef: contestId,
  url: '', // generate or leave blank until URL generation is implemented
  isDeleted: false,
});
```

---

### F-11 — Fix CORS trailing slash mismatch

**File:** `Backend/server.js`  
**Severity:** Critical

```js
// Before:
origin: ["https://quiz.ysminfosolution.com/", "http://localhost:3000"]

// After (remove trailing slash — must exactly match app.js):
origin: ["https://quiz.ysminfosolution.com", "http://localhost:3000"]
```

---

### F-12 — Fix CI/CD branch deployment

**File:** `.github/workflows/deploy.yml`  
**Severity:** Critical

```yaml
- name: Deploy via SSH
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.VPS_HOST }}
    username: ${{ secrets.VPS_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    port: 2222
    script: |
      cd /var/www/quizbuzz
      git fetch origin
      git checkout ${{ github.ref_name }}
      git pull origin ${{ github.ref_name }}
      docker compose up -d --build
      docker compose ps
```

---

## 18. Fix Plan — Phase 2: High-Severity Bugs

Fix within the first week.

---

### F-13 — Fix getContestStatus ignoring DB status field

**File:** `Backend/controller/admin/contestController.js`

```js
const getContestStatus = (contest) => {
  // Respect explicit DB status for terminal states
  if (contest.status === 'draft')      return 'draft';
  if (contest.status === 'cancelled')  return 'cancelled';
  if (contest.status === 'completed')  return 'completed';
  // Use date logic for non-terminal states
  const now = new Date();
  if (contest.startTime > now)         return 'upcoming';
  if (contest.deadline > now)          return 'ongoing';
  return 'completed';
};
```

---

### F-14 — Fix null crash in updateContest

**File:** `Backend/controller/admin/contestController.js`

```js
// Add null check before accessing existingContest:
if (validation.data.startDate || validation.data.startTime) {
  const existingContest = await Contest.findById(id);
  if (!existingContest) {
    return res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Contest not found" }
    });
  }
  // ... rest of date logic
}
```

---

### F-15 — Fix createdBy using wrong field name

**File:** `Backend/controller/admin/contestController.js`

```js
// Before:
createdBy: req.user?.id || 'admin_user_id'

// After:
createdBy: req.user?.userId || null
```

---

### F-16 — Replace hardcoded stats with real aggregation

**File:** `Backend/controller/admin/contestController.js`

```js
// In getContestStatistics, replace hardcoded values:
const stats = await Submission.aggregate([
  { $match: { contestId: contest._id, status: 'evaluated' } },
  {
    $group: {
      _id: null,
      averageScore: { $avg: '$score' },
      highestScore: { $max: '$score' },
      lowestScore: { $min: '$score' },
      completedParticipants: { $sum: 1 }
    }
  }
]);
const s = stats[0] || {
  averageScore: 0, highestScore: 0,
  lowestScore: 0, completedParticipants: 0
};

// Real registration trend (last 7 days):
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const registrationTrend = await Payment.aggregate([
  { $match: { contestRef: contest._id, createdAt: { $gte: sevenDaysAgo } } },
  { $group: {
    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } },
  { $project: { date: '$_id', count: 1 } }
]);
```

---

### F-17 — Fix payment amount unit consistency

**File:** `Backend/controller/admin/paymentController.js`

Decide on one unit (rupees or paise) and apply consistently across ALL format operations:

```js
// If amounts are stored in paise (× 100 of rupees):
amount: payment.amount / 100  // in ALL formatPayment calls, including getAllPayments and getSinglePayment

// If amounts are stored in rupees already:
amount: payment.amount  // remove the * 0.01 from getAllPayments
```

---

### F-18 — Implement real payment CSV export

**File:** `Backend/controller/admin/paymentController.js`

```js
import { Parser } from 'json2csv';

export const exportPayments = async (req, res) => {
  // ... existing query logic to get payments ...

  const formattedData = payments.map(p => ({
    id: p._id,
    userName: `${p.userRef.firstName} ${p.userRef.lastName}`,
    email: p.userRef.email,
    contest: p.contestRef.title,
    amount: p.amount / 100,
    status: p.status,
    transactionId: p.paymentId,
    date: p.createdAt
  }));

  if (format === 'csv') {
    const parser = new Parser();
    const csv = parser.parse(formattedData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition',
      `attachment; filename="payments-${Date.now()}.csv"`);
    return res.send(csv);
  }

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition',
      `attachment; filename="payments-${Date.now()}.json"`);
    return res.json({ payments: formattedData, exportedAt: new Date() });
  }
};
```

---

### F-19 — Fix KeyGenerator casing

**File:** `Backend/middleware/rateLimit.js`

```js
// Before:
KeyGenerator: (req) => {
  return req.user?.id || req.ip;
},

// After:
keyGenerator: (req) => {
  return req.user?.userId || req.ip;
},
```

---

### F-20 — Fix Redis config (remove ioredis options)

**File:** `Backend/redis.js`

```js
import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 10000,
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Max Redis reconnect retries reached');
      return Math.min(retries * 50, 2000);
    }
  }
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("ready", () => console.log("Redis connected"));

await redisClient.connect();

export default redisClient;
```

---

### F-21 — Add WaitingRoom null guard

**File:** `Frontend/src/pages/WaitingRoom.jsx`

```js
// Add this useEffect after the initialization useEffect:
useEffect(() => {
  if (isInitialized && !contestInfo) {
    toast.error("No contest session found. Please join a contest first.");
    navigate('/contest/join');
  }
}, [isInitialized, contestInfo, navigate]);
```

---

### F-22 — Fix submission retry on "already submitted"

**File:** `Frontend/src/pages/LiveContest.jsx`

```js
// In handleSubmitContest, inside the try block:
if (!response.ok) {
  // A 400 with submissionId means "already submitted" — treat as success
  if (response.status === 400) {
    const errData = await response.json();
    if (errData.submissionId) {
      finalSubmissionId = errData.submissionId;
      submissionSuccessful = true;
      break;
    }
  }
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
```

---

### F-23 — Reduce auto-save interval

**File:** `Frontend/src/pages/LiveContest.jsx`

```js
// Before:
const autoSave = setInterval(() => { ... }, 5 * 60000); // 5 minutes

// After:
const autoSave = setInterval(() => { ... }, 60 * 1000); // 1 minute
```

---

### F-24 — Delete old AuthContext directory

**File:** `Frontend/src/context/` (entire directory)

```bash
# From the Frontend/ directory:
rm -rf src/context/

# Verify all imports point to src/contexts/:
grep -r "from.*'../context/" src/ --include="*.jsx" --include="*.js"
grep -r "from.*'./context/" src/ --include="*.jsx" --include="*.js"
# Both grep commands should return zero results
```

---

### F-25 — Fix cutOff / cutoff naming inconsistency

**File:** `Backend/Models/zodSchmea.js`

```js
// In contestSchema, rename 'cutoff' to 'cutOff':
cutOff: z.number().min(0, "Cut off must be non-negative").optional(),

// In admin/contestController.js createContest, ensure mapping:
const contestData = {
  ...validation.data,
  cutOff: validation.data.cutOff, // explicitly map
  registerFee: validation.data.registrationFee,
  startTime: new Date(`${validation.data.startDate} ${validation.data.startTime}`),
  deadline: new Date(...),
};
```

---

## 19. Fix Plan — Phase 3: Code Quality & Moderate Fixes

Complete within two weeks of Phase 1 & 2.

---

### F-26 — Rename typo'd files

```bash
# From Backend/ directory:
mv Models/zodSchmea.js Models/zodSchema.js
mv Models/zodParticipantsSchemee.js Models/zodParticipantsSchema.js
mv service/optSms.js service/otpSms.js

# Update all import paths in:
# - controller/authController.js
# - controller/contestController.js
# - controller/admin/contestController.js
# - controller/admin/contestParticipantsController.js
# - middleware/validation.js
# - routes/admin/contestRoutes.js
# - routes/admin/paymentRoutes.js

# Search for old import paths:
grep -r "zodSchmea\|zodParticipantsSchemee\|optSms" . --include="*.js"
```

---

### F-27 — Fix participant status filter

**File:** `Backend/controller/admin/contestParticipantsController.js`

```js
// Replace the invalid contestStatus field filter:
if (status !== 'all') {
  if (status === 'completed') {
    const completedUserIds = await Submission.find({
      contestId,
      status: 'evaluated'
    }).distinct('userId');
    participantQuery._id = {
      $in: completedUserIds.filter(id =>
        contest.participants.map(p => p.toString()).includes(id.toString())
      )
    };
  } else if (status === 'registered') {
    const submittedUserIds = await Submission.find({ contestId })
      .distinct('userId');
    participantQuery._id = {
      $in: contest.participants.filter(p =>
        !submittedUserIds.map(id => id.toString()).includes(p.toString())
      )
    };
  }
}
```

---

### F-28 — Extract inline handlers into questionController

Create `Backend/controller/admin/questionController.js`:

```js
import { Contest, Question } from '../../Models/DB.js';
import redisClient from '../../redis.js';

export const getAllQuestions = async (req, res) => {
  const { page = 1, limit = 10, search, difficulty } = req.query;
  const query = { isDeleted: false };
  if (search) query.questionText = { $regex: search, $options: 'i' };
  if (difficulty && difficulty !== 'all') query.difficulty = difficulty;
  const total = await Question.countDocuments(query);
  const questions = await Question.find(query)
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { questions,
    pagination: { totalItems: total, totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page) }
  }});
};

export const createQuestion = async (req, res) => { ... };
export const updateQuestion = async (req, res) => { ... };
export const deleteQuestion = async (req, res) => { ... };
export const assignToContest = async (req, res) => { ... };
```

Update `questionRoutes.js` to import from this controller.

---

### F-29 — Remove unused Admin model

**File:** `Backend/Models/DB.js`

```js
// Remove these lines:
const adminSchema = new mongoose.Schema({
  password: { type: String },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

export const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
```

---

### F-30 — Replace redisClient.keys() with SCAN

**File:** `Backend/controller/admin/contestController.js` and `Backend/store/paymentStore.js`

```js
// Create a shared utility:
// Backend/utils/redisUtils.js
export async function scanDel(client, pattern) {
  for await (const keys of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
    if (keys.length > 0) {
      await client.del(keys);
    }
  }
}

// Replace in clearContestsListCache:
import { scanDel } from '../utils/redisUtils.js';
const clearContestsListCache = async () => {
  try {
    await scanDel(redisClient, 'contests:*');
  } catch (error) {
    console.warn('Error clearing contests cache:', error);
  }
};

// Replace in paymentStore.clearListCaches:
async clearListCaches() {
  await scanDel(redisClient, `${this.listKeyPrefix}*`);
}
```

---

### F-31 — Wire Winston logger

Create `Backend/utils/logger.js`:

```js
import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    })
  ]
});
```

Replace `console.log`/`console.error` calls in controllers with `logger.info`/`logger.error`/`logger.warn`/`logger.debug`.

---

### F-32 — Create centralized API client

Create `Frontend/src/services/api.js`:

```js
const BASE = import.meta.env.VITE_URL;

export const apiCall = async (path, opts = {}, tokenKey = 'contestToken') => {
  const token = localStorage.getItem(tokenKey);
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw error;
  }
  return res.json();
};

// Helpers:
export const adminApiCall = (path, opts = {}) =>
  apiCall(path, opts, 'authToken');

export const participantApiCall = (path, opts = {}) =>
  apiCall(path, opts, 'contestToken');
```

Refactor all raw `fetch` calls in pages and components to use this client.

---

### F-33 — Fix option shuffling + index mapping

**File:** `Frontend/src/pages/LiveContest.jsx`

Instead of storing shuffled options and losing the original index mapping, store the original index alongside each option:

```js
// New shuffle function that tracks original indices:
const shuffleOptionsWithMapping = (options) => {
  const indexed = options.map((text, origIdx) => ({ text, origIdx }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return indexed; // [{ text: "Option B", origIdx: 1 }, ...]
};

// When building the answer to save:
const structuredAnswer = {
  questionId: questions[currentQuestion]._id,
  answer: questions[currentQuestion].options[selectedAnswer].text, // display text
  answerIndex: questions[currentQuestion].options[selectedAnswer].origIdx, // ORIGINAL index
  submittedAt: new Date()
};
```

Update all option rendering to use `.text` property.

---

### F-34 — Fix leaderboard score threshold

**File:** `Backend/controller/contestController.js`

```js
// Before:
const submissions = await Submission.find({
  contestId,
  score: { $gte: 50 }
})

// After:
const contest = await Contest.findById(contestId).select('cutOff');
const scoreThreshold = (contest?.cutOff ?? 0);
const submissions = await Submission.find({
  contestId,
  score: { $gte: scoreThreshold }
})
```

---

### F-35 — Add global Express error handler

**File:** `Backend/app.js` (add after all route registrations)

```js
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message, err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: process.env.NODE_ENV === 'development'
        ? err.message
        : "An unexpected error occurred"
    }
  });
});
```

---

## 20. Fix Plan — Phase 4: DevOps & Infrastructure

Complete alongside Phase 3.

---

### F-36 — Add Redis persistence volume

**File:** `docker-compose.yml`

```yaml
redis:
  image: redis:alpine
  container_name: quizbuzz-redis
  command: redis-server --appendonly yes --appendfsync everysec
  ports:
    - "6379:6379"
  volumes:
    - quizbuzz-redis-data:/data
  restart: unless-stopped

volumes:
  quizbuzz-mongo-data:
  quizbuzz-mongo-config:
  quizbuzz-redis-data:   # ADD THIS
```

---

### F-37 — Add Docker healthchecks

**File:** `docker-compose.yml`

```yaml
mongo:
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 20s

redis:
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 5s
    timeout: 3s
    retries: 5

backend:
  depends_on:
    mongo:
      condition: service_healthy
    redis:
      condition: service_healthy

worker:
  depends_on:
    mongo:
      condition: service_healthy
    redis:
      condition: service_healthy
```

---

### F-38 — Create .env.example files

**File:** `Backend/.env.example`

```env
# Server
PORT=5000
NODE_ENV=development
API_VERSION=1.0.0

# Database
MONGODB_URL=mongodb://mongo:27017/quizbuzz

# Redis
REDIS_URL=redis://redis:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# SMS OTP (SH Tech / Bulk SMS)
SMS_OTP_USER_NAME=your_sms_username
SMS_OTP_PASSWORD=your_sms_password
SMS_OTP_SENDER_ID=QUIZBZ
SMS_OTP_PE_ID=your_pe_id
SMS_OTP_SHTECH_URL=https://your-sms-provider-url
SMS_OTP_USER_AGENT=YourApp/1.0
SMS_OTP_QUIZBUZZ_TEMPLATE_ID=your_template_id

# WhatsApp OTP
WHATSAPP_OTP_API_KEY=your_whatsapp_api_key
WHATSAPP_OTP_API_URL=https://your-whatsapp-provider-url

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
WEBHOOK_SECRET=your_webhook_hmac_secret
```

**File:** `Frontend/.env.example`

```env
# API base URL (no trailing slash)
VITE_URL=http://localhost:5000/api

# WebSocket URL (no trailing slash, no /ws/ path)
VITE_WEBSOCKET_URL=http://localhost:5000

# Question encryption key (AES-256)
# Note: this key is visible in the browser bundle — treat as obfuscation only
VITE_SECRET_KEY=your-question-encryption-key-here
```

---

### F-39 — Add real CI/CD test step

**File:** `.github/workflows/deploy.yml`

```yaml
test:
  name: Test
  runs-on: ubuntu-latest
  services:
    redis:
      image: redis:alpine
      ports: ['6379:6379']
      options: --health-cmd "redis-cli ping" --health-interval 5s
    mongo:
      image: mongo:7
      ports: ['27017:27017']
      options: --health-cmd "mongosh --eval \"db.adminCommand('ping')\"" --health-interval 10s
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: Backend/package-lock.json
    - name: Install dependencies
      run: cd Backend && npm ci
    - name: Run tests
      run: cd Backend && npm test
      env:
        NODE_ENV: test
        JWT_SECRET: test-secret-key
        MONGODB_URL: mongodb://localhost:27017/quizbuzz-test
        REDIS_URL: redis://localhost:6379
```

---

### F-40 — Add deployment rollback

**File:** `.github/workflows/deploy.yml`

```yaml
- name: Deploy via SSH
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.VPS_HOST }}
    username: ${{ secrets.VPS_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    port: 2222
    script: |
      set -e
      cd /var/www/quizbuzz

      # Store current git hash for rollback reference
      PREV_HASH=$(git rev-parse HEAD)
      echo "Previous commit: $PREV_HASH"

      git fetch origin
      git checkout ${{ github.ref_name }}
      git pull origin ${{ github.ref_name }}

      # Deploy with rollback on failure
      if docker compose up -d --build; then
        echo "Deploy successful"
        docker compose ps
      else
        echo "Deploy failed — rolling back to $PREV_HASH"
        git checkout $PREV_HASH
        docker compose up -d --build
        exit 1
      fi
```

---

### F-41 — Fix Dockerfile non-root user and Node version

**File:** `Backend/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000
CMD ["node", "server.js"]
```

**File:** `Frontend/Dockerfile`

```dockerfile
# Build stage — align to node:20
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

### F-42 — Add Redis adapter for Socket.io

**File:** `Backend/server.js`

```bash
npm install @socket.io/redis-adapter
```

```js
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

// Create dedicated pub/sub clients for Socket.io adapter
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

const io = new Server(server, {
  path: "/ws/",
  cors: {
    origin: ["https://quiz.ysminfosolution.com", "http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

// Attach Redis adapter for horizontal scaling support
io.adapter(createAdapter(pubClient, subClient));
```

---

## 21. Fix Plan — Phase 5: Missing Features & Polish

Complete after Phases 1–4 are stable.

---

### F-43 — Write minimum test suite

Priority test files to create in `Backend/tests/`:

```
tests/
  auth.test.js         → login (valid, invalid, deleted user)
  validateCreds.test.js → wrong slug, wrong phone, duplicate submission
  submit.test.js        → happy path, double submission = 400
  evaluation.test.js    → correct scoring, negative marking, skipped questions
  adminMiddleware.test.js → blocked for role=user, allowed for role=admin
```

Use `mongodb-memory-server` and `redis-memory-server` for isolated test environments.

---

### F-44 — Add token refresh endpoint

**File:** `Backend/routes/authRoutes.js`

```js
router.post("/refresh", authMiddleware, async (req, res) => {
  try {
    const newToken = jwt.sign(
      {
        userId: req.user.userId,
        sessionId: req.sessionId,
        role: req.user.role,
        email: req.user.email,
        userName: req.user.userName,
        ...(req.user.contestId ? { contestId: req.user.contestId } : {})
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ token: newToken });
  } catch (error) {
    res.status(500).json({ message: "Token refresh failed" });
  }
});
```

In the frontend, check token expiry 30 minutes before expiry and call the refresh endpoint automatically.

---

### F-45 — Implement real webhook HMAC verification

**File:** `Backend/controller/admin/paymentController.js`

```js
export const handleWebhook = async (req, res) => {
  try {
    const sig = req.headers['x-webhook-signature'];
    if (!sig) {
      return res.status(401).json({
        success: false,
        error: { code: 'MISSING_SIGNATURE', message: 'Webhook signature is required' }
      });
    }

    // Verify HMAC signature
    const crypto = await import('crypto');
    const body = req.body; // must be raw Buffer — express.raw() is already applied
    const expected = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (!crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expected, 'hex')
    )) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' }
      });
    }

    // Parse body after verification
    const validatedData = webhookPaymentSchema.parse(JSON.parse(body));
    // ... rest of webhook handling
  }
};
```

---

### F-46 — Wrap LiveContest in ErrorBoundary

**File:** `Frontend/src/App.jsx`

```jsx
import ErrorBoundary from './components/ErrorBoundary';

// Wrap the LiveContest route:
<Route
  path="/contest/live/:contestId"
  element={
    <ErrorBoundary
      onReset={() => {
        // Clear stale state before retry
        localStorage.removeItem('contestInfo');
        localStorage.removeItem('userInfo');
        window.location.href = '/contest/join';
      }}
    >
      <LiveContest />
    </ErrorBoundary>
  }
/>
```

---

### F-47 — Clear stale localStorage on submission

**File:** `Frontend/src/pages/LiveContest.jsx`

```js
// In handleSubmitContest, after successful navigation:
if (submissionSuccessful) {
  // Clean up proctoring resources
  try { stopFaceMonitor(); } catch (e) {}
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());

  // Clear stale session data
  const slug = contestInfo.current?.slug;
  if (slug) localStorage.removeItem(`questions_${slug}`);
  localStorage.removeItem('contestInfo');
  localStorage.removeItem('userInfo');
  // Keep contestToken briefly for the result page, clear after

  navigate(`/contest/result/evaluate/${finalSubmissionId}`);
}
```

---

### F-48 — Add missing MongoDB indexes

**File:** `Backend/Models/DB.js`

```js
// After model definitions:

// User — for validateCredentials lookup
userSchema.index({ registrationId: 1 });

// Contest — for landing page active contest query
contestSchema.index({ startTime: 1, isDeleted: 1 });

// Submission — for leaderboard sorting
submissionSchema.index({ contestId: 1, score: -1 });

// Payment — for admin payment management
paymentsSchema.index({ contestRef: 1, createdAt: -1 });
paymentsSchema.index({ userRef: 1 });
paymentsSchema.index({ status: 1, createdAt: -1 });
```

---

### F-49 — Add security headers to Nginx

**File:** `Frontend/nginx.conf`

```nginx
server {
  listen 80;
  server_name localhost;

  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Content-Security-Policy
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' wss: https:;" always;

  root /usr/share/nginx/html;
  index index.html;

  # ... rest of existing config
}
```

---

### F-50 — Pre-load TensorFlow model during WaitingRoom

**File:** `Frontend/src/services/faceMonitor.js`

```js
// Add a preload export:
export async function preloadModel() {
  if (!detector) {
    await loadModel();
    console.log('Face detection model pre-loaded');
  }
}
```

**File:** `Frontend/src/pages/WaitingRoom.jsx`

```js
// Add after camera permission is granted:
useEffect(() => {
  if (cameraPermission === 'granted') {
    import('../services/faceMonitor.js')
      .then(m => m.preloadModel?.())
      .catch(err => console.warn('Model pre-load failed:', err));
  }
}, [cameraPermission]);
```

---

### F-51 — Fix typos in error messages

**File:** `Backend/Models/zodSchmea.js`

```js
// Before → After:
"Title must be less than 200 charactoe"
  → "Title must be less than 200 characters"

"Description must be less than 1000 charactors"
  → "Description must be less than 1000 characters"

"Rank <to> must be greater than or equal ro rank <from>"
  → "Rank <to> must be greater than or equal to rank <from>"

"cannot be in the past fro published contetss"
  → "cannot be in the past for published contests"
```

**File:** `Backend/controller/contestController.js`

```js
// submitContest error response:
"Internal serverS ERRROR"  →  "Internal Server Error"
"EEROR:"                   →  "ERROR:"
console.log("New Submisssion")  →  console.log("New Submission")
```

**File:** `Backend/socket.js`

```js
console.log("Initial websockets")  →  console.log("Initializing WebSockets")
```

---

## 22. Environment Variables Reference

### Backend (complete list)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |
| `API_VERSION` | No | Reported in `/health` response |
| `MONGODB_URL` | **Yes** | MongoDB connection string |
| `REDIS_URL` | **Yes** | Redis connection string |
| `JWT_SECRET` | **Yes** | Secret for JWT signing (min 32 chars) |
| `SMS_OTP_USER_NAME` | Yes (prod) | SMS provider username |
| `SMS_OTP_PASSWORD` | Yes (prod) | SMS provider password |
| `SMS_OTP_SENDER_ID` | Yes (prod) | SMS sender ID |
| `SMS_OTP_PE_ID` | Yes (prod) | SMS PE ID (DLT compliance) |
| `SMS_OTP_SHTECH_URL` | Yes (prod) | SMS provider API URL |
| `SMS_OTP_USER_AGENT` | Yes (prod) | HTTP User-Agent for SMS requests |
| `SMS_OTP_QUIZBUZZ_TEMPLATE_ID` | Yes (prod) | DLT approved template ID |
| `WHATSAPP_OTP_API_KEY` | Yes (prod) | WhatsApp API key |
| `WHATSAPP_OTP_API_URL` | Yes (prod) | WhatsApp API endpoint |
| `RAZORPAY_KEY_ID` | Yes (prod) | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | Yes (prod) | Razorpay private key |
| `WEBHOOK_SECRET` | Yes (prod) | HMAC secret for webhook verification |

### Frontend (complete list)

| Variable | Required | Description |
|---|---|---|
| `VITE_URL` | **Yes** | Backend API base URL (e.g. `https://quiz.ysminfosolution.com/api`) |
| `VITE_WEBSOCKET_URL` | **Yes** | WebSocket server URL (e.g. `https://quiz.ysminfosolution.com`) |
| `VITE_SECRET_KEY` | **Yes** | AES encryption key for question caching |

---

## 23. Branch Comparison Summary

| Feature / Change | `main` | `second` | `third` |
|---|---|---|---|
| Real OTP implementation | ✅ Full | ✅ Full | ❌ Bypassed (dev mode) |
| Admin layout (Sidebar/Navbar) | ❌ | Partial | ✅ Complete |
| ShadCN UI components | ❌ | Partial | ✅ |
| `AdminRoute` guard | Basic | Improved | ✅ JWT decode, role check |
| Duplicate `context/` directory | ❌ | Present | ⚠️ Both present (stale not deleted) |
| Question bank route | ❌ | ❌ | ✅ Added |
| Participant routes behind auth | ❌ Questions were public | Partial | ✅ All protected |
| `GET /contests/active` endpoint | ❌ | ❌ | ✅ Added |
| Bulk route ordering (before /:id) | ❌ | Partial | ✅ Fixed |
| CI/CD pipeline | GitLab CI | GitHub Actions (broken) | GitHub Actions (broken, same bug) |
| Docker MongoDB config volume | ❌ | ❌ | ✅ Added |
| Redis persistence | ❌ | ❌ | ❌ Still missing |
| Login response includes userInfo | ❌ | Partial | ✅ firstName, lastName, role |

---

## 24. Execution Checklist

Use this checklist during implementation. Complete phases in order.

### Phase 1 — Critical (do before merging to production)

- [ ] F-01 — Restore real OTP implementation (sendOtp, resendOtp, verifyOtp)
- [ ] F-02 — Add `isDeleted: false` to login query
- [ ] F-03 — Add `adminMiddleware` to payment routes
- [ ] F-04 — Add `await` to `areAllJobsCompleted()` in leaderboard
- [ ] F-05 — Remove hardcoded `slug = 'quizbuzz-3'` default
- [ ] F-06 — Remove seed credentials from `connectDB()` → move to `scripts/seed.js`
- [ ] F-07 — Uncomment `app.use(globalRateLimit)` and add `authRateLimit` to login
- [ ] F-08 — Add `authMiddleware` to `/api/logs`
- [ ] F-09 — Fix `setex` → `setEx` in `contestParticipantsController.js`
- [ ] F-10 — Fix Certificate field names (`contestId` → `contestRef`, `participantId` → `userRef`)
- [ ] F-11 — Remove trailing slash from Socket.io CORS origin in `server.js`
- [ ] F-12 — Fix CI/CD to deploy the pushed branch, not always `main`

### Phase 2 — High severity (within first week)

- [ ] F-13 — Fix `getContestStatus` to respect DB status field
- [ ] F-14 — Add null check in `updateContest` before accessing `existingContest.startTime`
- [ ] F-15 — Change `createdBy: req.user?.id` → `req.user?.userId`
- [ ] F-16 — Replace hardcoded stats with real MongoDB aggregation
- [ ] F-17 — Standardise payment amount unit across all controllers
- [ ] F-18 — Implement real CSV export (replace fake CDN URL)
- [ ] F-19 — Fix `KeyGenerator` → `keyGenerator` in rate limit middleware
- [ ] F-20 — Clean up Redis config (remove ioredis options)
- [ ] F-21 — Add null guard redirect in `WaitingRoom.jsx`
- [ ] F-22 — Handle 400 "already submitted" as success in retry loop
- [ ] F-23 — Reduce auto-save interval from 5 min to 60 seconds
- [ ] F-24 — Delete `src/context/` directory (old AuthContext)
- [ ] F-25 — Fix `cutoff` → `cutOff` in Zod schema to match DB field

### Phase 3 — Code quality (within two weeks)

- [ ] F-26 — Rename `zodSchmea.js`, `zodParticipantsSchemee.js`, `optSms.js` + update imports
- [ ] F-27 — Fix participant status filter to query Submissions not User.contestStatus
- [ ] F-28 — Extract `questionRoutes.js` inline handlers into `questionController.js`
- [ ] F-29 — Remove unused `Admin` model from `DB.js`
- [ ] F-30 — Replace `redisClient.keys()` with `scanIterator` everywhere
- [ ] F-31 — Wire Winston logger; replace debug `console.log` in controllers
- [ ] F-32 — Create `api.js` centralised fetch wrapper; refactor all raw fetch calls
- [ ] F-33 — Fix option shuffling to preserve original index for server-side evaluation
- [ ] F-34 — Use `contest.cutOff` for leaderboard threshold instead of hardcoded 50
- [ ] F-35 — Add global Express error handler and 404 middleware to `app.js`

### Phase 4 — DevOps & infrastructure (alongside Phase 3)

- [ ] F-36 — Add Redis persistence volume to `docker-compose.yml`
- [ ] F-37 — Add Docker healthchecks for all services
- [ ] F-38 — Create `Backend/.env.example` and `Frontend/.env.example`
- [ ] F-39 — Replace fake test step with real Jest test run in CI pipeline
- [ ] F-40 — Add deployment rollback mechanism to CI/CD script
- [ ] F-41 — Align Node.js version across Dockerfiles; add non-root user to backend
- [ ] F-42 — Add `@socket.io/redis-adapter` for multi-instance readiness

### Phase 5 — Missing features & polish (after Phases 1–4 stable)

- [ ] F-43 — Write minimum Jest test suite (auth, validation, submit, evaluation, middleware)
- [ ] F-44 — Add `POST /api/auth/refresh` token refresh endpoint
- [ ] F-45 — Implement real HMAC signature verification in webhook handler
- [ ] F-46 — Wrap `LiveContest` in `ErrorBoundary` in `App.jsx`
- [ ] F-47 — Clear stale localStorage (questions, contestInfo, userInfo) after submission
- [ ] F-48 — Add missing MongoDB indexes (User.registrationId, Contest, Submission, Payment)
- [ ] F-49 — Add security headers to `nginx.conf`
- [ ] F-50 — Pre-load TensorFlow/MediaPipe model during `WaitingRoom` stage
- [ ] F-51 — Fix all typos in Zod error messages and controller response strings

---

*Total fixes: 51 across 5 phases. A full-time developer can complete Phases 1–3 in approximately 3–4 days and all 5 phases in under two weeks.*