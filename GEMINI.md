# GEMINI - CredVerse Ecosystem Context

This document provides a comprehensive overview of the CredVerse monorepo to be used as instructional context for future interactions with the Gemini CLI.

## Project Overview

The `credity-monorepo` is a suite of applications that form the **CredVerse Ecosystem**, a platform for digital credentialing. The system is designed to allow institutions to issue verifiable credentials, recruiters to verify them, and users to store and manage them in a digital wallet.

The project is positioned as a "trust verification platform" targeting the enterprise fraud prevention market.

The technology stack is primarily **TypeScript**, with **Node.js** and **Express.js** for the back-end services, and **React** (with **Vite**) for the front-end web applications. The mobile wallet is built with **React Native** and **Expo**. The project also involves blockchain technologies, likely for anchoring and verifying credentials, as indicated by the presence of `drizzle.config.ts` and mentions of smart contracts.

## Project Structure

The monorepo contains several distinct applications and a shared package:

- **`credverse-gateway/`**: The public-facing entry point to the ecosystem. It's a React application with a Node.js/Express.js backend.
- **`BlockWalletDigi/`**: The user's digital wallet for managing credentials. It appears to be a web-based wallet with a client and server component.
- **`CredVerseIssuer 3/`**: The application for institutions to issue credentials. It has a React front-end and a Node.js/Express.js back-end, and includes a `contracts/` directory, suggesting smart contract integration.
- **`CredVerseRecruiter/`**: The application for recruiters to verify credentials. It follows the same structure as the Issuer and Wallet.
- **`apps/mobile/`**: A React Native mobile application, presumably a mobile version of the BlockWallet.
- **`packages/shared-auth/`**: A shared library for authentication logic used across the different services.
- **`information__critical /`**: Contains key project documentation, including a detailed **Product Requirements Document (`PRD.md`)**.

## Building and Running

There is no root-level script to run all services. Each service must be run from its own directory.

### Installation

To install dependencies for all packages, you'll likely need to run `npm install` in each application's directory. Start with the root directory:

```bash
npm install
```

Then, for each service (e.g., `credverse-gateway`, `BlockWalletDigi`, etc.), navigate into its directory and install its specific dependencies:

```bash
cd <service-directory>
npm install
```

### Running the Services

Each web service has a similar command structure.

#### `credverse-gateway`

- **Run dev (frontend & backend):** `npm run dev:full`
- **Run dev (frontend only):** `npm run dev`
- **Run dev (backend only):** `npm run dev:server`
- **Build for production:** `npm run build`
- **Start in production:** `npm start`

#### `BlockWalletDigi`, `CredVerseIssuer 3`, `CredVerseRecruiter`

These services share a similar set of scripts.

- **Run dev (backend):** `npm run dev`
- **Run dev (frontend):** `npm run dev:client`
- **Build for production:** `npm run build`
- **Start in production:** `npm start`

#### `apps/mobile` (Expo App)

- **Start development server:** `npm start`
- **Run on Android:** `npm run android`
- **Run on iOS:** `npm run ios`
- **Run in web browser:** `npm run web`

## Development Conventions

- **Language:** The entire codebase is written in **TypeScript**.
- **Monorepo Structure:** The project is structured as a monorepo, with multiple applications and a shared package. However, it does not appear to use a formal workspace manager like Lerna, pnpm workspaces, or npm workspaces.
- **Backend:** The backend services are built with **Node.js** and **Express.js**, using `tsx` for development.
- **Frontend:** The frontend applications are built with **React** and **Vite**.
- **Database:** The presence of `drizzle.config.ts` suggests the use of **Drizzle ORM** for database interactions, likely with a PostgreSQL database.
- **Testing:** The `CredVerseIssuer 3` package uses `vitest` for testing. Other packages may have different testing setups.
- **Documentation:** The `information__critical /` directory contains important project documentation. The `PRD.md` file is particularly detailed and should be consulted for any questions about the project's goals, features, or architecture.
