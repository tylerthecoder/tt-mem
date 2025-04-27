import { neonConfig } from "@neondatabase/serverless";

console.log("VERCEL_ENV", process.env.VERCEL_ENV);

// This is the only code that will be different in development
if (process.env.VERCEL_ENV === "development") {
    console.log("Development environment detected");
    neonConfig.wsProxy = (host) => `${host}:54330/v1`;
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineTLS = false;
    neonConfig.pipelineConnect = false;
}

export * from "@vercel/postgres";