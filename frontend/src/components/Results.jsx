import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001';

function Results() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await fetch(`${API_URL}/api/results`);
      const data = await response.json();
      setTeams(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching results:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  };

  const getRankClass = (index) => {
    if (index === 0) return 'rank-1';
    if (index === 1) return 'rank-2';
    if (index === 2) return 'rank-3';
    return '';
  };

  if (loading) {
    return (
      <div className="container">
        <h1 style={{ color: 'white' }}>Loading...</h1>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ color: 'white', marginBottom: '2rem' }}>Auction Results & Rankings</h1>

      <div className="card">
        <h2>Team Rankings (By Total Points)</h2>
        <table className="results-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team Name</th>
              <th>Owner</th>
              <th>Total Points</th>
              <th>Players</th>
              <th>Budget Used</th>
              <th>Budget Left</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, index) => (
              <tr key={team.id} className={getRankClass(index)}>
                <td>
                  <strong style={{ fontSize: '1.5rem' }}>
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `#${index + 1}`}
                  </strong>
                </td>
                <td><strong>{team.name}</strong></td>
                <td>{team.owner}</td>
                <td><strong style={{ fontSize: '1.2rem', color: '#667eea' }}>{team.totalPoints}</strong></td>
                <td>{team.players.length}</td>
                <td>{formatCurrency(100000000 - team.budget)}</td>
                <td>{formatCurrency(team.budget)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {teams.map((team, index) => (
        <div key={team.id} className="card">
          <h2>
            {index === 0 && '🥇 '}
            {index === 1 && '🥈 '}
            {index === 2 && '🥉 '}
            {team.name} - Squad Details
          </h2>
          {team.players.length === 0 ? (
            <p style={{ color: '#666' }}>No players in this team.</p>
          ) : (
            <div className="grid">
              {team.players.map((player, idx) => (
                <div key={idx} className="player-card">
                  <h3>{player.name}</h3>
                  <p><strong>Role:</strong> {player.role}</p>
                  <p><strong>Points:</strong> {player.points}</p>
                  <p><strong>Bought For:</strong> {formatCurrency(player.boughtFor)}</p>
                  <p><small>{player.stats}</small></p>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <p><strong>Team Statistics:</strong></p>
            <p>Total Players: {team.players.length}</p>
            <p>Total Points: {team.totalPoints}</p>
            <p>Total Spent: {formatCurrency(100000000 - team.budget)}</p>
            <p>Average Points per Player: {team.players.length > 0 ? (team.totalPoints / team.players.length).toFixed(1) : 0}</p>
          </div>
        </div>
      ))}

      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <h2 style={{ color: 'white', border: 'none' }}>
          {teams.length > 0 && `🏆 Winner: ${teams[0].name} 🏆`}
        </h2>
        {teams.length > 0 && (
          <p style={{ fontSize: '1.3rem', marginTop: '1rem' }}>
            Congratulations to {teams[0].owner} for building the best team with {teams[0].totalPoints} points!
          </p>
        )}
      </div>
    </div>
  );
}

export default Results;
