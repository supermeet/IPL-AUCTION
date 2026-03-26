# IPL Auction System

A real-time IPL cricket player auction platform with separate admin and user dashboards. Perfect for college events with support for up to 8 teams.

## Features

### Admin Dashboard
- **Player Management**: Start auctions for individual players from a dataset of 40 IPL players
- **Live Bidding Control**: Monitor real-time bids from all teams
- **Player Tracking**: Track which players are sold to which teams and at what price
- **Real-time Updates**: All changes are instantly reflected across all connected clients

### User Dashboard
- **Team Creation**: Register your team (max 8 teams) with a starting budget of ₹100 Crores
- **Live Auction Participation**: Place bids in real-time during player auctions
- **Team Management**: View your squad, remaining budget, and total points
- **Real-time Bidding**: See live updates of current bids and competing teams

### Results & Ranking System
- **Points-based Ranking**: Each player has points that contribute to team's total score
- **Winner Determination**: Team with highest total points wins
- **Detailed Statistics**: View complete squad details for each team
- **Visual Rankings**: Gold, Silver, Bronze medals for top 3 teams

## Technology Stack

- **Frontend**: React 19 with Vite
- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.IO for live bidding updates
- **Routing**: React Router for navigation
- **Data Storage**: JSON file-based storage (perfect for small-scale events)

## Project Structure

```
IPL-AUCTION/
├── backend/
│   ├── server.js              # Express server with Socket.IO
│   ├── data/
│   │   └── players.json       # 40 IPL players with points
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home.jsx           # Landing page
│   │   │   ├── AdminDashboard.jsx # Admin control panel
│   │   │   ├── UserDashboard.jsx  # User bidding interface
│   │   │   └── Results.jsx        # Rankings and results
│   │   ├── App.jsx
│   │   └── App.css
│   └── package.json
└── package.json               # Root package for managing both
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Step 1: Clone the Repository
```bash
git clone https://github.com/supermeet/IPL-AUCTION.git
cd IPL-AUCTION
```

### Step 2: Install Dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Or use the convenience script from root
cd ..
npm run install-all
```

### Step 3: Start the Application

#### Option 1: Run both frontend and backend together (Recommended)
```bash
npm run dev
```

#### Option 2: Run separately
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## How to Use

### For Event Organizers (Admin)

1. **Open Admin Dashboard**: Navigate to http://localhost:5173/admin

2. **Start Auction**:
   - Browse the list of available players
   - Click "Start Auction" on any player to begin bidding
   - The player details will be displayed on all connected screens

3. **Monitor Bidding**:
   - Watch as teams place bids in real-time
   - Current highest bidder is displayed prominently

4. **Sell Player**:
   - Click "SOLD!" to assign the player to the highest bidder
   - Or click "Mark as UNSOLD" if no satisfactory bids

5. **Track Progress**:
   - View all registered teams and their remaining budgets
   - See complete list of sold players with prices

### For Participants (Users)

1. **Create Your Team**:
   - Navigate to http://localhost:5173/user
   - Enter team name and owner name
   - Starting budget: ₹100 Crores

2. **Participate in Auction**:
   - When admin starts an auction, player details appear
   - Enter your bid amount or use quick bid buttons (+1Cr, +5Cr, +10Cr)
   - Click "Place Bid" to submit

3. **Build Your Squad**:
   - Win players by being the highest bidder
   - Budget automatically deducts with each purchase
   - View your squad in "My Players" section

4. **Track Your Performance**:
   - Monitor your total points (sum of all player points)
   - Check remaining budget
   - View all competing teams

### View Results

1. Navigate to http://localhost:5173/results
2. See team rankings based on total points
3. View detailed squad information for each team
4. Winner is the team with highest total points

## Player Dataset

The system includes 40 IPL players with:
- **Name**: Player name
- **Role**: Batsman, Bowler, or All-rounder
- **Base Price**: Starting auction price (₹7Cr - ₹20Cr)
- **Points**: Performance points (650-950 points)
- **Stats**: Brief IPL statistics

Players include stars like Virat Kohli, Rohit Sharma, Jasprit Bumrah, and many more!

## Features Details

### Real-time Synchronization
- All auction updates are broadcast instantly via WebSocket
- Multiple users can bid simultaneously
- Admin actions are reflected immediately on all screens

### Budget Management
- Each team starts with ₹100 Crores
- Budget validates before accepting bids
- Real-time budget tracking

### Points System
- Each player has assigned points based on IPL performance
- Team points = Sum of all player points
- Winner determined by highest total points

### Maximum Teams Limit
- System enforces maximum of 8 teams
- Suitable for college-level events
- Registration closes after 8 teams

## API Endpoints

### Teams
- `GET /api/teams` - Get all registered teams
- `POST /api/teams` - Create a new team

### Players
- `GET /api/players` - Get all available players

### Auction
- `GET /api/auction-state` - Get current auction state
- `POST /api/auction/start` - Start auction for a player (Admin)
- `POST /api/auction/bid` - Place a bid (User)
- `POST /api/auction/sell` - Sell player to highest bidder (Admin)
- `POST /api/auction/unsold` - Mark player as unsold (Admin)

### Results
- `GET /api/results` - Get teams sorted by points

## Socket.IO Events

### Client → Server
- Connection established automatically

### Server → Client
- `auctionUpdate` - Auction state changes (new player, new bid, sold)
- `teamsUpdated` - Team information updated
- `playerSold` - Player successfully sold to team

## Deployment

### For College Events

1. **Deploy Backend**:
   - Use services like Heroku, Railway, or Render
   - Set PORT environment variable
   - Update CORS settings in server.js

2. **Deploy Frontend**:
   - Build: `cd frontend && npm run build`
   - Deploy to Netlify, Vercel, or GitHub Pages
   - Update API_URL in components to your backend URL

3. **Share Links**:
   - Share admin dashboard link with event organizer
   - Share user dashboard link with participants
   - Project on screen for all to see live auction

### Environment Variables

Create `.env` files if needed:

**Backend (.env)**:
```
PORT=3001
```

**Frontend (.env)**:
```
VITE_API_URL=http://localhost:3001
```

## Troubleshooting

### Port Already in Use
```bash
# Change port in backend/server.js
const PORT = process.env.PORT || 3002;
```

### Socket Connection Error
- Ensure backend is running
- Check CORS settings in server.js
- Verify API_URL in frontend components

### Teams Not Updating
- Check browser console for errors
- Ensure Socket.IO is connected
- Refresh the page

## Future Enhancements

Possible additions for larger scale:
- Database integration (MongoDB/PostgreSQL)
- User authentication
- Multiple simultaneous auctions
- Admin authentication
- Player image uploads
- Auction history and analytics
- Mobile responsive design improvements
- Timer for automatic player marking
- Chat feature for teams

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Author

Created for college IPL auction events

## Support

For issues or questions, please open an issue on GitHub.

---

**Enjoy your IPL Auction!** 🏏🎉
