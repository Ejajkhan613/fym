export function GET() {
  return Response.json({
    service: "@fym/web",
    status: "ok",
  });
}
