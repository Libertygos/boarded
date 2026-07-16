"""Exit 0 iff ~/.kaggle/kaggle.json authenticates against the Kaggle API.

Used by the art-batch workflow to decide between the stored secret and the
ephemeral-key credential handshake. A 404 counts as authenticated (the probe
endpoint may not know the kernel, but the credential passed the auth layer);
401/403 count as rejected. Never prints credential material.
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request

PATH = os.path.expanduser("~/.kaggle/kaggle.json")
URL = ("https://www.kaggle.com/api/v1/kernels/status"
       "?userName=julesloison&kernelSlug=abordage-art-batch")

if not os.path.exists(PATH):
    print("auth probe: no kaggle.json present")
    sys.exit(1)

creds = json.load(open(PATH))
token = base64.b64encode(f"{creds['username']}:{creds['key']}".encode()).decode()
req = urllib.request.Request(URL, headers={"Authorization": "Basic " + token})
try:
    urllib.request.urlopen(req, timeout=30)
    print("auth probe: OK")
    sys.exit(0)
except urllib.error.HTTPError as e:
    print(f"auth probe: HTTP {e.code}")
    sys.exit(0 if e.code == 404 else 1)
except Exception as e:  # noqa: BLE001 — any transport failure means "not authenticated"
    print(f"auth probe: {type(e).__name__}")
    sys.exit(1)
