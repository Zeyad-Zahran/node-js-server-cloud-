const express = require('express');
const router = express.Router();

/**
 * In-memory WebRTC signaling store
 * rooms: Map<roomId, { peers: Map<peerId, { sdp, ice[], joinedAt, lastSeen }>, createdAt }>
 */
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { peers: new Map(), createdAt: Date.now() });
  }
  return rooms.get(roomId);
}

// POST /api/signaling/join
router.post('/join', (req, res) => {
  const { roomId, peerId } = req.body;
  if (!roomId || !peerId) {
    return res.status(400).json({ error: 'roomId and peerId are required' });
  }
  const room = getRoom(roomId);
  room.peers.set(peerId, {
    peerId,
    sdp: null,
    ice: [],
    joinedAt: Date.now(),
    lastSeen: Date.now(),
  });
  res.json({
    success: true,
    roomId,
    peerId,
    peerCount: room.peers.size,
    peers: Array.from(room.peers.keys()),
  });
});

// POST /api/signaling/offer
router.post('/offer', (req, res) => {
  const { roomId, from, to, sdp } = req.body;
  if (!roomId || !from || !sdp) {
    return res.status(400).json({ error: 'roomId, from, and sdp are required' });
  }
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const deliver = (peer) => {
    peer.sdp = { type: 'offer', from, sdp };
    peer.lastSeen = Date.now();
  };

  if (to) {
    const target = room.peers.get(to);
    if (!target) return res.status(404).json({ error: 'Target peer not found' });
    deliver(target);
  } else {
    for (const [pid, p] of room.peers) if (pid !== from) deliver(p);
  }
  res.json({ success: true });
});

// POST /api/signaling/answer
router.post('/answer', (req, res) => {
  const { roomId, from, to, sdp } = req.body;
  if (!roomId || !from || !to || !sdp) {
    return res.status(400).json({ error: 'roomId, from, to, and sdp are required' });
  }
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const target = room.peers.get(to);
  if (!target) return res.status(404).json({ error: 'Target peer not found' });
  target.sdp = { type: 'answer', from, sdp };
  target.lastSeen = Date.now();
  res.json({ success: true });
});

// POST /api/signaling/ice
router.post('/ice', (req, res) => {
  const { roomId, from, to, candidate } = req.body;
  if (!roomId || !from || !candidate) {
    return res.status(400).json({ error: 'roomId, from, and candidate are required' });
  }
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (to) {
    const target = room.peers.get(to);
    if (!target) return res.status(404).json({ error: 'Target peer not found' });
    target.ice.push({ from, candidate });
    target.lastSeen = Date.now();
  } else {
    for (const [pid, p] of room.peers) {
      if (pid !== from) {
        p.ice.push({ from, candidate });
        p.lastSeen = Date.now();
      }
    }
  }
  res.json({ success: true });
});

// GET /api/signaling/messages/:roomId/:peerId
// Long-poll style fetch (client should call every ~1s)
router.get('/messages/:roomId/:peerId', (req, res) => {
  const { roomId, peerId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const peer = room.peers.get(peerId);
  if (!peer) return res.status(404).json({ error: 'Peer not found' });

  const messages = [];
  if (peer.sdp) {
    messages.push({ type: peer.sdp.type, from: peer.sdp.from, sdp: peer.sdp.sdp });
    peer.sdp = null;
  }
  for (const ice of peer.ice) {
    messages.push({ type: 'ice', from: ice.from, candidate: ice.candidate });
  }
  peer.ice = [];
  peer.lastSeen = Date.now();

  res.json({ success: true, peerCount: room.peers.size, messages });
});

// POST /api/signaling/leave
router.post('/leave', (req, res) => {
  const { roomId, peerId } = req.body;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  room.peers.delete(peerId);
  if (room.peers.size === 0) rooms.delete(roomId);
  res.json({ success: true });
});

// GET /api/signaling/rooms
router.get('/rooms', (req, res) => {
  const list = Array.from(rooms.entries()).map(([id, r]) => ({
    roomId: id,
    peerCount: r.peers.size,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
  res.json({ totalRooms: list.length, rooms: list });
});

module.exports = router;