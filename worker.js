export default {
  async fetch(request, env) {
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://extra82.pages.dev",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "EXTRA MONEY Worker connected"
      }),
      { headers }
    );
  }
};
