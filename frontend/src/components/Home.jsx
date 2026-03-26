import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="home-container">
      <h1>Welcome to IPL Auction System</h1>
      <p>Experience the thrill of real-time cricket player auctions</p>

      <div className="home-features">
        <div className="feature-card">
          <h3>Admin Dashboard</h3>
          <p>Control the auction, manage players, and track all team purchases in real-time</p>
          <Link to="/admin">
            <button style={{ marginTop: '1rem' }}>Go to Admin</button>
          </Link>
        </div>

        <div className="feature-card">
          <h3>User Dashboard</h3>
          <p>Create your team, participate in live auctions, and build your dream IPL squad</p>
          <Link to="/user">
            <button style={{ marginTop: '1rem' }}>Go to User</button>
          </Link>
        </div>

        <div className="feature-card">
          <h3>View Results</h3>
          <p>Check team rankings based on player points and see who built the best team</p>
          <Link to="/results">
            <button style={{ marginTop: '1rem' }}>View Results</button>
          </Link>
        </div>
      </div>

      <div style={{ marginTop: '3rem', padding: '2rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
        <h2 style={{ marginBottom: '1rem' }}>How It Works</h2>
        <div style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ marginBottom: '1rem' }}>1. Up to 8 teams can register with a budget of 100 crores each</p>
          <p style={{ marginBottom: '1rem' }}>2. Admin starts auctions for players one by one</p>
          <p style={{ marginBottom: '1rem' }}>3. Teams bid in real-time to acquire players</p>
          <p style={{ marginBottom: '1rem' }}>4. Each player has points that contribute to the team's total score</p>
          <p>5. The team with the highest total points wins!</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
