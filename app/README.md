# FYM Expo App

Customer mobile app for **Find Your Medicines** built with Expo and React Native.

## Stack

- Expo SDK 56
- React Native 0.85
- TypeScript
- `lucide-react-native` for icons
- Expo Secure Store, Image Picker, and Document Picker

## Backend

The app talks to the API gateway routes already defined in `backend`:

- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `GET /medicines/search`
- `POST /cart/items`
- `POST /orders`
- `POST /prescriptions/upload`

Set the API gateway URL in `.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
```

For Android emulator testing, use `http://10.0.2.2:4000`. For a physical phone, use your computer LAN IP.

## Verification

```bash
npm run typecheck
```

No dev server is started by this verification command.
