// Health gate for blue-green deploys: kamisama-deploy.sh polls
// http://127.0.0.1:<port>/health until it returns 200 before flipping nginx.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", {
    headers: { "cache-control": "no-store", "content-type": "text/plain" },
  });
}
