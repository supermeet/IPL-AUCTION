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
    origin: "*",
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
      auctionIndex: -1,
      currentPlayer: null,
      isActive: false,
      soldPlayers: [],
      isAccelerated: false,
      acceleratedPool: [],
      acceleratedIndex: -1
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

// Helper: get the current player pool and index depending on mode
function getPlayerPool(state) {
  if (state.isAccelerated) {
    return { pool: state.acceleratedPool, indexKey: 'acceleratedIndex' };
  } else {
    const players = readData(playersFile);
    return { pool: players, indexKey: 'auctionIndex' };
  }
}

initializeDataFiles();

// REST API Endpoints
app.get('/api/teams', (req, res) => {
  const teams = readData(teamsFile);
  res.json(teams);
});

// Initialize exactly 10 teams
app.post('/api/teams/init', (req, res) => {
  const { teamNames } = req.body;
  
  const newTeams = teamNames.map((name, index) => ({
    id: `team_${index}`,
    name: name.trim() || `Team ${index + 1}`,
    owner: "Admin",
    budget: 1200000000, // 120 crores
    players: [],
    totalPoints: 0
  }));

  writeData(teamsFile, newTeams);
  io.emit('teamsUpdated', newTeams);
  res.json(newTeams);
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
  state.isActive = true;

  writeData(auctionStateFile, state);
  io.emit('auctionUpdate', state);

  res.json(state);
});

// Fetch NEXT player automatically based on array order
app.post('/api/auction/next', (req, res) => {
  const state = readData(auctionStateFile);
  const { pool, indexKey } = getPlayerPool(state);
  
  state[indexKey] += 1;
  if (state[indexKey] >= pool.length) {
    return res.status(400).json({ error: 'No more players available!' });
  }

  state.currentPlayer = pool[state[indexKey]];
  state.isActive = true;

  writeData(auctionStateFile, state);
  io.emit('auctionUpdate', state);
  res.json(state);
});

// SELL current player
app.post('/api/auction/sell', (req, res) => {
  const { teamId, soldPrice } = req.body;
  const state = readData(auctionStateFile);
  const teams = readData(teamsFile);

  if (!state.isActive) {
    return res.status(400).json({ error: 'No active auction to sell' });
  }

  const team = teams.find(t => t.id === teamId);
  if (!team) {
    return res.status(400).json({ error: 'Team not found' });
  }

  if (soldPrice > team.budget) {
    return res.status(400).json({ error: 'Insufficient budget' });
  }

  // Deduct budget and add player
  team.budget -= soldPrice;
  team.players.push({
    ...state.currentPlayer,
    boughtFor: soldPrice
  });
  team.totalPoints += state.currentPlayer.points;

  writeData(teamsFile, teams);

  state.soldPlayers.push({
    player: state.currentPlayer,
    team: team.name,
    price: soldPrice
  });

  const soldPlayerPayload = state.soldPlayers[state.soldPlayers.length - 1];

  // Advance to next player from the correct pool
  const { pool, indexKey } = getPlayerPool(state);
  state[indexKey] += 1;
  if (state[indexKey] < pool.length) {
    state.currentPlayer = pool[state[indexKey]];
    state.isActive = true;
  } else {
    state.currentPlayer = null;
    state.isActive = false;
  }

  writeData(auctionStateFile, state);

  io.emit('playerSold', {
    player: soldPlayerPayload,
    teams
  });
  io.emit('auctionUpdate', state);
  io.emit('teamsUpdated', teams);

  res.json({ state, teams });
});

// Mark current player UNSOLD
app.post('/api/auction/unsold', (req, res) => {
  const state = readData(auctionStateFile);

  state.soldPlayers.push({
    player: state.currentPlayer,
    team: 'UNSOLD',
    price: 0
  });
  
  const soldPlayerPayload = state.soldPlayers[state.soldPlayers.length - 1];

  // Advance to next player from the correct pool
  const { pool, indexKey } = getPlayerPool(state);
  state[indexKey] += 1;
  if (state[indexKey] < pool.length) {
    state.currentPlayer = pool[state[indexKey]];
    state.isActive = true;
  } else {
    state.currentPlayer = null;
    state.isActive = false;
  }

  writeData(auctionStateFile, state);
  io.emit('playerSold', {
    player: soldPlayerPayload
  });
  io.emit('auctionUpdate', state);

  res.json(state);
});

// UNDO last sale
app.post('/api/auction/undo', (req, res) => {
  const state = readData(auctionStateFile);
  const teams = readData(teamsFile);

  if (!state.soldPlayers || state.soldPlayers.length === 0) {
    return res.status(400).json({ error: 'Nothing to undo!' });
  }

  // Pop the last sold entry
  const lastEntry = state.soldPlayers.pop();

  // If it was sold to a team (not UNSOLD), refund the team
  if (lastEntry.team !== 'UNSOLD') {
    const team = teams.find(t => t.name === lastEntry.team);
    if (team) {
      team.budget += lastEntry.price;
      team.players = team.players.filter(p => p.id !== lastEntry.player.id);
      team.totalPoints -= lastEntry.player.points;
    }
    writeData(teamsFile, teams);
  }

  // Move index back by 1 in the correct pool
  const { pool, indexKey } = getPlayerPool(state);
  state[indexKey] -= 1;
  if (state[indexKey] >= 0 && state[indexKey] < pool.length) {
    state.currentPlayer = pool[state[indexKey]];
    state.isActive = true;
  }

  writeData(auctionStateFile, state);

  io.emit('auctionUpdate', state);
  io.emit('teamsUpdated', teams);

  res.json({ state, teams });
});

// RESTART entire auction - resets everything including accelerated state
app.post('/api/auction/restart', (req, res) => {
  const teams = readData(teamsFile);

  const resetTeams = teams.map(t => ({
    ...t,
    budget: 1200000000,
    players: [],
    totalPoints: 0
  }));
  writeData(teamsFile, resetTeams);

  const freshState = {
    auctionIndex: -1,
    currentPlayer: null,
    isActive: false,
    soldPlayers: [],
    isAccelerated: false,
    acceleratedPool: [],
    acceleratedIndex: -1
  };
  writeData(auctionStateFile, freshState);

  io.emit('auctionUpdate', freshState);
  io.emit('teamsUpdated', resetTeams);

  res.json({ state: freshState, teams: resetTeams });
});

// ===== ACCELERATED AUCTION ENDPOINTS =====

// Get all unsold players from the main auction
app.get('/api/auction/unsold-players', (req, res) => {
  const state = readData(auctionStateFile);
  const unsoldPlayers = (state.soldPlayers || [])
    .filter(entry => entry.team === 'UNSOLD')
    .map(entry => entry.player);
  res.json(unsoldPlayers);
});

// Start accelerated auction with selected player IDs (max 30)
app.post('/api/auction/accelerated', (req, res) => {
  const { playerIds } = req.body; // array of player IDs to include
  const state = readData(auctionStateFile);

  // Collect selected unsold players
  const unsoldPlayers = (state.soldPlayers || [])
    .filter(entry => entry.team === 'UNSOLD')
    .map(entry => entry.player);

  const selectedPlayers = unsoldPlayers
    .filter(p => playerIds.includes(p.id))
    .slice(0, 30)
    .map(p => ({
      ...p,
      basePrice: Math.round(p.basePrice / 2) // Halve base price for accelerated
    }));

  if (selectedPlayers.length === 0) {
    return res.status(400).json({ error: 'No valid players selected!' });
  }

  // Set up accelerated auction state
  state.isAccelerated = true;
  state.acceleratedPool = selectedPlayers;
  state.acceleratedIndex = 0;
  state.currentPlayer = selectedPlayers[0];
  state.isActive = true;

  writeData(auctionStateFile, state);
  io.emit('auctionUpdate', state);

  res.json(state);
});

// ===== END ACCELERATED =====

app.get('/api/results', (req, res) => {
  const teams = readData(teamsFile);
  const sortedTeams = teams.sort((a, b) => b.budget - a.budget);
  res.json(sortedTeams);
});

// Helper: round to 2 decimal places
const round2 = (num) => Math.round(num * 100) / 100;

// Calculate final scores with Best 11, captain, and best batsman/bowler multipliers
app.post('/api/results/calculate-final', (req, res) => {
  const {
    teamSelections,    // { teamId: { best11: [playerIds], captainId: playerId } }
    bestBatsmanId,     // global best batsman player ID
    bestBowlerId,      // global best bowler player ID
    captainMultiplier, // 1.0 to 2.0
    batsmanMultiplier, // 1.0 to 2.0
    bowlerMultiplier   // 1.0 to 2.0
  } = req.body;

  const teams = readData(teamsFile);
  const allPlayers = readData(playersFile);
  
  // Find global best batsman/bowler player details
  const bestBatsman = allPlayers.find(p => p.id === bestBatsmanId);
  const bestBowler = allPlayers.find(p => p.id === bestBowlerId);

  const finalResults = teams.map(team => {
    const selection = teamSelections[team.id];
    if (!selection || !selection.best11 || selection.best11.length === 0) {
      return { ...team, finalScore: 0, best11: [], captainId: null, hasBestBatsman: false, hasBestBowler: false };
    }

    // Get best 11 players from this team
    const best11Players = team.players.filter(p => selection.best11.includes(p.id));
    
    // Base score: sum of best 11 ratings (each rating already 2 decimal places)
    let finalScore = round2(best11Players.reduce((sum, p) => sum + round2(p.points / 100), 0));
    
    // Captain multiplier bonus (round to 2 decimals)
    const captain = best11Players.find(p => p.id === selection.captainId);
    if (captain) {
      const captainBonus = round2(round2(captain.points / 100) * (captainMultiplier - 1));
      finalScore = round2(finalScore + captainBonus);
    }
    
    // Check if this team has the global best batsman
    const hasBestBatsman = bestBatsman && team.players.some(p => p.id === bestBatsmanId);
    if (hasBestBatsman) {
      const batsmanPlayer = team.players.find(p => p.id === bestBatsmanId);
      const batsmanBonus = round2(round2(batsmanPlayer.points / 100) * (batsmanMultiplier - 1));
      finalScore = round2(finalScore + batsmanBonus);
    }
    
    // Check if this team has the global best bowler
    const hasBestBowler = bestBowler && team.players.some(p => p.id === bestBowlerId);
    if (hasBestBowler) {
      const bowlerPlayer = team.players.find(p => p.id === bestBowlerId);
      const bowlerBonus = round2(round2(bowlerPlayer.points / 100) * (bowlerMultiplier - 1));
      finalScore = round2(finalScore + bowlerBonus);
    }

    return {
      ...team,
      finalScore,
      best11: best11Players.map(p => p.id),
      captainId: selection.captainId,
      hasBestBatsman: !!hasBestBatsman,
      hasBestBowler: !!hasBestBowler
    };
  });

  // Sort by final score descending
  finalResults.sort((a, b) => b.finalScore - a.finalScore);
  
  res.json({
    teams: finalResults,
    bestBatsmanId,
    bestBowlerId,
    captainMultiplier,
    batsmanMultiplier,
    bowlerMultiplier
  });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  const state = readData(auctionStateFile);
  const teams = readData(teamsFile);
  socket.emit('auctionUpdate', state);
  socket.emit('teamsUpdated', teams);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (accessible on LAN)`);
});
