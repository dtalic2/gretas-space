"""Serve Random Spin locally: python3 random-spin/serve.py [port]"""
import functools
import http.server
import os
import sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8127
handler = functools.partial(
    http.server.SimpleHTTPRequestHandler,
    directory=os.path.dirname(os.path.abspath(__file__)),
)
print(f"Random Spin on http://localhost:{port}")
http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
