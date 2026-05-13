# TVK Mylapore — Mobile App (Expo)

Single React Native / Expo app that combines the two web experiences:

- **Citizen flow** (mirrors `grievance-portal`): browse services, raise grievances with location + photos, track tickets, view events.
- **Admin flow** (mirrors `frontend`): dashboard, members, service requests, voters, campaigns, events, flow images.

One unified login screen routes the user to the appropriate experience based on which credentials they enter.

## Setup

```bash
cd mobile
npm install
```

Set the backend URL in `app.json` → `expo.extra.apiBaseUrl`, **or** create a `.env` and start with the override:

```bash
# .env (gitignored)
EXPO_PUBLIC_API_BASE_URL=https://your-backend.example.com/api
```

## Run

```bash
npm start            # opens Expo dev tools
npm run android      # build to a connected Android device / emulator
npm run ios          # macOS only
```

Install **Expo Go** on your phone and scan the QR code for the fastest dev loop. Both Android and iOS share the same JS bundle.

## Project structure

```
src/
├── api/               axios client + per-resource endpoints
├── components/        Button, Input, Card, Screen, EmptyState, …
├── navigation/        RootNavigator (decides auth | citizen | admin)
├── screens/
│   ├── LoginScreen.js      unified login (admin or citizen)
│   ├── SplashScreen.js
│   ├── ProfileScreen.js    shared profile + logout
│   ├── user/               citizen-facing screens
│   └── admin/              admin-facing screens
├── store/AuthContext.js    role, token, login, logout
├── config.js              API base URL + feature flags
└── theme.js               colors, spacing, typography
```

## Native features

- **Location** via `expo-location` — attached to every new grievance.
- **Camera + Photo library** via `expo-image-picker` — citizens can attach up to 3 photos per ticket.
- **Push notifications** via `expo-notifications` — registered token is POSTed to `/api/portal/push-token` (citizens) or `/api/auth/push-token` (admins) so the backend can fan out updates.

Permissions are declared in `app.json` and requested at runtime in the relevant screens (not on launch — this keeps the first-run impression friendly).

## Build for stores

1. Install EAS CLI: `npm install -g eas-cli`
2. `eas login`
3. `eas build:configure`
4. `eas build --platform android` (or `ios`)

Set `expo.extra.eas.projectId` in `app.json` to the value EAS gives you on first build.
