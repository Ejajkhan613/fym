# FYM Web

Next.js web UI for Find Your Medicines.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- TanStack Query
- Zustand
- Socket.IO client
- React Hook Form and Zod
- MapLibre GL
- Lucide React

## Structure

```text
web/
  src/
    app/
      (auth)/
      (customer)/
      (pharmacy)/
      (rider)/
      (admin)/
      api/
    components/
      layout/
      navigation/
    features/
      auth/
      users/
      customers/
      pharmacies/
      catalog/
      prescriptions/
      cart/
      orders/
      matching/
      payments/
      delivery/
      notifications/
      support/
      penalties/
      audit/
      analytics/
      admin/
    shared/
      api/
      config/
      constants/
      hooks/
      providers/
      types/
      ui/
      utils/
```

## Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run verify
```

`npm run dev` is available for local development when you want to start the web
app.

## Environment

Copy `.env.example` values into your local env file and point
`NEXT_PUBLIC_API_BASE_URL` at the API gateway.
