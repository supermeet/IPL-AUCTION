import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Data directory setup
const dataDir = join(__dirname, 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir);
}

// File paths
const teamsFile = join(dataDir, 'teams.json');
const auctionStateFile = join(dataDir, 'auctionState.json');
const playersFile = join(dataDir, 'players.json');

// Initialize data files
function initializeDataFiles() {
  if (!existsSync(teamsFile)) {
    writeFileSync(teamsFile, JSON.stringify([]));
  }
  if (!existsSync(auctionStateFile)) {
    const initialState = {
      currentPlayer: null,
      currentBid: 0,
      currentBidder: null,
      isActive: false,
      soldPlayers: []
    };
    writeFileSync(auctionStateFile, JSON.stringify(initialState, null, 2));
  }
}

// Read/Write helpers
function readData(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch (error) {
    return null;
  }
}

function writeData(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}

initializeDataFiles();

// REST API Endpoints
app.get('/api/teams', (req, res) => {
  const teams = readData(teamsFile);
  res.json(teams);
});

app.post('/api/teams', (req, res) => {
  const teams = readData(teamsFile);
  const { name, owner } = req.body;

  if (teams.length >= 8) {
    return res.status(400).json({ error: 'Maximum 8 teams allowed' });
  }

  const newTeam = {
    id: Date.now().toString(),
    name,
    owner,
    budget: 100000000, // 100 crores
    players: [],
    totalPoints: 0
  };

  teams.push(newTeam);
  writeData(teamsFile, teams);

  io.emit('teamsUpdated', teams);
  res.json(newTeam);
});

app.get('/api/players', (req, res) => {
  const players = readData(playersFile);
  res.json(players || []);
});

app.get('/api/auction-state', (req, res) => {
  const state = readData(auctionStateFile);
  res.json(state);
});

app.post('/api/auction/start', (req, res) => {
  const { player } = req.body;
  const state = readData(auctionStateFile);

  state.currentPlayer = player;
  state.currentBid = player.basePrice;
  state.currentBidder = null;
  state.isActive = true;

  writeData(auctionStateFile, state);
  io.emit('auctionUpdate', state);

  res.json(state);
});

app.post('/api/auction/bid', (req, res) => {
  const { teamId, bidAmount } = req.body;
  const state = readData(auctionStateFile);
  const teams = readData(teamsFile);

  if (!state.isActive) {
    return res.status(400).json({ error: 'No active auction' });
  }

  const team = teams.find(t => t.id === teamId);
  if (!team) {
    return res.status(400).json({ error: 'Team not found' });
  }

  if (bidAmount <= state.currentBid) {
    return res.status(400).json({ error: 'Bid must be higher than current bid' });
  }

  if (bidAmount > team.budget) {
    return res.status(400).json({ error: 'Insufficient budget' });
  }

  state.currentBid = bidAmount;
  state.currentBidder = { teamId, teamName: team.name };

  writeData(auctionStateFile, state);
  io.emit('auctionUpdate', state);

  res.json(state);
});

app.post('/api/auction/sell', (req, res) => {
  const state = readData(auctionStateFile);
  const teams = readData(teamsFile);

  if (!state.isActive || !state.currentBidder) {
    return res.status(400).json({ error: 'No valid bid to sell' });
  }

  const team = teams.find(t => t.id === state.currentBidder.teamId);
  if (team) {
    team.budget -= state.currentBid;
    team.players.push({
      ...state.currentPlayer,
      boughtFor: state.currentBid
    });
    team.totalPoints += state.currentPlayer.points;

    writeData(teamsFile, teams);
  }

  state.soldPlayers.push({
    player: state.currentPlayer,
    team: state.currentBidder.teamName,
    price: state.currentBid
  });

  state.currentPlayer = null;
  state.currentBid = 0;
  state.currentBidder = null;
  state.isActive = false;

  writeData(auctionStateFile, state);

  io.emit('playerSold', {
    player: state.soldPlayers[state.soldPlayers.length - 1],
    teams
  });
  io.emit('auctionUpdate', state);
  io.emit('teamsUpdated', teams);

  res.json({ state, teams });
});

app.post('/api/auction/unsold', (req, res) => {
  const state = readData(auctionStateFile);

  state.soldPlayers.push({
    player: state.currentPlayer,
    team: 'UNSOLD',
    price: 0
  });

  state.currentPlayer = null;
  state.currentBid = 0;
  state.currentBidder = null;
  state.isActive = false;

  writeData(auctionStateFile, state);
  io.emit('auctionUpdate', state);

  res.json(state);
});

app.get('/api/results', (req, res) => {
  const teams = readData(teamsFile);
  const sortedTeams = teams.sort((a, b) => b.totalPoints - a.totalPoints);
  res.json(sortedTeams);
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current state to new client
  const state = readData(auctionStateFile);
  const teams = readData(teamsFile);
  socket.emit('auctionUpdate', state);
  socket.emit('teamsUpdated', teams);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
