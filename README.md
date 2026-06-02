# CitizenCare

> AI-powered civic issue tracking platform connecting citizens with local authorities.

Citizens report problems. AI analyses them. Admins resolve them. Everyone stays informed — in real time.

---

## Features

### For Citizens

- **Report Issues** — Submit civic problems with title, description, location, state/UT, and an optional photo
- **Similar Issue Warning** — Debounced search alerts you if a matching issue already exists before you submit
- **AI Analysis** — Every submission is automatically summarised, categorised, sentiment-scored, and priority-rated by Groq LLM
- **My Issues** — View all your submissions with full detail, status timeline, and admin notes
- **Satisfaction Rating** — Rate resolved issues with 1–5 stars and optional feedback
- **Community Feed** — Browse and upvote all public issues, filter by status, search by keyword
- **Real-time Notifications** — Bell icon with live Socket.io push when your issue status changes
- **Profile Stats** — Personal dashboard showing resolution rate, category breakdown, and recent activity

### For Admins

- **Issue Dashboard** — View, filter, sort, and search all citizen issues
- **Status Management** — Update issue status with notes; triggers email + socket notification to the submitter
- **Bulk Actions** — Select multiple issues to change status or delete in one action
- **Overdue Tracking** — Issues pending for 7+ days are flagged automatically
- **Department Assignment** — Route issues to specific departments
- **Analytics** — Charts for issue trends, category breakdown, resolution rates, and sentiment distribution
- **Export CSV** — Download all filtered issues as a CSV file

### Public

- **Issue Map** — India choropleth map showing issue density by state with hover tooltips and drill-down

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS v4, Shadcn/UI |
| Routing | React Router v6 |
| Auth | Clerk (JWT, email-based admin role) |
| Real-time | Socket.io |
| Map | react-simple-maps (SVG choropleth) |
| Backend | Node.js, Express 4 |
| Database | MongoDB Atlas (Mongoose) |
| AI | Groq SDK — `llama-3.1-8b-instant` |
| Email | Nodemailer (Gmail SMTP) |

---

## Project Structure

```text
CitizenCare/
├── client/               # React frontend (Vite)
│   ├── public/
│   │   └── india-states.json   # India GeoJSON (ST_NM property)
│   └── src/
│       ├── pages/
│       │   ├── LandingPage.jsx
│       │   ├── CitizenPortal.jsx   # Issue submission + similar issue warning
│       │   ├── MyIssues.jsx        # Citizen's issues + rating
│       │   ├── Feed.jsx            # Public community feed + upvoting
│       │   ├── IssueMap.jsx        # India choropleth map
│       │   ├── Profile.jsx         # Citizen stats profile
│       │   ├── AdminDashboard.jsx  # Admin issue management
│       │   └── Analytics.jsx       # Admin analytics charts
│       ├── components/
│       │   ├── Navbar.jsx              # Role-aware nav + notification bell
│       │   ├── StatusTimeline.jsx      # Issue status history timeline
│       │   └── SocketNotifications.jsx # Background socket listener
│       ├── contexts/
│       │   └── NotificationContext.jsx # Notification state + localStorage
│       └── lib/
│           └── api.js              # Axios instance
└── server/               # Express backend
    ├── models/
    │   └── Issue.js        # Mongoose schema
    ├── routes/
    │   └── issues.js       # All issue endpoints
    └── server.js           # Express + Socket.io setup
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- MongoDB Atlas account
- Clerk account
- Groq API key
- Gmail account with App Password (for email notifications)

### 1. Clone the repository

```bash
git clone https://github.com/PRATYAKSH15/CitizenCare.git
cd CitizenCare
```

### 2. Configure the server

```bash
cd server
npm install
```

Create `server/.env`:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/citizencare
GROQ_API_KEY=your_groq_api_key
ADMIN_EMAILS=admin@example.com,other@example.com
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
PORT=5000
```

### 3. Configure the client

```bash
cd ../client
npm install --legacy-peer-deps
```

Create `client/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_ADMIN_EMAILS=admin@example.com,other@example.com
VITE_API_URL=http://localhost:5000/api
```

### 4. Run the app

In two terminals:

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Environment Variables Reference

### Server (`server/.env`)

| Variable | Description |
| --- | --- |
| `MONGO_URI` | MongoDB Atlas connection string |
| `GROQ_API_KEY` | Groq API key for LLM analysis |
| `ADMIN_EMAILS` | Comma-separated admin email addresses |
| `EMAIL_USER` | Gmail address for outgoing notifications |
| `EMAIL_PASS` | Gmail App Password |
| `PORT` | Server port (default: 5000) |

### Client (`client/.env`)

| Variable | Description |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `VITE_ADMIN_EMAILS` | Comma-separated admin emails (must match server) |
| `VITE_API_URL` | Backend API base URL |

---

## Admin Role

Admin access is granted to any signed-in user whose email matches `ADMIN_EMAILS` (both env vars must be kept in sync). Admins see the Dashboard and Analytics in the navbar; all citizen-facing routes are hidden for them.

---

## API Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/issues` | Citizen | Submit a new issue |
| `GET` | `/api/issues/my` | Citizen | Get own issues |
| `GET` | `/api/issues/feed` | Public | Community feed (sorted by votes) |
| `GET` | `/api/issues/search` | Public | Search issues by title (min 4 chars) |
| `GET` | `/api/issues/public` | Public | All issues with state (for map) |
| `GET` | `/api/issues` | Admin | All issues with filters |
| `PATCH` | `/api/issues/:id` | Admin | Update status / notes / department |
| `DELETE` | `/api/issues/:id` | Admin | Delete a single issue |
| `PATCH` | `/api/issues/bulk` | Admin | Bulk status update |
| `DELETE` | `/api/issues/bulk` | Admin | Bulk delete |
| `POST` | `/api/issues/:id/vote` | Public | Upvote an issue |
| `POST` | `/api/issues/:id/rate` | Citizen (owner) | Rate a resolved issue |
| `GET` | `/api/issues/analytics` | Admin | Aggregated analytics data |

---

## License

MIT
