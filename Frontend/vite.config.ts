import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

const djangoNoncePlugin = (): Plugin => {
  return {
    name: "django-nonce-plugin",
    enforce: "post",
    transformIndexHtml(html) {
      return html
        .replace(/<script/g, '<script nonce="{{request.csp_nonce}}"')
        .replace(
          /<link rel="stylesheet"/g,
          '<link rel="stylesheet" nonce="{{request.csp_nonce}}"',
        )
        .replace(/<body/g, '<body nonce="{{request.csp_nonce}}"');
    },
  };
};

const copyIndexToDjango = (): Plugin => {
  return {
    name: "copy-index-to-django",
    closeBundle() {
      const distIndex = path.resolve(__dirname, "dist/index.html");
      const djangoIndex = path.resolve(__dirname, "../static/index.html");

      if (!fs.existsSync(distIndex)) {
        console.warn("⚠️ index.html não encontrado em dist/, verifique o build do Vite.");
        return;
      }

      fs.mkdirSync(path.dirname(djangoIndex), { recursive: true });
      fs.copyFileSync(distIndex, djangoIndex);
      console.log("✅ Copiado index.html → static/");
    },
  };
};

const copyAssetsToDjango = (): Plugin => {
  return {
    name: "copy-assets-to-django",
    closeBundle() {
      const distAssets = path.resolve(__dirname, "dist/assets");
      const djangoAssets = path.resolve(__dirname, "../static/assets");

      if (!fs.existsSync(distAssets)) {
        console.warn("⚠️ Pasta dist/assets não encontrada!");
        return;
      }

      fs.rmSync(djangoAssets, { recursive: true, force: true });
      fs.mkdirSync(djangoAssets, { recursive: true });
      fs.cpSync(distAssets, djangoAssets, { recursive: true });
      console.log("📁 assets → copiados para static/assets/");
    },
  };
};

const copyGeoToDjango = (): Plugin => {
  return {
    name: "copy-geo-to-django",
    closeBundle() {
      const distGeo = path.resolve(__dirname, "dist/geo");
      const djangoGeo = path.resolve(__dirname, "../static/geo");

      if (!fs.existsSync(distGeo)) {
        return;
      }

      fs.rmSync(djangoGeo, { recursive: true, force: true });
      fs.mkdirSync(djangoGeo, { recursive: true });
      fs.cpSync(distGeo, djangoGeo, { recursive: true });
      console.log("📁 geo → copiados para static/geo/");
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProd = mode === "production";
  const isHomolog = mode === "homolog";

  return {
    // Use "/" only for Vite dev server; build output targets Django static.
    base: command === "serve" ? "/" : "/static/",
    server: {
      host: "::",
      port: 5000,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      (isProd || isHomolog) && djangoNoncePlugin(),
      copyIndexToDjango(),
      copyAssetsToDjango(),
      copyGeoToDjango(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
