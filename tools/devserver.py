# local test server (no cache, threaded). POST /__save/<name> stores the body in /tmp/labdl (used only to inspect generated downloads while testing).
import http.server, socketserver, sys, os
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store, max-age=0'); self.send_header('Access-Control-Allow-Origin','*'); super().end_headers()
    def do_POST(self):
        if self.path.startswith('/__save/'):
            os.makedirs('/tmp/labdl', exist_ok=True); n=int(self.headers.get('Content-Length',0)); name=os.path.basename(self.path[8:]) or 'out.bin'
            open('/tmp/labdl/'+name,'wb').write(self.rfile.read(n)); self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
        else: self.send_response(404); self.end_headers()
    def log_message(self,*a): pass
class T(socketserver.ThreadingMixIn, socketserver.TCPServer): daemon_threads=True; allow_reuse_address=True
with T(('',int(sys.argv[1]) if len(sys.argv)>1 else 8765),H) as s: s.serve_forever()
