import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const API_URL = 'http://localhost:3001';
const socket = io(API_URL);

function AdminDashboard() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [auctionState, setAuctionState] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [soldPlayers, setSoldPlayers] = useState([]);

  useEffect(() => {
    fetchPlayers();
    fetchTeams();
    fetchAuctionState();

    socket.on('auctionUpdate', (state) => {
      setAuctionState(state);
      if (state.soldPlayers) {
        setSoldPlayers(state.soldPlayers);
      }
    });

    socket.on('teamsUpdated', (teams) => {
      setTeams(teams);
    });

    socket.on('playerSold', (data) => {
      fetchTeams();
      if (data.teams) {
        setTeams(data.teams);
      }
    });

    return () => {
      socket.off('auctionUpdate');
      socket.off('teamsUpdated');
      socket.off('playerSold');
    };
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/players`);
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teams`);
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchAuctionState = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auction-state`);
      const data = await response.json();
      setAuctionState(data);
      if (data.soldPlayers) {
        setSoldPlayers(data.soldPlayers);
      }
    } catch (error) {
      console.error('Error fetching auction state:', error);
    }
  };

  const startAuction = async (player) => {
    try {
      await fetch(`${API_URL}/api/auction/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player })
      });
    } catch (error) {
      console.error('Error starting auction:', error);
    }
  };

  const sellPlayer = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auction/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.teams) {
        setTeams(data.teams);
      }
    } catch (error) {
      console.error('Error selling player:', error);
    }
  };

  const markUnsold = async () => {
    try {
      await fetch(`${API_URL}/api/auction/unsold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error marking unsold:', error);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  };

  const getAvailablePlayers = () => {
    const soldPlayerIds = soldPlayers.map(sp => sp.player.id);
    return players.filter(p => !soldPlayerIds.includes(p.id));
  };

  return (
    <div className="container">
      <h1 style={{ color: 'white', marginBottom: '2rem' }}>Admin Dashboard</h1>

      {auctionState && auctionState.isActive && auctionState.currentPlayer && (
        <div className="auction-live">
          <h2>LIVE AUCTION</h2>
          <h3>{auctionState.currentPlayer.name}</h3>
          <p>{auctionState.currentPlayer.role} | Base Price: {formatCurrency(auctionState.currentPlayer.basePrice)}</p>
          <p>Points: {auctionState.currentPlayer.points}</p>
          <div className="bid-amount">{formatCurrency(auctionState.currentBid)}</div>
          {auctionState.currentBidder && (
            <p style={{ fontSize: '1.5rem' }}>Current Bidder: {auctionState.currentBidder.teamName}</p>
          )}
          <div className="bid-controls">
            <button onClick={sellPlayer} disabled={!auctionState.currentBidder}>
              SOLD!
            </button>
            <button onClick={markUnsold} style={{ background: '#f44336' }}>
              Mark as UNSOLD
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Available Players ({getAvailablePlayers().length})</h2>
        <div className="grid">
          {getAvailablePlayers().map(player => (
            <div key={player.id} className="player-card">
              <h3>{player.name}</h3>
              <p><strong>Role:</strong> {player.role}</p>
              <p><strong>Base Price:</strong> {formatCurrency(player.basePrice)}</p>
              <p><strong>Points:</strong> {player.points}</p>
              <p><small>{player.stats}</small></p>
              <button
                onClick={() => startAuction(player)}
                disabled={auctionState && auctionState.isActive}
                style={{ marginTop: '1rem', width: '100%' }}
              >
                Start Auction
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Registered Teams ({teams.length}/8)</h2>
        <div className="grid">
          {teams.map(team => (
            <div key={team.id} className="team-card">
              <h3>{team.name}</h3>
              <p><strong>Owner:</strong> {team.owner}</p>
              <p><strong>Budget Left:</strong> {formatCurrency(team.budget)}</p>
              <p><strong>Players:</strong> {team.players.length}</p>
              <p><strong>Total Points:</strong> {team.totalPoints}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Sold Players ({soldPlayers.length})</h2>
        <div className="sold-players">
          {soldPlayers.map((item, index) => (
            <div key={index} className="sold-item">
              <div>
                <strong>{item.player.name}</strong>
                <span style={{ marginLeft: '1rem', color: '#666' }}>
                  {item.player.role} | {item.player.points} pts
                </span>
              </div>
              <div>
                <span style={{ fontWeight: 'bold', color: item.team === 'UNSOLD' ? '#f44336' : '#4caf50' }}>
                  {item.team}
                </span>
                {item.price > 0 && (
                  <span style={{ marginLeft: '1rem' }}>{formatCurrency(item.price)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
