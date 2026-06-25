import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const API_URL = `http://${window.location.hostname}:3001`;
const socket = io(API_URL);

function Home() {
  const [auctionState, setAuctionState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [soldAnimationData, setSoldAnimationData] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [teamInputs, setTeamInputs] = useState(Array(10).fill(''));
  const [selectedTeam, setSelectedTeam] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const selectedTeamRef = useRef('');

  // Accelerated auction state
  const [unsoldPlayers, setUnsoldPlayers] = useState([]);
  const [selectedAccPlayers, setSelectedAccPlayers] = useState(new Set());

  useEffect(() => {
    initLoad();
    socket.on('auctionUpdate', (state) => {
      setAuctionState(state);
      if (state && state.isActive && state.currentPlayer) setPhase('auction');
    });
    socket.on('teamsUpdated', (updatedTeams) => setTeams(updatedTeams));
    socket.on('playerSold', (data) => {
      setSoldAnimationData(data);
      setTimeout(() => setSoldAnimationData(null), 2500);
    });
    return () => { socket.off('auctionUpdate'); socket.off('teamsUpdated'); socket.off('playerSold'); };
  }, []);

  const initLoad = async () => {
    try {
      const [teamsRes, stateRes] = await Promise.all([
        fetch(`${API_URL}/api/teams`), fetch(`${API_URL}/api/auction-state`)
      ]);
      const teamsData = await teamsRes.json();
      const stateData = await stateRes.json();
      setTeams(teamsData || []);
      setAuctionState(stateData);
      if (teamsData && teamsData.length > 0) {
        setTeamInputs(teamsData.map(t => t.name).concat(Array(Math.max(0, 10 - teamsData.length)).fill('')));
      }
      if (stateData && stateData.isActive && stateData.currentPlayer) setPhase('auction');
      else if (stateData && stateData.auctionIndex >= 0) setPhase('auction');
      else setPhase('setup');
    } catch (error) { console.error('Error loading:', error); setPhase('setup'); }
  };

  const handleInitTeams = async () => {
    const finalTeams = teamInputs.map((t, i) => t.trim() || `Team ${i+1}`);
    try {
      const res = await fetch(`${API_URL}/api/teams/init`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamNames: finalTeams })
      });
      const newTeams = await res.json();
      setTeams(newTeams);
      const nextRes = await fetch(`${API_URL}/api/auction/next`, { method: 'POST' });
      const nextState = await nextRes.json();
      setAuctionState(nextState);
      setPhase('auction');
    } catch (error) { console.error('Error initializing teams:', error); }
  };

  const sellPlayer = async () => {
    const teamToSell = selectedTeamRef.current;
    if (!teamToSell) { alert("Please select a winning team!"); return; }
    if (!sellingPrice || isNaN(sellingPrice)) { alert("Please enter a valid price in Crores."); return; }
    const priceInRupees = parseFloat(sellingPrice) * 10000000;
    try {
      const res = await fetch(`${API_URL}/api/auction/sell`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: teamToSell, soldPrice: priceInRupees })
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setSellingPrice(''); setSelectedTeam(''); selectedTeamRef.current = '';
    } catch (error) { console.error('Error selling:', error); }
  };

  const markUnsold = async () => {
    try {
      await fetch(`${API_URL}/api/auction/unsold`, { method: 'POST' });
      setSellingPrice(''); setSelectedTeam(''); selectedTeamRef.current = '';
    } catch (error) { console.error('Error marking unsold:', error); }
  };

  const undoLastSale = async () => {
    if (!confirm('Undo the last sale?')) return;
    try {
      const res = await fetch(`${API_URL}/api/auction/undo`, { method: 'POST' });
      const data = await res.json();
      if (data.error) alert(data.error);
      setSellingPrice(''); setSelectedTeam(''); selectedTeamRef.current = '';
    } catch (error) { console.error('Error undoing:', error); }
  };

  const restartAuction = async () => {
    if (!confirm('RESTART the entire auction? All sales will be erased!')) return;
    try {
      await fetch(`${API_URL}/api/auction/restart`, { method: 'POST' });
      setPhase('setup'); setSellingPrice(''); setSelectedTeam(''); selectedTeamRef.current = '';
    } catch (error) { console.error('Error restarting:', error); }
  };

  // ===== ACCELERATED AUCTION =====
  const openAcceleratedSetup = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auction/unsold-players`);
      const data = await res.json();
      setUnsoldPlayers(data);
      setSelectedAccPlayers(new Set(data.map(p => p.id)));
      setPhase('accelerated-setup');
    } catch (error) { console.error('Error fetching unsold:', error); }
  };

  const toggleAccPlayer = (id) => {
    setSelectedAccPlayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 30) next.add(id);
      else alert('Maximum 30 players allowed!');
      return next;
    });
  };

  const selectAllAcc = () => {
    setSelectedAccPlayers(new Set(unsoldPlayers.slice(0, 30).map(p => p.id)));
  };

  const deselectAllAcc = () => {
    setSelectedAccPlayers(new Set());
  };

  const startAcceleratedAuction = async () => {
    if (selectedAccPlayers.size === 0) { alert('Select at least 1 player!'); return; }
    try {
      const res = await fetch(`${API_URL}/api/auction/accelerated`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: Array.from(selectedAccPlayers) })
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setAuctionState(data);
      setPhase('auction');
    } catch (error) { console.error('Error starting accelerated:', error); }
  };

  const handleTeamSelect = (val) => { setSelectedTeam(val); selectedTeamRef.current = val; };

  const formatCurrency = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} CR`;
    return `${(amount / 100000).toFixed(0)} LAKHS`;
  };
  const formatCurrencyShort = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}CR`;
    return `${(amount / 100000).toFixed(0)}L`;
  };

  // Emoji constants (avoid encoding issues)
  const HAMMER = '\ud83d\udd28';
  const CHART = '\ud83d\udcca';
  const BOLT = '\u26a1';
  const ARROW_DOWN = '\u25bc';
  const CHECK = '\u2713';
  const UNDO_ARROW = '\u21a9';
  const REFRESH = '\u27f3';

  // ===== LOADING =====
  if (phase === 'loading') {
    return (
      <div style={{ height:'100vh', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
        <h1 style={{ fontFamily:"'Oswald', sans-serif", letterSpacing:'5px' }}>LOADING...</h1>
      </div>
    );
  }

  // ===== SETUP PHASE =====
  if (phase === 'setup') {
    return (
      <div className="ss-page">
        <style>{globalStyles}</style>

        {/* FRAME 1: Full-screen hero splash */}
        <div className="ss-frame ss-hero-frame">
          <h1 className="ss-hero-title">STADIUM<br/>SHOWDOWN</h1>
          <p className="ss-hero-subtitle">THE ULTIMATE AUCTION</p>
          <div className="ss-red-line"></div>
          <div className="ss-scroll-hint">{ARROW_DOWN} SCROLL TO REGISTER {ARROW_DOWN}</div>
        </div>

        {/* FRAME 2: Team registration */}
        <div className="ss-frame ss-register-frame">
          <div className="ss-register-card">
            <h3 className="ss-register-title">REGISTER TEAMS</h3>
            <div className="ss-team-grid">
              {teamInputs.slice(0,10).map((name, idx) => (
                <input
                  key={idx}
                  value={name}
                  onChange={(e) => {
                    const newInputs = [...teamInputs];
                    newInputs[idx] = e.target.value;
                    setTeamInputs(newInputs);
                  }}
                  placeholder={`Team ${idx + 1}`}
                  className="ss-team-input"
                />
              ))}
            </div>
            <button onClick={handleInitTeams} className="ss-start-btn">
              START AUCTION
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== ACCELERATED SETUP PHASE =====
  if (phase === 'accelerated-setup') {
    return (
      <div className="ss-page">
        <style>{globalStyles}</style>
        <div className="ss-frame" style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'30px', overflow:'auto' }}>
          
          {/* Header */}
          <div className="ss-acc-header">
            <span className="ss-acc-bolt">{BOLT}</span>
            <h1 className="ss-acc-title">ACCELERATED AUCTION</h1>
            <p className="ss-acc-subtitle">Select up to 30 unsold players for the accelerated round</p>
            <div className="ss-red-line" style={{margin:'15px auto'}}></div>
          </div>

          {/* Controls */}
          <div className="ss-acc-controls">
            <span className="ss-acc-count">{selectedAccPlayers.size} / 30 SELECTED</span>
            <div style={{display:'flex', gap:'10px'}}>
              <button className="ss-ctrl-btn ss-btn-sold" onClick={selectAllAcc}>SELECT ALL</button>
              <button className="ss-ctrl-btn ss-btn-unsold" onClick={deselectAllAcc}>DESELECT ALL</button>
            </div>
          </div>

          {/* Player Grid */}
          <div className="ss-acc-grid">
            {unsoldPlayers.map(p => (
              <div
                key={p.id}
                className={`ss-acc-card ${selectedAccPlayers.has(p.id) ? 'ss-acc-card-selected' : ''}`}
                onClick={() => toggleAccPlayer(p.id)}
              >
                <img
                  src={p.photo}
                  alt={p.name}
                  className="ss-acc-card-img"
                  onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name) + '&size=128&background=1a1a1a&color=fff'; }}
                />
                <div className="ss-acc-card-info">
                  <span className="ss-acc-card-name">{p.name}</span>
                  <span className="ss-acc-card-role">{p.role}</span>
                  <span className="ss-acc-card-price">Base: {formatCurrencyShort(Math.round(p.basePrice / 2))}</span>
                </div>
                <div className="ss-acc-card-check">
                  {selectedAccPlayers.has(p.id) ? CHECK : ''}
                </div>
              </div>
            ))}
          </div>

          {unsoldPlayers.length === 0 && (
            <p style={{color:'#888', fontSize:'1.2rem', marginTop:'30px', fontFamily:"'Oswald', sans-serif", letterSpacing:'2px'}}>
              NO UNSOLD PLAYERS FOUND
            </p>
          )}

          {/* Start Button */}
          <div style={{marginTop:'25px', display:'flex', gap:'15px'}}>
            <button
              className="ss-start-btn"
              style={{width:'auto', padding:'14px 50px', fontSize:'1.3rem'}}
              onClick={startAcceleratedAuction}
              disabled={selectedAccPlayers.size === 0}
            >
              {BOLT} START ACCELERATED ({selectedAccPlayers.size} PLAYERS)
            </button>
            <a href="/results" className="ss-ctrl-btn ss-btn-results" style={{fontSize:'1.1rem', padding:'14px 30px', display:'flex', alignItems:'center'}}>{CHART} RESULTS</a>
          </div>
        </div>
      </div>
    );
  }

  // ===== AUCTION PHASE =====
  const player = auctionState?.currentPlayer;
  const isAccelerated = auctionState?.isAccelerated;

  return (
    <div className="ss-page">
      <style>{globalStyles}</style>

      {/* SOLD / UNSOLD OVERLAY */}
      {soldAnimationData && (
        <div className="ss-sold-overlay">
          <div className="ss-hammer">{HAMMER}</div>
          <div className="ss-sold-badge">
            {soldAnimationData.player.team !== 'UNSOLD' ? 'SOLD!' : 'UNSOLD'}
          </div>
          <div className="ss-sold-details">
            {soldAnimationData.player.team !== 'UNSOLD' ? (
              <>
                <span className="ss-sold-team">{soldAnimationData.player.team}</span><br/>
                <span className="ss-sold-price">{formatCurrency(soldAnimationData.player.price)}</span>
              </>
            ) : (
              <span style={{color:'#ef4444', fontSize:'2rem'}}>NO BIDS PLACED</span>
            )}
          </div>
        </div>
      )}

      {/* AUCTION SLIDE */}
      {auctionState && auctionState.isActive && player ? (
        <div className="ss-frame ss-auction-frame" key={player.id}>
          {/* Brand/Sponsor Logos */}
          <img src="/E summit logo.png" alt="E Summit" className="ss-esummit-logo" />
          <img src="/sponsor ipl auction.png" alt="Sponsor" className="ss-sponsor-logo" />

          {/* Accelerated Badge */}
          {isAccelerated && (
            <div className="ss-acc-badge">
              <span className="ss-acc-badge-bolt">{BOLT}</span> ACCELERATED
            </div>
          )}

          {/* Top header */}
          <div className="ss-header">
            <div className="ss-header-left">
              <span className="ss-brand">STADIUM SHOWDOWN</span>
              <div className="ss-role-banner">{player.role?.toUpperCase() || 'PLAYER'}</div>
            </div>
          </div>

          {/* Player content: Name | Photo | Info */}
          <div className="ss-main-content">
            <div className="ss-player-name-area">
              <h1 className="ss-player-name">{player.name?.toUpperCase()}</h1>
            </div>
            <div className="ss-player-photo-area">
              <img
                src={player.photo}
                alt={player.name}
                className="ss-player-img"
                onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(player.name) + '&size=512&background=1a1a1a&color=fff&bold=true'; }}
              />
            </div>
            <div className="ss-info-panel">
              <div className="ss-info-row">
                <span className="ss-info-label">PLAYER RATING</span>
                <span className="ss-info-value">{(Math.floor(player.points) / 100).toFixed(2)}</span>
              </div>
              <div className="ss-info-row ss-info-highlight">
                <span className="ss-info-label">BASE PRICE</span>
                <span className="ss-info-value">{formatCurrencyShort(player.basePrice)}</span>
              </div>
              <div className="ss-info-row">
                <span className="ss-info-label">CURRENT BID</span>
                <span className="ss-info-value ss-live">{sellingPrice ? `${sellingPrice}CR` : 'LIVE'}</span>
              </div>
            </div>
          </div>

          {/* Red accent line */}
          <div className="ss-red-accent-line"></div>

          {/* Controls - buttons FIRST, then inputs below */}
          <div className="ss-controls">
            <div className="ss-ctrl-buttons">
              <button className="ss-ctrl-btn ss-btn-sold" onClick={sellPlayer}>SOLD!</button>
              <button className="ss-ctrl-btn ss-btn-unsold" onClick={markUnsold}>UNSOLD</button>
              <button className="ss-ctrl-btn ss-btn-undo" onClick={undoLastSale}>{UNDO_ARROW} UNDO</button>
              <button className="ss-ctrl-btn ss-btn-restart" onClick={restartAuction}>{REFRESH} RESTART</button>
              <a href="/results" className="ss-ctrl-btn ss-btn-results">{CHART} RESULTS</a>
            </div>
            <div className="ss-ctrl-inputs">
              <select className="ss-ctrl-select" value={selectedTeam} onChange={e => handleTeamSelect(e.target.value)}>
                <option value="">-- SELECT TEAM --</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input
                className="ss-ctrl-input"
                type="number"
                step="0.05"
                placeholder="Price (Cr)"
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="ss-frame" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <h1 className="ss-hero-title" style={{fontSize:'4rem'}}>
            {isAccelerated ? BOLT + ' ACCELERATED COMPLETE' : 'AUCTION COMPLETED'}
          </h1>
          <p style={{color:'#888', fontSize:'1.5rem', fontFamily:"'Oswald', sans-serif", letterSpacing:'3px', marginTop:'10px'}}>
            ALL PLAYERS HAVE BEEN PROCESSED
          </p>
          <div className="ss-red-line" style={{margin:'20px auto'}}></div>
          <div style={{display:'flex', gap:'15px', marginTop:'10px'}}>
            {!isAccelerated && (
              <button
                className="ss-ctrl-btn ss-btn-accelerated"
                style={{fontSize:'1.1rem', padding:'12px 30px'}}
                onClick={openAcceleratedSetup}
              >
                {BOLT} ACCELERATED AUCTION
              </button>
            )}
            <button className="ss-ctrl-btn ss-btn-restart" style={{fontSize:'1.1rem', padding:'12px 30px'}} onClick={restartAuction}>{REFRESH} RESTART</button>
            <a href="/results" className="ss-ctrl-btn ss-btn-results" style={{fontSize:'1.1rem', padding:'12px 30px'}}>{CHART} RESULTS</a>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== ALL STYLES =====
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Bebas+Neue&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .ss-page {
    background: #000;
    background-image: url('/stadium-bg.png');
    background-size: cover;
    background-position: center center;
    background-attachment: fixed;
    background-repeat: no-repeat;
    color: white;
  }

  .ss-frame {
    width: 100%;
    height: 100vh;
    position: relative;
    overflow: hidden;
  }

  /* Hero */
  .ss-hero-frame {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .ss-hero-title {
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-size: clamp(5rem, 12vw, 10rem);
    font-weight: 700;
    letter-spacing: 6px;
    line-height: 0.95;
    color: white;
    text-shadow: 0 0 40px rgba(220,38,38,0.3);
    text-align: center;
  }
  .ss-hero-subtitle {
    font-family: 'Oswald', sans-serif;
    font-size: clamp(1.2rem, 2.5vw, 1.8rem);
    color: #888;
    letter-spacing: 10px;
    margin-top: 15px;
    font-weight: 300;
  }
  .ss-red-line {
    width: 250px;
    height: 3px;
    background: #dc2626;
    margin: 20px auto;
    box-shadow: 0 0 15px rgba(220,38,38,0.6);
  }
  .ss-scroll-hint {
    font-family: 'Oswald', sans-serif;
    font-size: 0.9rem;
    color: #555;
    letter-spacing: 4px;
    margin-top: 40px;
    animation: ssBounce 2s infinite;
  }

  /* Register */
  .ss-register-frame {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ss-register-card {
    width: 90%;
    max-width: 750px;
    background: rgba(10,10,10,0.85);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 30px 35px;
    backdrop-filter: blur(10px);
  }
  .ss-register-title {
    color: #ccc;
    letter-spacing: 3px;
    margin-bottom: 20px;
    font-family: 'Oswald', sans-serif;
    font-size: 1.3rem;
    text-align: center;
  }
  .ss-team-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 18px;
  }
  .ss-team-input {
    padding: 10px 14px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    color: white;
    font-size: 0.95rem;
    font-family: 'Oswald', sans-serif;
    letter-spacing: 1px;
    outline: none;
    transition: border-color 0.2s;
  }
  .ss-team-input:focus { border-color: #dc2626; }
  .ss-team-input::placeholder { color: #555; }
  .ss-start-btn {
    width: 100%;
    padding: 14px;
    background: #dc2626;
    border: none;
    border-radius: 8px;
    color: white;
    font-family: 'Oswald', sans-serif;
    font-size: 1.4rem;
    font-weight: 600;
    letter-spacing: 4px;
    cursor: pointer;
    transition: all 0.3s;
  }
  .ss-start-btn:hover {
    background: #b91c1c;
    transform: scale(1.02);
    box-shadow: 0 0 30px rgba(220,38,38,0.5);
  }
  .ss-start-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  /* Auction Frame */
  .ss-auction-frame {
    display: flex;
    flex-direction: column;
    animation: ssSlideIn 0.5s ease-out;
  }
  .ss-header {
    padding: 12px 30px 0;
    flex-shrink: 0;
  }
  .ss-header-left {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .ss-brand {
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-size: 1.3rem;
    letter-spacing: 3px;
    color: rgba(255,255,255,0.85);
  }
  .ss-role-banner {
    display: inline-block;
    background: #dc2626;
    color: white;
    font-family: 'Oswald', sans-serif;
    font-size: 1.1rem;
    font-weight: 600;
    letter-spacing: 3px;
    padding: 4px 25px;
    clip-path: polygon(0 0, 100% 0, 95% 100%, 0% 100%);
    width: fit-content;
  }

  .ss-main-content {
    flex: 1;
    display: grid;
    grid-template-columns: 1.1fr 1.3fr 1fr;
    align-items: end;
    padding: 0 30px;
    gap: 15px;
    min-height: 0;
    overflow: hidden;
  }
  .ss-player-name-area {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 15px;
    align-self: center;
  }
  .ss-player-name {
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-size: clamp(2rem, 3.8vw, 3.8rem);
    font-weight: 700;
    letter-spacing: 2px;
    line-height: 1.05;
    color: white;
    text-shadow: 2px 2px 15px rgba(0,0,0,0.8);
    word-break: keep-all;
    overflow-wrap: break-word;
    text-align: center;
    max-width: 100%;
  }
  .ss-player-photo-area {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    height: calc(100vh - 250px);
    align-self: end;
  }
  .ss-player-img {
    height: 100%;
    width: auto;
    max-width: 100%;
    object-fit: cover;
    object-position: top center;
    filter: drop-shadow(0 0 20px rgba(0,0,0,0.6));
    animation: ssPlayerPop 0.4s ease-out;
  }
  .ss-info-panel {
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-self: center;
  }
  .ss-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 18px;
    background: rgba(20,20,20,0.85);
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255,255,255,0.06);
  }
  .ss-info-row:first-child { border-radius: 6px 6px 0 0; }
  .ss-info-row:last-child { border-radius: 0 0 6px 6px; }
  .ss-info-highlight {
    background: rgba(30,30,30,0.95);
    border-left: 3px solid #dc2626;
  }
  .ss-info-label {
    font-family: 'Oswald', sans-serif;
    font-size: 0.85rem;
    color: #aaa;
    letter-spacing: 2px;
  }
  .ss-info-value {
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-size: 1.4rem;
    color: white;
    font-weight: 600;
    letter-spacing: 1px;
  }
  .ss-live {
    color: #facc15 !important;
    animation: ssPulse 1.5s infinite;
  }

  .ss-red-accent-line {
    width: 85%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #dc2626, transparent);
    margin: 0 auto;
    box-shadow: 0 0 8px rgba(220,38,38,0.4);
    flex-shrink: 0;
  }

  /* Controls */
  .ss-controls {
    flex-shrink: 0;
    padding: 10px 30px 14px;
    background: rgba(10,10,10,0.9);
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .ss-ctrl-buttons {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .ss-ctrl-inputs {
    display: flex;
    justify-content: center;
    gap: 10px;
  }
  .ss-ctrl-select, .ss-ctrl-input {
    padding: 8px 14px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px;
    color: white;
    font-family: 'Oswald', sans-serif;
    font-size: 0.95rem;
    letter-spacing: 1px;
    outline: none;
    width: 220px;
  }
  .ss-ctrl-select:focus, .ss-ctrl-input:focus { border-color: #dc2626; }
  .ss-ctrl-select option { background: #1a1a1a; color: white; }
  .ss-ctrl-btn {
    padding: 9px 20px;
    border: none;
    border-radius: 6px;
    font-family: 'Oswald', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
  }
  .ss-btn-sold { background: #16a34a; color: white; }
  .ss-btn-sold:hover { background: #15803d; transform: scale(1.05); }
  .ss-btn-unsold { background: #dc2626; color: white; }
  .ss-btn-unsold:hover { background: #b91c1c; transform: scale(1.05); }
  .ss-btn-undo { background: rgba(245,158,11,0.9); color: white; }
  .ss-btn-undo:hover { background: #d97706; transform: scale(1.05); }
  .ss-btn-restart { background: rgba(107,114,128,0.8); color: white; }
  .ss-btn-restart:hover { background: #4b5563; transform: scale(1.05); }
  .ss-btn-results {
    background: rgba(99,102,241,0.9);
    color: white;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  .ss-btn-results:hover { background: #4f46e5; transform: scale(1.05); }

  /* Accelerated Button */
  .ss-btn-accelerated {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: #000;
    font-weight: 700;
    letter-spacing: 2px;
    animation: ssAccGlow 2s infinite;
  }
  .ss-btn-accelerated:hover {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    transform: scale(1.08);
  }

  /* Accelerated Badge */
  .ss-acc-badge {
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: #000;
    font-family: 'Oswald', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 3px;
    padding: 6px 30px;
    border-radius: 20px;
    z-index: 20;
    animation: ssAccPulse 2s infinite;
    box-shadow: 0 0 20px rgba(245,158,11,0.5);
  }
  .ss-acc-badge-bolt { font-size: 1.1rem; }

  /* Accelerated Setup */
  .ss-acc-header {
    text-align: center;
    margin-bottom: 15px;
  }
  .ss-acc-bolt {
    font-size: 3rem;
    display: block;
    animation: ssAccBoltPulse 1.5s infinite;
  }
  .ss-acc-title {
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 700;
    letter-spacing: 4px;
    color: #f59e0b;
    text-shadow: 0 0 30px rgba(245,158,11,0.4);
  }
  .ss-acc-subtitle {
    font-family: 'Oswald', sans-serif;
    font-size: 1rem;
    color: #888;
    letter-spacing: 3px;
    margin-top: 5px;
  }
  .ss-acc-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 90%;
    max-width: 1200px;
    margin-bottom: 15px;
  }
  .ss-acc-count {
    font-family: 'Oswald', sans-serif;
    font-size: 1.2rem;
    color: #f59e0b;
    letter-spacing: 2px;
    font-weight: 600;
  }
  .ss-acc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
    width: 90%;
    max-width: 1200px;
    max-height: calc(100vh - 320px);
    overflow-y: auto;
    padding-right: 5px;
  }
  .ss-acc-grid::-webkit-scrollbar { width: 6px; }
  .ss-acc-grid::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }
  .ss-acc-grid::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.4); border-radius: 3px; }
  .ss-acc-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(20,20,20,0.85);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .ss-acc-card:hover {
    border-color: rgba(245,158,11,0.4);
    background: rgba(30,30,30,0.9);
  }
  .ss-acc-card-selected {
    border-color: #f59e0b !important;
    background: rgba(245,158,11,0.1) !important;
    box-shadow: 0 0 12px rgba(245,158,11,0.2);
  }
  .ss-acc-card-img {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(255,255,255,0.1);
    flex-shrink: 0;
  }
  .ss-acc-card-selected .ss-acc-card-img { border-color: #f59e0b; }
  .ss-acc-card-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }
  .ss-acc-card-name {
    font-family: 'Oswald', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 1px;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ss-acc-card-role {
    font-family: 'Oswald', sans-serif;
    font-size: 0.7rem;
    color: #888;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .ss-acc-card-price {
    font-family: 'Oswald', sans-serif;
    font-size: 0.75rem;
    color: #f59e0b;
    letter-spacing: 1px;
  }
  .ss-acc-card-check {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #000;
    font-weight: bold;
    font-size: 0.8rem;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .ss-acc-card-selected .ss-acc-card-check {
    background: #f59e0b;
    border-color: #f59e0b;
  }

  /* Sold Overlay */
  .ss-sold-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.92);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 999;
    animation: ssFlash 0.3s ease-out;
  }
  .ss-hammer {
    font-size: 6rem;
    animation: ssStrike 0.4s cubic-bezier(.36,-0.64,.34,1.76) forwards;
    transform-origin: bottom right;
  }
  .ss-sold-badge {
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-size: 5rem;
    font-weight: 700;
    letter-spacing: 10px;
    color: white;
    background: #dc2626;
    padding: 8px 50px;
    border: 4px solid white;
    border-radius: 10px;
    transform: rotate(-3deg);
    box-shadow: 0 0 60px rgba(220,38,38,0.7);
    animation: ssPopIn 0.4s ease-out 0.2s forwards;
    opacity: 0;
    margin-top: -15px;
  }
  .ss-sold-details {
    margin-top: 25px;
    text-align: center;
    animation: ssSlideUp 0.4s ease-out 0.6s forwards;
    opacity: 0;
  }
  .ss-sold-team {
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-size: 3rem;
    color: #facc15;
    letter-spacing: 4px;
  }
  .ss-sold-price {
    font-family: 'Oswald', sans-serif;
    font-size: 1.8rem;
    color: #ccc;
    letter-spacing: 3px;
  }

  /* Animations */
  @keyframes ssSlideIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ssPlayerPop {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes ssPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes ssBounce {
    0%, 100% { transform: translateY(0); opacity: 0.5; }
    50% { transform: translateY(10px); opacity: 1; }
  }
  @keyframes ssFlash {
    0% { background: rgba(255,255,255,0.7); }
    100% { background: rgba(0,0,0,0.92); }
  }
  @keyframes ssStrike {
    0% { transform: rotate(45deg); }
    100% { transform: rotate(-15deg); }
  }
  @keyframes ssPopIn {
    0% { transform: scale(0) rotate(-3deg); opacity: 0; }
    80% { transform: scale(1.1) rotate(-3deg); opacity: 1; }
    100% { transform: scale(1) rotate(-3deg); opacity: 1; }
  }
  @keyframes ssSlideUp {
    from { transform: translateY(25px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes ssAccGlow {
    0%, 100% { box-shadow: 0 0 10px rgba(245,158,11,0.3); }
    50% { box-shadow: 0 0 25px rgba(245,158,11,0.7); }
  }
  @keyframes ssAccPulse {
    0%, 100% { box-shadow: 0 0 15px rgba(245,158,11,0.4); }
    50% { box-shadow: 0 0 30px rgba(245,158,11,0.8); }
  }
  @keyframes ssAccBoltPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.15); opacity: 0.8; }
  }
  
  /* Logos */
  .ss-esummit-logo {
    position: absolute;
    top: 25px;
    right: 45px;
    height: 110px;
    width: auto;
    object-fit: contain;
    z-index: 10;
  }
  .ss-sponsor-logo {
    position: absolute;
    bottom: 155px;
    right: 45px;
    height: 130px;
    width: auto;
    object-fit: contain;
    z-index: 10;
  }
`;

export default Home;
