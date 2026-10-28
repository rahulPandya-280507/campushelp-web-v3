# CampusHelp Web

Responsive React + Vite prototype for the CampusHelp college assistance project.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually http://localhost:5173).

## Admin demo

- Admin URL: `/admin`
- Username: `admin`
- Password: `CampusHelp@123`
- The admin link is intentionally hidden from the student navigation.
- The login is a front-end demonstration only. It uses browser session storage and is NOT secure authentication. Do not use it to protect real student data or deploy it as a production security boundary. A real deployment needs server-side authentication, authorization checks, and a database.

## What's included

- Student overview dashboard
- Fictional campus map with 15 locations and weighted walking connections
- Dijkstra shortest-path route planning
- Browser geolocation permission flow and simulated campus position
- Issue reporting, complaint IDs, priority classification, and complaint tracking
- Demo admin report status management behind the `/admin` login page
- Responsive layout refinements to prevent horizontal page overflow on mobile
- Local browser storage for demo reports

## Important limitations

Reports are stored only in the current browser. The real GPS coordinates cannot be accurately placed on the imaginary campus map. The prototype does not contact emergency services, send notifications, or connect to a real college.

Build for deployment:

```bash
npm run build
```

Vite output directory: `dist`.
