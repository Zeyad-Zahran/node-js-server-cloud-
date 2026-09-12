🔧 Prerequisites
Node.js ≥ 18.x — download

npm (comes with Node)

ngrok — download

Verify in Command Prompt (CMD):

cmd
node -v
npm -v
🏗️ Step 1 — Create the project folder
cmd
mkdir signaling-file-server
cd signaling-file-server
Create sub-folders:

cmd
mkdir src
mkdir src\middleware
mkdir src\utils
mkdir src\routes
mkdir uploads
Now create each file shown above in its proper location.

📦 Step 2 — Install dependencies
From inside signaling-file-server\:

cmd
npm install express cors morgan multer dotenv
For development (auto-restart on file changes):

cmd
npm install --save-dev nodemon
Expected node_modules\ folder after install.

⚙️ Step 3 — Configure environment
cmd
copy .env.example .env
Edit .env with Notepad if you want:

cmd
notepad .env
▶️ Step 4 — Start the server
Production mode:

cmd
npm start
Development mode (with auto-reload):

cmd
npm run dev
You should see:

text
────────────────────────────────────────────────────────────
  🚀  Signaling & File Server is running
────────────────────────────────────────────────────────────
  ➜  Local:    http://localhost:3000
  ➜  Network:  http://0.0.0.0:3000
  ➜  Env:      development
  ➜  Uploads:  C:\...\signaling-file-server\uploads
────────────────────────────────────────────────────────────
  💡 Tip: run "ngrok http 3000" in another terminal
────────────────────────────────────────────────────────────
🌐 Step 5 — Expose with ngrok
Open a second CMD window (keep the server running in the first):

cmd
ngrok http 3000
You will get output like:

text
Forwarding   https://a1b2-c3d4.ngrok-free.app -> http://localhost:3000
Copy that https://...ngrok-free.app URL — that is your public base URL.

💡 All endpoints below work both locally (http://localhost:3000) and publicly (https://xxx.ngrok-free.app).

🧪 Step 6 — Test endpoints
Health check
cmd
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/ping
Full system + storage stats
cmd
curl http://localhost:3000/api/stats
curl http://localhost:3000/api/stats/storage
Download speed test (default 1 MB)
cmd
curl http://localhost:3000/api/stats/speed?size=1048576 -o speedtest.bin
Upload a file (single)
cmd
curl -X POST http://localhost:3000/api/upload -F "file=@C:\path\to\yourfile.jpg"
Upload multiple files
cmd
curl -X POST http://localhost:3000/api/upload/multiple ^
  -F "files=@file1.jpg" ^
  -F "files=@file2.pdf"
In CMD, multi-line commands use ^ as continuation. In PowerShell use ` instead.

List uploaded files
cmd
curl http://localhost:3000/api/upload
Delete a file
cmd
curl -X DELETE http://localhost:3000/api/upload/1699999999-abcdef-file.jpg
WebRTC signaling — quick flow
Peer A joins:

cmd
curl -X POST http://localhost:3000/api/signaling/join ^
  -H "Content-Type: application/json" ^
  -d "{\"roomId\":\"room1\",\"peerId\":\"peerA\"}"
Peer B joins:

cmd
curl -X POST http://localhost:3000/api/signaling/join ^
  -H "Content-Type: application/json" ^
  -d "{\"roomId\":\"room1\",\"peerId\":\"peerB\"}"
Peer A sends offer to B:

cmd
curl -X POST http://localhost:3000/api/signaling/offer ^
  -H "Content-Type: application/json" ^
  -d "{\"roomId\":\"room1\",\"from\":\"peerA\",\"to\":\"peerB\",\"sdp\":\"<SDP_STRING>\"}"
Peer B polls messages:

cmd
curl http://localhost:3000/api/signaling/messages/room1/peerB
Response:

json
{
  "success": true,
  "peerCount": 2,
  "messages": [
    { "type": "offer", "from": "peerA", "sdp": "<SDP_STRING>" }
  ]
}
Peer B sends answer:

cmd
curl -X POST http://localhost:3000/api/signaling/answer ^
  -H "Content-Type: application/json" ^
  -d "{\"roomId\":\"room1\",\"from\":\"peerB\",\"to\":\"peerA\",\"sdp\":\"<SDP_STRING>\"}"
ICE candidates (both directions):

cmd
curl -X POST http://localhost:3000/api/signaling/ice ^
  -H "Content-Type: application/json" ^
  -d "{\"roomId\":\"room1\",\"from\":\"peerA\",\"to\":\"peerB\",\"candidate\":{...}}"
Leave room:

cmd
curl -X POST http://localhost:3000/api/signaling/leave ^
  -H "Content-Type: application/json" ^
  -d "{\"roomId\":\"room1\",\"peerId\":\"peerA\"}"
List active rooms:

cmd
curl http://localhost:3000/api/signaling/rooms
📋 API Reference
Method	Endpoint	Description
GET	/	Server info + endpoint list
GET	/api/health	Status, uptime, host info
GET	/api/health/ping	Simple pong
GET	/api/stats	Full CPU / RAM / storage report
GET	/api/stats/storage	Only storage statistics
GET	/api/stats/speed?size=N	Download speed test (N bytes, max 10 MB)
POST	/api/stats/speed	Upload speed test (raw octet-stream body)
POST	/api/upload	Upload single file (file field)
POST	/api/upload/multiple	Upload up to 10 files (files field)
GET	/api/upload	List all uploaded files
DELETE	/api/upload/:filename	Delete a file
POST	/api/signaling/join	Join a room
POST	/api/signaling/offer	Send SDP offer
POST	/api/signaling/answer	Send SDP answer
POST	/api/signaling/ice	Send ICE candidate
GET	/api/signaling/messages/:roomId/:peerId	Poll messages for a peer
POST	/api/signaling/leave	Leave the room
GET	/api/signaling/rooms	List active rooms
🖥️ Useful CMD commands cheat-sheet
Task	Command
Check Node version	node -v
Install all deps	npm install
Start server	npm start
Start with auto-reload	npm run dev
Kill process on port 3000	netstat -ano | findstr :3000 then taskkill /PID <PID> /F
Change port	edit .env → PORT=4000
Open ngrok	ngrok http 3000
Open ngrok with custom subdomain	ngrok http --subdomain=myapp 3000
Stop server	Ctrl + C
🛡️ Production notes
Never expose .env — it contains your private config.

Limit upload size in MAX_FILE_SIZE — default 50 MB.

Persistent signaling: this uses in-memory storage. If you need multi-instance or restart-safe rooms, replace rooms Map with Redis.

Behind ngrok, WebRTC still needs TURN server for users behind NAT/corporate firewalls. Consider coturn or a managed TURN service.

HTTPS: ngrok provides HTTPS automatically. For WebRTC in browsers, getUserMedia requires HTTPS — this is why ngrok is essential for testing.

Rate limiting: add express-rate-limit before going public.

✅ Quick verification checklist
□ npm install completes without errors
□ npm start prints startup banner
□ curl http://localhost:3000/api/health returns "status":"ok"
□ ngrok http 3000 gives a public URL
□ curl https://YOUR-NGROK-URL/api/health works from outside
□ File upload via /api/upload succeeds and appears in uploads\
□ Signaling endpoints return correct JSON
