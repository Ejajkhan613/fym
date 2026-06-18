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

For local Expo development, set the backend gateway port in `.env`:

```bash
EXPO_PUBLIC_API_PORT=4000
```

When `EXPO_PUBLIC_API_BASE_URL` is not set, the app derives the host from the
Expo dev server URL and connects to the backend gateway on that port. This works
for common LAN, simulator, and emulator runs. If you need a fixed URL, set:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
```

For Android emulator-only testing, `http://10.0.2.2:4000` is also valid. For a
physical phone, use your computer LAN IP if automatic host detection is not
available.

## Verification

```bash
npm run typecheck
```

No dev server is started by this verification command.
