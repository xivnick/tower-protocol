import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

declare const process: {
  env: Record<string, string | undefined>;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const appEnv = env.VITE_APP_ENV ?? process.env.VITE_APP_ENV ?? process.env.VERCEL_ENV ?? "";

  return {
    define: {
      __APP_ENV__: JSON.stringify(appEnv),
    },
    plugins: [react()],
  };
});
