import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const API_URL = `http://${window.location.hostname}:3001`;
const socket = io(API_URL);
const STARTING_BUDGET = 1200000000; // 120 Crores

function Results() {
  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Best 11 selections: { teamId: { best11: Set of player IDs, captainId: number } }
  const [teamSelections, setTeamSelections] = useState({});

  // Global best batsman/bowler
  const [bestBatsmanId, setBestBatsmanId] = useState('');
  const [bestBowlerId, setBestBowlerId] = useState('');

  // Multipliers
  const [captainMultiplier, setCaptainMultiplier] = useState(1.5);
  const [batsmanMultiplier, setBatsmanMultiplier] = useState(1.5);
  const [bowlerMultiplier, setBowlerMultiplier] = useState(1.5);

  // Final results
  const [finalResults, setFinalResults] = useState(null);
  const [showFinalScoring, setShowFinalScoring] = useState(false);

  // Search state for searchable dropdowns
  const [batsmanSearch, setBatsmanSearch] = useState('');
  const [bowlerSearch, setBowlerSearch] = useState('');
  const [batsmanDropdownOpen, setBatsmanDropdownOpen] = useState(false);
  const [bowlerDropdownOpen, setBowlerDropdownOpen] = useState(false);
  const batsmanRef = useRef(null);
  const bowlerRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (batsmanRef.current && !batsmanRef.current.contains(e.target)) setBatsmanDropdownOpen(false);
      if (bowlerRef.current && !bowlerRef.current.contains(e.target)) setBowlerDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchResults();

    // Real-time updates via Socket.IO
    socket.on('teamsUpdated', (updatedTeams) => {
      setTeams(updatedTeams.sort((a, b) => b.budget - a.budget));
      // Re-initialize selections for any new teams
      setTeamSelections(prev => {
        const newSelections = { ...prev };
        updatedTeams.forEach(team => {
          if (!newSelections[team.id]) {
            newSelections[team.id] = { best11: new Set(), captainId: null };
          }
        });
        return newSelections;
      });
    });

    socket.on('playerSold', () => {
      // Re-fetch to get updated team data with players
      fetchResults();
    });

    return () => {
      socket.off('teamsUpdated');
      socket.off('playerSold');
    };
  }, []);

  const fetchResults = async () => {
    try {
      const [teamsRes, playersRes] = await Promise.all([
        fetch(`${API_URL}/api/results`),
        fetch(`${API_URL}/api/players`)
      ]);
      const teamsData = await teamsRes.json();
      const playersData = await playersRes.json();
      setTeams(teamsData);
      setAllPlayers(playersData);

      // Initialize selections
      const selections = {};
      teamsData.forEach(team => {
        selections[team.id] = {
          best11: new Set(),
          captainId: null
        };
      });
      setTeamSelections(selections);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching results:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    }
    return `₹${(amount / 100000).toFixed(0)} Lakhs`;
  };

  const truncateRating = (points) => {
    return (Math.floor(points) / 100).toFixed(2);
  };

  // Toggle player in best 11
  const toggleBest11 = (teamId, playerId) => {
    setTeamSelections(prev => {
      const newSelections = { ...prev };
      const teamSel = { ...newSelections[teamId] };
      const newBest11 = new Set(teamSel.best11);

      if (newBest11.has(playerId)) {
        newBest11.delete(playerId);
        // If removing the captain, unset captain
        if (teamSel.captainId === playerId) {
          teamSel.captainId = null;
        }
      } else {
        if (newBest11.size >= 11) {
          alert('Maximum 11 players per team!');
          return prev;
        }
        newBest11.add(playerId);
      }

      teamSel.best11 = newBest11;
      newSelections[teamId] = teamSel;
      return newSelections;
    });
  };

  // Set captain for a team
  const setCaptain = (teamId, playerId) => {
    setTeamSelections(prev => {
      const newSelections = { ...prev };
      const teamSel = { ...newSelections[teamId] };
      teamSel.captainId = playerId;
      newSelections[teamId] = teamSel;
      return newSelections;
    });
  };

  // Calculate final scores
  const calculateFinalScores = async () => {
    // Validate
    for (const team of teams) {
      const sel = teamSelections[team.id];
      if (!sel || sel.best11.size === 0) {
        alert(`Please select Best 11 for ${team.name}`);
        return;
      }
      if (!sel.captainId) {
        alert(`Please select a Captain for ${team.name}`);
        return;
      }
    }
    if (!bestBatsmanId) {
      alert('Please select the Best Batsman!');
      return;
    }
    if (!bestBowlerId) {
      alert('Please select the Best Bowler!');
      return;
    }

    // Convert Sets to arrays for JSON
    const selectionsPayload = {};
    Object.keys(teamSelections).forEach(teamId => {
      selectionsPayload[teamId] = {
        best11: Array.from(teamSelections[teamId].best11),
        captainId: teamSelections[teamId].captainId
      };
    });

    try {
      const res = await fetch(`${API_URL}/api/results/calculate-final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamSelections: selectionsPayload,
          bestBatsmanId: parseInt(bestBatsmanId),
          bestBowlerId: parseInt(bestBowlerId),
          captainMultiplier: parseFloat(captainMultiplier),
          batsmanMultiplier: parseFloat(batsmanMultiplier),
          bowlerMultiplier: parseFloat(bowlerMultiplier)
        })
      });
      const data = await res.json();
      setFinalResults(data);
    } catch (error) {
      console.error('Error calculating final scores:', error);
    }
  };

  // Get all batsmen and bowlers from all players
  const allBatsmen = allPlayers.filter(p =>
    p.role?.toLowerCase().includes('batsmen') || p.role?.toLowerCase().includes('batsman')
  );
  const allBowlers = allPlayers.filter(p =>
    p.role?.toLowerCase().includes('bowler')
  );

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <h1 style={styles.loadingText}>LOADING...</h1>
      </div>
    );
  }

  // If final results exist, show final standings
  if (finalResults) {
    const winner = finalResults.teams[0];
    return (
      <div style={styles.page}>
        <style>{cssStyles}</style>

        {/* Winner Banner */}
        <div style={styles.winnerBanner}>
          <div style={styles.winnerTrophy}>🏆</div>
          <h1 style={styles.winnerTitle}>CHAMPION</h1>
          <h2 style={styles.winnerTeamName}>{winner.name}</h2>
          <p style={styles.winnerScore}>Final Score: {winner.finalScore.toFixed(2)}</p>
          <div style={styles.redLine}></div>
        </div>

        {/* Final Rankings Table */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>FINAL RANKINGS</h2>
          <div style={styles.tableWrapper}>
            <table className="results-tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>Final Score</th>
                  <th>Best 11 Score</th>
                  <th>Captain Bonus</th>
                  <th>Best Batsman</th>
                  <th>Best Bowler</th>
                  <th>Budget Left</th>
                </tr>
              </thead>
              <tbody>
                {finalResults.teams.map((team, index) => {
                  // Calculate breakdown (round each value to 2 decimal places)
                  const r2 = (n) => Math.round(n * 100) / 100;
                  const best11Players = team.players.filter(p => team.best11.includes(p.id));
                  const best11Score = r2(best11Players.reduce((sum, p) => sum + r2(p.points / 100), 0));
                  const captain = best11Players.find(p => p.id === team.captainId);
                  const captainBonus = captain ? r2(r2(captain.points / 100) * (finalResults.captainMultiplier - 1)) : 0;
                  const batsmanPlayer = team.hasBestBatsman ? team.players.find(p => p.id === finalResults.bestBatsmanId) : null;
                  const batsmanBonus = batsmanPlayer ? r2(r2(batsmanPlayer.points / 100) * (finalResults.batsmanMultiplier - 1)) : 0;
                  const bowlerPlayer = team.hasBestBowler ? team.players.find(p => p.id === finalResults.bestBowlerId) : null;
                  const bowlerBonus = bowlerPlayer ? r2(r2(bowlerPlayer.points / 100) * (finalResults.bowlerMultiplier - 1)) : 0;

                  return (
                    <tr key={team.id} className={index === 0 ? 'winner-row' : ''}>
                      <td><strong>#{index + 1}</strong></td>
                      <td><strong>{team.name}</strong></td>
                      <td><strong style={{ color: '#f59e0b', fontSize: '1.2rem' }}>{team.finalScore.toFixed(2)}</strong></td>
                      <td>{best11Score.toFixed(2)}</td>
                      <td>{captainBonus > 0 ? `+${captainBonus.toFixed(2)}` : '—'}</td>
                      <td style={{ color: team.hasBestBatsman ? '#22c55e' : '#666' }}>
                        {team.hasBestBatsman ? `+${batsmanBonus.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ color: team.hasBestBowler ? '#3b82f6' : '#666' }}>
                        {team.hasBestBowler ? `+${bowlerBonus.toFixed(2)}` : '—'}
                      </td>
                      <td>{formatCurrency(team.budget)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Awards */}
        <div style={styles.awardsSection}>
          <div style={styles.awardCard}>
            <span style={styles.awardIcon}>🏏</span>
            <h3 style={styles.awardLabel}>BEST BATSMAN</h3>
            <p style={styles.awardName}>{allPlayers.find(p => p.id === finalResults.bestBatsmanId)?.name || 'N/A'}</p>
            <p style={styles.awardMultiplier}>×{finalResults.batsmanMultiplier}</p>
          </div>
          <div style={styles.awardCard}>
            <span style={styles.awardIcon}>🎯</span>
            <h3 style={styles.awardLabel}>BEST BOWLER</h3>
            <p style={styles.awardName}>{allPlayers.find(p => p.id === finalResults.bestBowlerId)?.name || 'N/A'}</p>
            <p style={styles.awardMultiplier}>×{finalResults.bowlerMultiplier}</p>
          </div>
        </div>

        {/* Team Details */}
        {finalResults.teams.map((team, index) => (
          <div key={team.id} style={styles.section}>
            <h2 style={styles.sectionTitle}>
              {index === 0 && '🏆 '}{team.name} — Score: {team.finalScore.toFixed(2)}
            </h2>
            {team.players.length === 0 ? (
              <p style={{ color: '#666', padding: '20px' }}>No players in this team.</p>
            ) : (
              <div style={styles.playerGrid}>
                {team.players.map((player) => {
                  const isInBest11 = team.best11.includes(player.id);
                  const isCaptain = team.captainId === player.id;
                  const isBestBatsman = player.id === finalResults.bestBatsmanId;
                  const isBestBowler = player.id === finalResults.bestBowlerId;

                  return (
                    <div key={player.id} style={{
                      ...styles.playerCard,
                      ...(isInBest11 ? styles.playerCardSelected : {}),
                      ...(isCaptain ? styles.playerCardCaptain : {})
                    }}>
                      <div style={styles.playerCardHeader}>
                        <h4 style={styles.playerCardName}>{player.name}</h4>
                        <div style={styles.badgeRow}>
                          {isCaptain && <span style={styles.captainBadge}>C</span>}
                          {isBestBatsman && <span style={styles.batsmanBadge}>🏏</span>}
                          {isBestBowler && <span style={styles.bowlerBadge}>🎯</span>}
                          {isInBest11 && <span style={styles.best11Badge}>XI</span>}
                        </div>
                      </div>
                      <p style={styles.playerCardInfo}><strong>Role:</strong> {player.role}</p>
                      <p style={styles.playerCardInfo}><strong>Rating:</strong> {truncateRating(player.points)}</p>
                      <p style={styles.playerCardInfo}><strong>Bought For:</strong> {formatCurrency(player.boughtFor)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <div style={{ textAlign: 'center', margin: '40px 0' }}>
          <button style={styles.backBtn} onClick={() => setFinalResults(null)}>
            ◀ BACK TO SELECTIONS
          </button>
          <a href="/" style={{ ...styles.backBtn, marginLeft: '15px', textDecoration: 'none', display: 'inline-block' }}>
            ◀ BACK TO AUCTION
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{cssStyles}</style>
      <h1 style={styles.pageTitle}>AUCTION RESULTS</h1>
      <div style={styles.redLine}></div>

      {/* Team Rankings Table - sorted by budget */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>TEAM STANDINGS (By Budget Remaining)</h2>
        <div style={styles.tableWrapper}>
          <table className="results-tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Team Name</th>
                <th>Owner</th>
                <th>Players</th>
                <th>Budget Used</th>
                <th>Budget Left</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <tr key={team.id}>
                  <td><strong>#{index + 1}</strong></td>
                  <td><strong>{team.name}</strong></td>
                  <td>{team.owner}</td>
                  <td>{team.players.length}</td>
                  <td>{formatCurrency(STARTING_BUDGET - team.budget)}</td>
                  <td><strong>{formatCurrency(team.budget)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Squad Details */}
      {teams.map((team) => (
        <div key={team.id} style={styles.section}>
          <h2 style={styles.sectionTitle}>{team.name} - Squad Details</h2>
          {team.players.length === 0 ? (
            <p style={{ color: '#666', padding: '20px' }}>No players in this team.</p>
          ) : (
            <div style={styles.playerGrid}>
              {team.players.map((player) => (
                <div key={player.id || player.name} style={styles.playerCard}>
                  <h4 style={styles.playerCardName}>{player.name}</h4>
                  <p style={styles.playerCardInfo}><strong>Role:</strong> {player.role}</p>
                  <p style={styles.playerCardInfo}><strong>Rating:</strong> {truncateRating(player.points)}</p>
                  <p style={styles.playerCardInfo}><strong>Bought For:</strong> {formatCurrency(player.boughtFor)}</p>
                </div>
              ))}
            </div>
          )}
          <div style={styles.teamStats}>
            <p><strong>Total Players:</strong> {team.players.length}</p>
            <p><strong>Total Spent:</strong> {formatCurrency(STARTING_BUDGET - team.budget)}</p>
            <p><strong>Remaining Budget:</strong> {formatCurrency(team.budget)}</p>
          </div>
        </div>
      ))}

      {/* FINAL SCORING SECTION */}
      <div style={styles.scoringHeader}>
        <div style={styles.redLine}></div>
        <h1 style={styles.scoringTitle}>⚡ FINAL SCORING</h1>
        <p style={styles.scoringSubtitle}>
          Select Best 11 & Captain for each team, then choose global Best Batsman & Bowler
        </p>
        <button
          style={styles.toggleScoringBtn}
          onClick={() => setShowFinalScoring(!showFinalScoring)}
        >
          {showFinalScoring ? '▲ HIDE SELECTIONS' : '▼ SHOW SELECTIONS'}
        </button>
      </div>

      {showFinalScoring && (
        <>
          {/* Best 11 Selection per team */}
          {teams.map((team) => (
            <div key={team.id} style={styles.selectionSection}>
              <h3 style={styles.selectionTitle}>
                {team.name} — Best 11
                <span style={styles.selectionCount}>
                  {teamSelections[team.id]?.best11.size || 0}/11 selected
                </span>
              </h3>
              {team.players.length === 0 ? (
                <p style={{ color: '#888', padding: '10px 20px' }}>No players to select.</p>
              ) : (
                <div style={styles.selectionGrid}>
                  {team.players.map((player) => {
                    const isSelected = teamSelections[team.id]?.best11.has(player.id);
                    const isCaptain = teamSelections[team.id]?.captainId === player.id;

                    return (
                      <div
                        key={player.id}
                        style={{
                          ...styles.selectionCard,
                          ...(isSelected ? styles.selectionCardActive : {})
                        }}
                      >
                        <div
                          style={styles.selectionCardMain}
                          onClick={() => toggleBest11(team.id, player.id)}
                        >
                          <div style={{
                            ...styles.checkBox,
                            ...(isSelected ? styles.checkBoxActive : {})
                          }}>
                            {isSelected ? '✓' : ''}
                          </div>
                          <div style={styles.selectionCardInfo}>
                            <span style={styles.selectionPlayerName}>{player.name}</span>
                            <span style={styles.selectionPlayerRole}>{player.role} • {truncateRating(player.points)}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <button
                            style={{
                              ...styles.captainBtn,
                              ...(isCaptain ? styles.captainBtnActive : {})
                            }}
                            onClick={() => setCaptain(team.id, player.id)}
                          >
                            {isCaptain ? '★ CAPTAIN' : 'Set Captain'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Global Best Batsman & Bowler */}
          <div style={styles.globalSelectionsSection}>
            <h3 style={styles.selectionTitle}>GLOBAL AWARDS</h3>
            <div style={styles.globalSelectionsGrid}>

              {/* Best Batsman Searchable Dropdown */}
              <div style={styles.globalSelectCard} ref={batsmanRef}>
                <label style={styles.globalLabel}>🏏 BEST BATSMAN (All Teams)</label>
                {bestBatsmanId && (
                  <div style={styles.selectedBadge}>
                    <span>{allPlayers.find(p => p.id === parseInt(bestBatsmanId))?.name || ''}</span>
                    <button style={styles.clearBtn} onClick={() => { setBestBatsmanId(''); setBatsmanSearch(''); }}>✕</button>
                  </div>
                )}
                <div style={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Search batsman by name..."
                    value={batsmanSearch}
                    onChange={(e) => { setBatsmanSearch(e.target.value); setBatsmanDropdownOpen(true); }}
                    onFocus={() => setBatsmanDropdownOpen(true)}
                    style={styles.searchInput}
                  />
                  <span style={styles.searchIcon}>🔍</span>
                </div>
                {batsmanDropdownOpen && (
                  <div style={styles.dropdownList}>
                    {allBatsmen
                      .filter(p => p.name.toLowerCase().includes(batsmanSearch.toLowerCase()))
                      .sort((a, b) => b.points - a.points)
                      .map(p => (
                        <div
                          key={p.id}
                          className="search-dropdown-item"
                          style={{
                            ...styles.dropdownItem,
                            ...(parseInt(bestBatsmanId) === p.id ? styles.dropdownItemSelected : {})
                          }}
                          onClick={() => {
                            setBestBatsmanId(String(p.id));
                            setBatsmanSearch('');
                            setBatsmanDropdownOpen(false);
                          }}
                        >
                          <span style={styles.dropdownItemName}>{p.name}</span>
                          <span style={styles.dropdownItemRating}>{truncateRating(p.points)}</span>
                        </div>
                      ))
                    }
                    {allBatsmen.filter(p => p.name.toLowerCase().includes(batsmanSearch.toLowerCase())).length === 0 && (
                      <div style={styles.dropdownEmpty}>No batsmen found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Best Bowler Searchable Dropdown */}
              <div style={styles.globalSelectCard} ref={bowlerRef}>
                <label style={styles.globalLabel}>🎯 BEST BOWLER (All Teams)</label>
                {bestBowlerId && (
                  <div style={styles.selectedBadge}>
                    <span>{allPlayers.find(p => p.id === parseInt(bestBowlerId))?.name || ''}</span>
                    <button style={styles.clearBtn} onClick={() => { setBestBowlerId(''); setBowlerSearch(''); }}>✕</button>
                  </div>
                )}
                <div style={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Search bowler by name..."
                    value={bowlerSearch}
                    onChange={(e) => { setBowlerSearch(e.target.value); setBowlerDropdownOpen(true); }}
                    onFocus={() => setBowlerDropdownOpen(true)}
                    style={styles.searchInput}
                  />
                  <span style={styles.searchIcon}>🔍</span>
                </div>
                {bowlerDropdownOpen && (
                  <div style={styles.dropdownList}>
                    {allBowlers
                      .filter(p => p.name.toLowerCase().includes(bowlerSearch.toLowerCase()))
                      .sort((a, b) => b.points - a.points)
                      .map(p => (
                        <div
                          key={p.id}
                          className="search-dropdown-item"
                          style={{
                            ...styles.dropdownItem,
                            ...(parseInt(bestBowlerId) === p.id ? styles.dropdownItemSelected : {})
                          }}
                          onClick={() => {
                            setBestBowlerId(String(p.id));
                            setBowlerSearch('');
                            setBowlerDropdownOpen(false);
                          }}
                        >
                          <span style={styles.dropdownItemName}>{p.name}</span>
                          <span style={styles.dropdownItemRating}>{truncateRating(p.points)}</span>
                        </div>
                      ))
                    }
                    {allBowlers.filter(p => p.name.toLowerCase().includes(bowlerSearch.toLowerCase())).length === 0 && (
                      <div style={styles.dropdownEmpty}>No bowlers found</div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Multiplier Controls */}
          <div style={styles.multiplierSection}>
            <h3 style={styles.selectionTitle}>MULTIPLIERS</h3>
            <div style={styles.multiplierGrid}>
              <div style={styles.multiplierCard}>
                <label style={styles.multiplierLabel}>Captain Multiplier</label>
                <div style={styles.multiplierInputRow}>
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.1"
                    value={captainMultiplier}
                    onChange={(e) => setCaptainMultiplier(parseFloat(e.target.value))}
                    style={styles.slider}
                  />
                  <span style={styles.multiplierValue}>×{captainMultiplier.toFixed(1)}</span>
                </div>
              </div>
              <div style={styles.multiplierCard}>
                <label style={styles.multiplierLabel}>Best Batsman Multiplier</label>
                <div style={styles.multiplierInputRow}>
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.1"
                    value={batsmanMultiplier}
                    onChange={(e) => setBatsmanMultiplier(parseFloat(e.target.value))}
                    style={styles.slider}
                  />
                  <span style={styles.multiplierValue}>×{batsmanMultiplier.toFixed(1)}</span>
                </div>
              </div>
              <div style={styles.multiplierCard}>
                <label style={styles.multiplierLabel}>Best Bowler Multiplier</label>
                <div style={styles.multiplierInputRow}>
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.1"
                    value={bowlerMultiplier}
                    onChange={(e) => setBowlerMultiplier(parseFloat(e.target.value))}
                    style={styles.slider}
                  />
                  <span style={styles.multiplierValue}>×{bowlerMultiplier.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <div style={{ textAlign: 'center', margin: '30px 0 50px' }}>
            <button style={styles.calculateBtn} onClick={calculateFinalScores}>
              ⚡ CALCULATE FINAL SCORES
            </button>
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '40px' }}>
        <a href="/" style={styles.backBtn}>
          ◀ BACK TO BIDDING
        </a>
      </div>
    </div>
  );
}

// ===== STYLES =====
const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: 'white',
    fontFamily: "'Oswald', 'Segoe UI', sans-serif",
    padding: '30px 40px',
  },
  pageTitle: {
    fontFamily: "'Bebas Neue', 'Oswald', sans-serif",
    fontSize: '3rem',
    letterSpacing: '6px',
    textAlign: 'center',
    color: 'white',
    marginBottom: '10px',
  },
  redLine: {
    width: '250px',
    height: '3px',
    background: '#dc2626',
    margin: '10px auto 30px',
    boxShadow: '0 0 15px rgba(220,38,38,0.6)',
  },
  loadingContainer: {
    height: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
  },
  loadingText: {
    fontFamily: "'Oswald', sans-serif",
    letterSpacing: '5px',
  },
  section: {
    background: 'rgba(20,20,20,0.85)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '25px',
    backdropFilter: 'blur(10px)',
  },
  sectionTitle: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '1.3rem',
    color: '#ccc',
    letterSpacing: '3px',
    marginBottom: '20px',
    borderBottom: '2px solid rgba(220,38,38,0.3)',
    paddingBottom: '10px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  playerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '12px',
  },
  playerCard: {
    background: 'rgba(30,30,30,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '15px',
    transition: 'all 0.2s',
  },
  playerCardSelected: {
    borderColor: '#f59e0b',
    background: 'rgba(245,158,11,0.08)',
  },
  playerCardCaptain: {
    borderColor: '#facc15',
    boxShadow: '0 0 12px rgba(250,204,21,0.3)',
  },
  playerCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  playerCardName: {
    fontSize: '1rem',
    fontWeight: 600,
    letterSpacing: '1px',
    color: 'white',
    margin: 0,
  },
  badgeRow: {
    display: 'flex',
    gap: '4px',
  },
  captainBadge: {
    background: '#facc15',
    color: '#000',
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  batsmanBadge: {
    fontSize: '1rem',
  },
  bowlerBadge: {
    fontSize: '1rem',
  },
  best11Badge: {
    background: '#f59e0b',
    color: '#000',
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  playerCardInfo: {
    fontSize: '0.85rem',
    color: '#aaa',
    margin: '3px 0',
    letterSpacing: '0.5px',
  },
  teamStats: {
    marginTop: '20px',
    padding: '15px',
    background: 'rgba(40,40,40,0.8)',
    borderRadius: '8px',
    display: 'flex',
    gap: '25px',
    flexWrap: 'wrap',
    fontSize: '0.9rem',
    color: '#bbb',
    letterSpacing: '1px',
  },

  // Scoring section
  scoringHeader: {
    textAlign: 'center',
    margin: '50px 0 20px',
  },
  scoringTitle: {
    fontFamily: "'Bebas Neue', 'Oswald', sans-serif",
    fontSize: '2.5rem',
    letterSpacing: '5px',
    color: '#f59e0b',
    textShadow: '0 0 30px rgba(245,158,11,0.3)',
    marginBottom: '5px',
  },
  scoringSubtitle: {
    color: '#888',
    letterSpacing: '2px',
    fontSize: '0.95rem',
    marginBottom: '15px',
  },
  toggleScoringBtn: {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#000',
    border: 'none',
    padding: '12px 35px',
    borderRadius: '8px',
    fontFamily: "'Oswald', sans-serif",
    fontSize: '1rem',
    fontWeight: 700,
    letterSpacing: '3px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },

  // Selection cards
  selectionSection: {
    background: 'rgba(20,20,20,0.85)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '20px 25px',
    marginBottom: '20px',
  },
  selectionTitle: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '1.1rem',
    color: '#ccc',
    letterSpacing: '2px',
    marginBottom: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionCount: {
    fontSize: '0.9rem',
    color: '#f59e0b',
    fontWeight: 600,
  },
  selectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '8px',
  },
  selectionCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'rgba(30,30,30,0.8)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  selectionCardActive: {
    borderColor: '#f59e0b',
    background: 'rgba(245,158,11,0.08)',
  },
  selectionCardMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    cursor: 'pointer',
  },
  checkBox: {
    width: '22px',
    height: '22px',
    borderRadius: '4px',
    border: '2px solid rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: '#000',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  checkBoxActive: {
    background: '#f59e0b',
    borderColor: '#f59e0b',
  },
  selectionCardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  selectionPlayerName: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'white',
    letterSpacing: '1px',
  },
  selectionPlayerRole: {
    fontSize: '0.75rem',
    color: '#888',
    letterSpacing: '1px',
  },
  captainBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    color: '#aaa',
    fontFamily: "'Oswald', sans-serif",
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '1px',
    padding: '4px 10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginLeft: '8px',
    whiteSpace: 'nowrap',
  },
  captainBtnActive: {
    background: '#facc15',
    borderColor: '#facc15',
    color: '#000',
    fontWeight: 700,
  },

  // Global selections
  globalSelectionsSection: {
    background: 'rgba(20,20,20,0.85)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '20px 25px',
    marginBottom: '20px',
  },
  globalSelectionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  globalSelectCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative',
  },
  globalLabel: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '0.95rem',
    color: '#ccc',
    letterSpacing: '2px',
    fontWeight: 600,
  },
  searchInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    width: '100%',
    padding: '10px 40px 10px 14px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    color: 'white',
    fontFamily: "'Oswald', sans-serif",
    fontSize: '0.95rem',
    letterSpacing: '1px',
    outline: 'none',
  },
  searchIcon: {
    position: 'absolute',
    right: '12px',
    fontSize: '1rem',
    pointerEvents: 'none',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: '250px',
    overflowY: 'auto',
    background: '#1a1a1a',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: '0 0 8px 8px',
    zIndex: 100,
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  },
  dropdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'background 0.15s',
  },
  dropdownItemSelected: {
    background: 'rgba(245,158,11,0.15)',
    borderLeft: '3px solid #f59e0b',
  },
  dropdownItemName: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '0.9rem',
    color: 'white',
    letterSpacing: '1px',
  },
  dropdownItemRating: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '1rem',
    color: '#f59e0b',
    fontWeight: 600,
  },
  dropdownEmpty: {
    padding: '15px',
    color: '#666',
    fontFamily: "'Oswald', sans-serif",
    textAlign: 'center',
    letterSpacing: '1px',
  },
  selectedBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    background: 'rgba(245,158,11,0.12)',
    border: '1px solid rgba(245,158,11,0.4)',
    borderRadius: '6px',
    color: '#f59e0b',
    fontFamily: "'Oswald', sans-serif",
    fontSize: '0.95rem',
    fontWeight: 600,
    letterSpacing: '1px',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },

  // Multipliers
  multiplierSection: {
    background: 'rgba(20,20,20,0.85)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '20px 25px',
    marginBottom: '20px',
  },
  multiplierGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '20px',
  },
  multiplierCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  multiplierLabel: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '0.9rem',
    color: '#ccc',
    letterSpacing: '2px',
  },
  multiplierInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  slider: {
    flex: 1,
    appearance: 'none',
    height: '6px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#f59e0b',
  },
  multiplierValue: {
    fontFamily: "'Bebas Neue', 'Oswald', sans-serif",
    fontSize: '1.4rem',
    color: '#f59e0b',
    fontWeight: 700,
    minWidth: '50px',
    textAlign: 'center',
  },

  // Calculate button
  calculateBtn: {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#000',
    border: 'none',
    padding: '16px 50px',
    borderRadius: '10px',
    fontFamily: "'Oswald', sans-serif",
    fontSize: '1.3rem',
    fontWeight: 700,
    letterSpacing: '4px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 0 20px rgba(245,158,11,0.3)',
  },

  // Back button
  backBtn: {
    display: 'inline-block',
    padding: '12px 30px',
    background: '#dc2626',
    color: 'white',
    textDecoration: 'none',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    fontFamily: "'Oswald', sans-serif",
    borderRadius: '8px',
    letterSpacing: '2px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    transition: 'all 0.3s',
  },

  // Winner banner
  winnerBanner: {
    textAlign: 'center',
    padding: '40px 20px',
    background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(220,38,38,0.1))',
    borderRadius: '16px',
    border: '2px solid rgba(245,158,11,0.3)',
    marginBottom: '30px',
  },
  winnerTrophy: {
    fontSize: '5rem',
    marginBottom: '10px',
  },
  winnerTitle: {
    fontFamily: "'Bebas Neue', 'Oswald', sans-serif",
    fontSize: '3.5rem',
    letterSpacing: '10px',
    color: '#facc15',
    textShadow: '0 0 30px rgba(250,204,21,0.4)',
    margin: '0',
  },
  winnerTeamName: {
    fontFamily: "'Bebas Neue', 'Oswald', sans-serif",
    fontSize: '2.5rem',
    letterSpacing: '5px',
    color: 'white',
    margin: '10px 0',
  },
  winnerScore: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '1.3rem',
    color: '#f59e0b',
    letterSpacing: '3px',
  },

  // Awards
  awardsSection: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    marginBottom: '30px',
  },
  awardCard: {
    textAlign: 'center',
    background: 'rgba(20,20,20,0.85)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '25px 40px',
    minWidth: '200px',
  },
  awardIcon: {
    fontSize: '2.5rem',
    display: 'block',
    marginBottom: '8px',
  },
  awardLabel: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '0.85rem',
    color: '#888',
    letterSpacing: '2px',
    margin: '0 0 8px',
  },
  awardName: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '1.2rem',
    color: 'white',
    letterSpacing: '1px',
    fontWeight: 600,
    margin: '0 0 4px',
  },
  awardMultiplier: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '1.5rem',
    color: '#f59e0b',
    margin: 0,
  },
};

const cssStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Bebas+Neue&display=swap');

  .results-tbl {
    width: 100%;
    border-collapse: collapse;
  }
  .results-tbl th {
    background: rgba(220,38,38,0.2);
    color: #ccc;
    font-family: 'Oswald', sans-serif;
    font-size: 0.85rem;
    letter-spacing: 2px;
    font-weight: 600;
    padding: 12px 16px;
    text-align: left;
    border-bottom: 2px solid rgba(220,38,38,0.3);
  }
  .results-tbl td {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    color: #ccc;
    font-family: 'Oswald', sans-serif;
    font-size: 0.95rem;
    letter-spacing: 1px;
  }
  .results-tbl tr:hover {
    background: rgba(255,255,255,0.03);
  }
  .results-tbl .winner-row {
    background: rgba(245,158,11,0.08) !important;
    border-left: 3px solid #f59e0b;
  }
  .results-tbl select option {
    background: #1a1a1a;
    color: white;
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    background: rgba(255,255,255,0.15);
    border-radius: 3px;
    outline: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #f59e0b;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(245,158,11,0.5);
  }
  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #f59e0b;
    cursor: pointer;
    border: none;
  }

  /* Searchable dropdown hover */
  .search-dropdown-item:hover {
    background: rgba(245,158,11,0.12) !important;
  }
`;

export default Results;
