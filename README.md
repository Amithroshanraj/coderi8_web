# CodeRi8 Project

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Webinar registration (test deployment)

The `/webinar-registration` route posts to the Netlify Function at
`/.netlify/functions/webinar-register`. The function validates and normalizes
submissions, signs its server-to-server request to Google Apps Script, and only
returns the selected WhatsApp group after Apps Script confirms the saved
registration.

Use only the isolated test Apps Script deployment and a copy of the spreadsheet
when testing. Configure `WEBINAR_APPS_SCRIPT_URL`,
`WEBINAR_IDEMPOTENCY_SECRET`, and `WEBINAR_APPS_SCRIPT_HMAC_SECRET` as
server-side Netlify environment variables. The Apps Script Script Properties
must contain the matching idempotency secret, the matching HMAC secret under
`WEBINAR_HMAC_SECRET`, and the test spreadsheet ID under
`WEBINAR_SPREADSHEET_ID`. Never use `VITE_`-prefixed variables for secrets or
commit actual secret values.

Run the mocked registration tests with `npm test`; they do not contact Apps
Script or write to a spreadsheet. The Netlify runtime is set to Node 22.12.0
to meet the minimum runtime required by the Netlify Blobs packages.

## How can I deploy this project?

This project can be deployed to various platforms including Vercel, Netlify, or Cloudflare Pages.
