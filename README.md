# TrendyPass Gate Officer

The Gate Officer flow uses the existing Expo SDK 58 / React Native stack, Expo Router,
TrendyPass tokens, and bundled Barlow / JetBrains Mono fonts. The original Dispatch
Home at `/` is preserved. Start the officer flow at `/gate`.

```bash
npm install
npx expo start --web --port 8082
```

Use a supported Node version (Node 24 LTS is recommended). The API uses Node's built-in
SQLite module. See [Gate Officer setup, previews, backend, and verification](docs/gate-officer.md).

| Assigned screen | Preview path |
| --- | --- |
| Vehicle Released | `/vehicle-released?preview=design` |
| Pass Rejected | `/pass-rejected?preview=design` |
| Offline Sync Queue | `/sync-queue?preview=offline` |
| All Scans Synced | `/sync-queue?preview=synced` |
| Shipments | `/shipments?preview=design` |

Live screens use `/gate`, `/scan`, `/shipments`, and `/sync-queue`. Scan outcomes open
`/vehicle-released?scanId=…` or `/pass-rejected?scanId=…`. For an end-to-end local demo,
open `/scan?demo=1`, load an unused sample pass, and press **Verify & release**.

## Original Expo setup

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
