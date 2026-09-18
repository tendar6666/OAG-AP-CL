# OAG Audit Program & Checklist - Handover Documentation

This document contains all the necessary technical information for the Tibetan Computer Resource Centre (TCRC) to take over, run, maintain, and deploy the Office of the Auditor General (OAG) Audit Program & Checklist application.

## 1. Tech Stack Overview
* **Frontend Framework:** Next.js (React) using the App Router.
* **Language:** TypeScript.
* **Styling:** Tailwind CSS.
* **Backend / Database:** Firebase Firestore (NoSQL).
* **Authentication:** Firebase Authentication (Email/Password).
* **Hosting:** Firebase Hosting.
* **Notifications:** ntfy.sh (Open-source push notifications).

## 2. Access & Ownership Required
To fully manage this project, TCRC must have access to:
1. **The GitHub Repository:** Contains this source code.
2. **The Firebase Console:** Go to [console.firebase.google.com](https://console.firebase.google.com/), select the project `oag-audit-management-online`, and ensure TCRC's Google account is listed as an **Owner** under *Project Settings -> Users and permissions*.

## 3. Local Development Setup
To run the code on a new machine, follow these steps:

### Prerequisites
* Install **Node.js** (v18 or higher recommended).
* Install **Git**.

### Installation
1. Clone the repository from GitHub:
   ```bash
   git clone <github-repo-url>
   cd "Audit Program Online"
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Run the local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 4. Deployment Instructions
The application is statically exported (`output: 'export'` in `next.config.ts`) and hosted on Firebase Hosting. 

To deploy an update to the live website:
1. Compile the code for production:
   ```bash
   npm run build
   ```
2. Deploy the compiled files to Firebase:
   ```bash
   npx firebase-tools deploy --only hosting
   ```
*(Note: You will need to be logged into Firebase CLI (`npx firebase-tools login`) with an account that has Owner/Editor access to the project).*

## 5. Super Admin Account
If TCRC needs to log into the live website to manage units, templates, or users, they can use the master Super Admin account:
* **Email:** `admin@test.com`
* **Password:** `Admin123`

*(It is highly recommended that TCRC logs into the app, creates their own official Admin accounts, and changes this default password).*

## 6. Project Architecture Notes
* **Firebase Config:** The Firebase client configuration is located in `src/lib/firebase.ts`. Because this is a client-side Firebase app, these API keys are safe to be public and do not need to be hidden in `.env` files.
* **API / Database Calls:** All Firestore queries and mutations are centralized in `src/lib/api.ts`.
* **State Management:** Global state (like the current user and active theme) is managed via React Context in `src/context/`.
