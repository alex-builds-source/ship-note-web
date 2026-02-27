const url = "https://ship-note-web.pages.dev/api/generate";
const payload = {
  "repo": "alex-builds-source/ship-note",
  "preset": "standard",
  "destination": "internal",
  "includeWhy": true,
  "baseRef": "v0.1.10",
  "targetRef": "v0.1.11"
};

const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
console.log(data.schema_version);
console.log(data.sections.what_shipped);
