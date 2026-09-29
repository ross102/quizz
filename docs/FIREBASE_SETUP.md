# Firebase Setup

The app uses the Firebase Web SDK. The client reads its configuration from Vite environment variables and remains in demo mode when they are missing.

## Create a Firebase project

1. Open the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. In Project settings, add a Web app and copy its Firebase configuration values.
3. In Authentication, enable **Anonymous** sign-in. The app creates anonymous Firebase sessions in the background and presents no sign-in form.
4. Create a Cloud Firestore database in production mode. Choose the region carefully because the location cannot be changed later.
5. Deploy the rules in `firestore.rules` from the Firestore Rules tab.
6. In the project root, copy `.env.example` to `.env.local` and fill in the values from the Web app configuration.
7. Restart the Vite development server after changing `.env.local`.

```sh
cp .env.example .env.local
npm run dev
```

`.env.local` is ignored by Git. Never put service-account credentials or Admin SDK private keys in a Vite environment file; all `VITE_` values are shipped to the browser.

## Quiz spreadsheet

Download `quiz-template.xlsx` from the Create quiz tab. Add one question per row with these columns: `#`, `Question`, `Choice 1` through `Choice 5`, `Points: Choice 1` through `Points: Choice 4`, `Max score`, `animal type`, `Minimum`, `Maximum`, `Description`, and `Recommendation`. The question and Choices 1 through 4 are required; Choice 5, points, and profile metadata are optional. A quiz can contain up to 30 questions. The numbered column is informational. Uploading a valid spreadsheet saves the quiz and makes it active immediately. `.xlsx` and `.csv` uploads are supported.

## Configuration

The Firebase client initializer is in `src/lib/firebase.ts`. It exports `firebaseConfigured`, `auth`, and `db`. Until all required Web app values are present, `auth` and `db` are `undefined`, allowing the frontend demo to remain usable.

All visitors use anonymous sessions in the background; there is no sign-in form. Any visitor can upload a quiz, and that upload atomically becomes the active quiz. The second admin tab lists all uploaded quizzes by name and lets any visitor switch the active quiz. Quiz documents retain their creator UID for ownership, while answer keys are never readable by clients.

Because quiz creation and active-quiz selection are open to every visitor by design, a visitor can replace the active quiz. If the app later needs a trusted host-only workflow, it will need a separate authorization mechanism or a backend moderation/hosting role.

Client-side Firebase configuration is not authorization. Keep the provided Firestore rules deployed before using the app with real users.