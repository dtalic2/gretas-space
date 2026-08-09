#!/usr/bin/env python3
"""
Local server for 3x3 Garden 3D.

Two jobs beyond `python3 -m http.server`:

1. No-cache headers. Browsers cache ES modules aggressively, so without this an
   edit to js/data.js often won't show up on a plain reload and it looks like
   your change did nothing.
2. It prints the address to type on your phone. The server already listens on
   every interface, but you need the Mac's LAN IP to reach it, and that isn't
   something you can guess.

    python3 serve.py [port]        # defaults to $PORT, else 8123
"""
import functools
import http.server
import os
import socket
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 8123))
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


def lan_ips():
    """Every non-loopback IPv4 this machine answers on, best guess first."""
    found = []

    # The address used to reach the outside world is the one a phone on the same
    # Wi-Fi will also use. No packets are actually sent for a UDP connect().
    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        probe.connect(('192.0.2.1', 1))       # TEST-NET-1, guaranteed unroutable
        found.append(probe.getsockname()[0])
    except OSError:
        pass
    finally:
        probe.close()

    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith('127.') and ip not in found:
                found.append(ip)
    except OSError:
        pass

    return [ip for ip in found if not ip.startswith('169.254.')]   # drop self-assigned


def banner():
    line = '─' * 46
    print(f'\n  🌱 3x3 Garden 3D\n  {line}')
    print(f'  On this Mac   http://localhost:{PORT}')

    ips = lan_ips()
    if ips:
        print('\n  On your phone (same Wi-Fi):')
        for ip in ips:
            print(f'                http://{ip}:{PORT}')
        print('\n  If the phone times out, macOS is probably firewalling')
        print('  Python: System Settings → Network → Firewall → Options.')
    else:
        print('\n  No network connection found, so localhost only.')
    print(f'  {line}\n  Ctrl-C to stop.\n')


def main():
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(('0.0.0.0', PORT), handler) as httpd:
        banner()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nstopped')


if __name__ == '__main__':
    main()
