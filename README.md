# SmartPrescription

SmartPrescription is a cross-platform mobile app built with Expo and React Native to help users manage, track, and be
reminded of their medical prescriptions. The app provides a user-friendly interface for adding, viewing, and organizing
prescriptions, as well as receiving timely reminders.

## Features

- Add, edit, and delete medical prescriptions
- View prescriptions in a calendar agenda and table format
- Receive reminders for medication times
- Manage user settings and preferences
- AI-powered prescription extraction (using Azure AI Inference)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Installation

1. Clone the repository:

  ```bash
  git clone https://github.com/yudonglin/SmartPrescription.git
  cd SmartPrescription
  ```

2. Install dependencies:

  ```bash
  npm install
  ```

### Running the App

Start the Expo development server:

```bash
npx expo start
```

You can then run the app on your device using Expo Go, or in an emulator/simulator for Android or iOS.

### Resetting the Project

To reset the project to a blank state:

```bash
npm run reset-project
```

## Project Structure

- `app/` - Main app screens and navigation (file-based routing)
- `components/` - Reusable UI components
- `models/` - Data models and schemas
- `services/` - Business logic and data services
- `constants/` - App-wide constants (e.g., colors)
- `hooks/` - Custom React hooks
- `assets/` - Fonts and images
- `scripts/` - Utility scripts

## Tech Stack

- [Expo](https://expo.dev/) & [React Native](https://reactnative.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Azure AI Inference](https://learn.microsoft.com/en-us/azure/ai-services/)
- [React Navigation](https://reactnavigation.org/)
- [Jest](https://jestjs.io/) for testing

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements and bug fixes.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
