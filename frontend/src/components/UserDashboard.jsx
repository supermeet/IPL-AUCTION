import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const API_URL = 'http://localhost:3001';
const socket = io(API_URL);

function UserDashboard() {
  const [teams, setTeams] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [auctionState, setAuctionState] = useState(null);
  const [bidAmount, setBidAmount] = useState(0);

  useEffect(() => {
    fetchTeams();

    socket.on('auctionUpdate', (state) => {
      setAuctionState(state);
      if (state.currentPlayer && state.currentBid) {
        setBidAmount(state.currentBid + 1000000); // Increment by 1Cr
      }
    });

    socket.on('teamsUpdated', (teams) => {
      setTeams(teams);
      if (myTeam) {
        const updatedTeam = teams.find(t => t.id === myTeam.id);
        if (updatedTeam) {
          setMyTeam(updatedTeam);
        }
      }
    });

    socket.on('playerSold', (data) => {
      if (data.teams && myTeam) {
        const updatedTeam = data.teams.find(t => t.id === myTeam.id);
        if (updatedTeam) {
          setMyTeam(updatedTeam);
        }
      }
    });

    return () => {
      socket.off('auctionUpdate');
      socket.off('teamsUpdated');
      socket.off('playerSold');
    };
  }, [myTeam]);

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teams`);
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName, owner: ownerName })
      });
      const data = await response.json();
      if (data.id) {
        setMyTeam(data);
        setTeamName('');
        setOwnerName('');
        alert('Team created successfully!');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Error creating team. Make sure there are less than 8 teams.');
    }
  };

  const placeBid = async () => {
    if (!myTeam) {
      alert('Please create a team first!');
      return;
    }

    if (bidAmount > myTeam.budget) {
      alert('Insufficient budget!');
      return;
    }

    try {
      await fetch(`${API_URL}/api/auction/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: myTeam.id, bidAmount })
      });
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Error placing bid');
    }
  };

  const formatCurrency = (amount) => {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  };

  return (
    <div className="container">
      <h1 style={{ color: 'white', marginBottom: '2rem' }}>User Dashboard</h1>

      {!myTeam ? (
        <div className="card">
          <h2>Create Your Team</h2>
          <form onSubmit={createTeam}>
            <div className="form-group">
              <label>Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                required
              />
            </div>
            <div className="form-group">
              <label>Owner Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
            <button type="submit" disabled={teams.length >= 8}>
              {teams.length >= 8 ? 'Maximum Teams Reached' : 'Create Team'}
            </button>
          </form>
          <p style={{ marginTop: '1rem', color: '#666' }}>
            Teams registered: {teams.length}/8
          </p>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>My Team: {myTeam.name}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <p><strong>Owner:</strong> {myTeam.owner}</p>
                <p><strong>Budget Left:</strong> {formatCurrency(myTeam.budget)}</p>
                <p><strong>Total Players:</strong> {myTeam.players.length}</p>
                <p><strong>Total Points:</strong> {myTeam.totalPoints}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>My Players ({myTeam.players.length})</h2>
            {myTeam.players.length === 0 ? (
              <p style={{ color: '#666' }}>No players yet. Start bidding in the auction!</p>
            ) : (
              <div className="grid">
                {myTeam.players.map((player, index) => (
                  <div key={index} className="player-card">
                    <h3>{player.name}</h3>
                    <p><strong>Role:</strong> {player.role}</p>
                    <p><strong>Bought For:</strong> {formatCurrency(player.boughtFor)}</p>
                    <p><strong>Points:</strong> {player.points}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {auctionState && auctionState.isActive && auctionState.currentPlayer && (
        <div className="auction-live">
          <h2>LIVE AUCTION</h2>
          <h3>{auctionState.currentPlayer.name}</h3>
          <p>{auctionState.currentPlayer.role} | Base Price: {formatCurrency(auctionState.currentPlayer.basePrice)}</p>
          <p>Points: {auctionState.currentPlayer.points}</p>
          <div className="bid-amount">{formatCurrency(auctionState.currentBid)}</div>
          {auctionState.currentBidder && (
            <p style={{ fontSize: '1.5rem' }}>
              Current Bidder: {auctionState.currentBidder.teamName}
              {myTeam && auctionState.currentBidder.teamId === myTeam.id && ' (YOU!)'}
            </p>
          )}

          {myTeam && (
            <div style={{ marginTop: '2rem' }}>
              <div className="form-group">
                <label style={{ color: 'white' }}>Your Bid Amount</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(parseInt(e.target.value))}
                  min={auctionState.currentBid + 1000000}
                  step={1000000}
                />
              </div>
              <div className="bid-controls">
                <button onClick={placeBid} disabled={bidAmount <= auctionState.currentBid}>
                  Place Bid
                </button>
                <button onClick={() => setBidAmount(auctionState.currentBid + 1000000)}>
                  +1 Cr
                </button>
                <button onClick={() => setBidAmount(auctionState.currentBid + 5000000)}>
                  +5 Cr
                </button>
                <button onClick={() => setBidAmount(auctionState.currentBid + 10000000)}>
                  +10 Cr
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2>All Teams ({teams.length}/8)</h2>
        <div className="grid">
          {teams.map(team => (
            <div key={team.id} className="team-card" style={{
              border: myTeam && team.id === myTeam.id ? '3px solid #667eea' : 'none'
            }}>
              <h3>{team.name} {myTeam && team.id === myTeam.id && '(You)'}</h3>
              <p><strong>Owner:</strong> {team.owner}</p>
              <p><strong>Budget Left:</strong> {formatCurrency(team.budget)}</p>
              <p><strong>Players:</strong> {team.players.length}</p>
              <p><strong>Total Points:</strong> {team.totalPoints}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
