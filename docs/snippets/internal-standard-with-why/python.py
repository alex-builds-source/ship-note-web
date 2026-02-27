import requests

URL = "https://ship-note-web.pages.dev/api/generate"
payload = {
  "repo": "alex-builds-source/ship-note",
  "preset": "standard",
  "destination": "internal",
  "includeWhy": true,
  "baseRef": "v0.1.10",
  "targetRef": "v0.1.11"
}

response = requests.post(URL, json=payload, timeout=30)
response.raise_for_status()
data = response.json()
print(data["schema_version"])
print(data["sections"]["what_shipped"])
