// Self-check: every theme in src/lib/themes.ts has a complete CSS token block in globals.css,
// and dark-capable themes also have a dark block. Usage: npx tsx scripts/check-themes.ts
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { DEFAULT_THEME, REQUIRED_TOKENS, THEMES, themeOf } from "../src/lib/themes";

const css = readFileSync("src/app/globals.css", "utf8");
const block = (selector: string) => {
  const start = css.indexOf(selector + " {");
  if (start < 0) return null;
  return css.slice(start, css.indexOf("}", start));
};

assert.equal(new Set(THEMES.map((t) => t.key)).size, THEMES.length, "theme keys are unique");
assert.ok(THEMES.some((t) => t.key === DEFAULT_THEME), "default theme exists");
assert.equal(themeOf("no-such-theme").key, DEFAULT_THEME, "unknown key falls back to default");
assert.equal(themeOf(null).key, DEFAULT_THEME, "missing key falls back to default");

for (const t of THEMES) {
  const light = block(`[data-skin="${t.key}"]`);
  assert.ok(light, `${t.key}: no [data-skin="${t.key}"] block in globals.css`);
  for (const token of REQUIRED_TOKENS) assert.ok(light.includes(token + ":"), `${t.key}: light block is missing ${token}`);

  // Dark block: dark-capable themes get their own colours; light-only themes repeat light colours so they stay light.
  const dark = block(`[data-skin="${t.key}"]:is(.dark, .dark *)`);
  assert.ok(dark, `${t.key}: no dark block`);
  for (const token of REQUIRED_TOKENS.filter((x) => !x.startsWith("--font") && x !== "--radius")) {
    assert.ok(dark.includes(token + ":"), `${t.key}: dark block is missing ${token}`);
  }
}
console.log(`OK: ${THEMES.length} themes`);
