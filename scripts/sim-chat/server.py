# The Mac side of the dev chat driver (src/ui/dev/driver.ts): serves the next command to the app in the
# iOS Simulator and records when its reply is done. Usage: python3 scripts/sim-chat/server.py .tmp/sim-chat
import http.server, json, os, sys, urllib.parse
DIR = sys.argv[1]
QUEUE, DONE = os.path.join(DIR, 'cmd.json'), os.path.join(DIR, 'done.txt')

class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        if url.path == '/cmd':
            if os.path.exists(QUEUE):
                body = open(QUEUE, 'rb').read(); os.remove(QUEUE)
                self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(body)
            else:
                self.send_response(204); self.end_headers()
        elif url.path == '/done':
            q = urllib.parse.parse_qs(url.query)
            open(os.path.join(DIR, 'info.txt'), 'w').write(q.get('info', [''])[0])
            open(DONE, 'w').write(q.get('id', [''])[0])
            self.send_response(200); self.end_headers()
        else:
            self.send_response(404); self.end_headers()

http.server.ThreadingHTTPServer(('127.0.0.1', 8099), H).serve_forever()
