import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("brands the application as NOVI", async () => {
  const [layout, manifest, favicon, appIcon, brandComponent, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/favicon.svg", import.meta.url), "utf8"),
    readFile(new URL("../public/brand/novi-app-icon.svg", import.meta.url), "utf8"),
    readFile(new URL("../app/components/brand/NoviLogo.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /title:\s*"NOVI"/);
  assert.match(layout, /applicationName:\s*"NOVI"/);
  assert.match(layout, /openGraph:\s*\{/);
  assert.match(layout, /twitter:\s*\{/);
  assert.match(manifest, /"name":\s*"NOVI"/);
  assert.match(manifest, /"short_name":\s*"NOVI"/);
  assert.match(manifest, /novi-app-icon\.svg/);
  assert.match(manifest, /"sizes":\s*"192x192"/);
  assert.match(manifest, /"sizes":\s*"512x512"/);
  assert.match(packageJson, /"name":\s*"novi"/);
  assert.match(favicon, /<svg[^>]+viewBox="0 0 64 64"/);
  assert.match(appIcon, /<svg[^>]+viewBox="0 0 64 64"/);
  assert.match(brandComponent, /export function NoviLogo/);
  assert.match(brandComponent, /variant\?: "horizontal" \| "stacked" \| "mark"/);

  assert.doesNotMatch(layout + manifest + packageJson, new RegExp(["Life Canvas", "OS"].join(" ")));
  assert.doesNotMatch(packageJson, new RegExp(["site-creator", "vinext-starter"].join("-")));
});

test("keeps the Novi visual system in the main experience", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /import \{ NoviLogo \}/);
  assert.match(page, /Ask Novi/);
  assert.match(page, /"novi-app reference-app guest-preview" : "novi-app reference-app"/);
  assert.match(page, /aria-label="Novi Life Canvas"/);
  assert.match(page, /type ActiveView/);
  assert.match(page, /navItems\.map/);
  assert.match(page, /Sign in to Novi/);
  assert.match(page, /Welcome to Novi/);
  assert.match(page, /runProviderSync/);
  assert.match(page, /disconnectProvider/);
  assert.match(page, /className="integration-trigger"/);
  assert.match(page, /aria-controls="integration-panel"/);
  assert.match(page, /Open original source/);
  assert.match(page, /fetch\("\/api\/me"\)/);
  assert.match(page, /fetch\("\/api\/connections\/readiness"\)/);
  assert.match(page, /providerIsConnected/);
  assert.match(page, /const canvasPositions = \[/);
  assert.match(page, /className="life-canvas"/);
  assert.match(page, /className="canvas-spoke"/);
  assert.match(page, /className="focus-view"/);
  assert.match(page, /connectedEntities/);
  assert.match(page, /fetch\("\/api\/connections\/status"\)/);
  assert.match(page, /fetch\("\/api\/life"\)/);
  assert.match(page, /fetch\("\/api\/search"/);
  assert.match(page, /fetch\(`\/api\/sync\/\$\{provider\}`/);

  assert.match(css, /--purple:\s*#935cff/);
  assert.match(css, /\.novi-rail/);
  assert.match(css, /\.auth-screen/);
  assert.match(css, /\.setup-screen/);
  assert.match(css, /\.provider-tile/);
  assert.match(css, /\.integration-trigger/);
  assert.match(css, /\.rail-account/);
  assert.match(css, /\.life-canvas/);
  assert.match(css, /\.reference-app/);
  assert.match(css, /\.project-stats/);
  assert.match(css, /\.insight-bars/);
  assert.match(css, /\.object-card/);
  assert.match(css, /\.command-overlay/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /prefers-color-scheme:\s*light/);
  assert.doesNotMatch(css, new RegExp(["--pa", "per"].join("")));
  assert.doesNotMatch(css, new RegExp(["--mo", "ss"].join("")));
  assert.doesNotMatch(css, new RegExp(["--ox", "ide"].join("")));
  assert.doesNotMatch(css, new RegExp(["--oc", "hre"].join("")));
  assert.doesNotMatch(css, new RegExp(["react-loading", "skeleton"].join("-")));
});
