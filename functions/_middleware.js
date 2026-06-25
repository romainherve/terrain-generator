// Runs before every Function route. Ships DISABLED (open read/write, per project choice).
// To require a shared password later: set a Pages env var APP_PASSWORD, uncomment the block,
// and have the frontend send the `x-app-password` header (one slot is already prepared in cloudApi).
export async function onRequest(context) {
  // const REQUIRED = context.env.APP_PASSWORD;
  // if (REQUIRED && context.request.headers.get('x-app-password') !== REQUIRED) {
  //   return new Response(JSON.stringify({ error: 'unauthorized' }), {
  //     status: 401, headers: { 'content-type': 'application/json' },
  //   });
  // }
  return context.next();
}
