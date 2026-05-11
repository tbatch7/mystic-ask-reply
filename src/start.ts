import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { supabase } from "./integrations/supabase/client";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const supabaseAuthHeaderMiddleware = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers["authorization"] = `Bearer ${token}`;
    }
    return next({ headers });
  }
);

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [supabaseAuthHeaderMiddleware],
}));
