#!/usr/bin/env python3
"""Tiny mock CoinGecko-format price feed for solver regtest.

GET /price?p=<float> → {"x":{"y": <float>}}

The solver's CoinGecko adapter parses the first nested float from the JSON, so
any two-level wrapping with the price as the inner value works.
"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlparse(self.path)
        qs = parse_qs(url.query)
        try:
            price = float(qs.get("p", ["1"])[0])
        except ValueError:
            price = 1.0
        body = json.dumps({"x": {"y": price}}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass

if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 9099), Handler).serve_forever()
