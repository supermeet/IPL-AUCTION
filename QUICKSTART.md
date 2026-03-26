# Quick Start Guide - IPL Auction System

## Setup (5 minutes)

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Version 16 or higher required

2. **Install Dependencies**
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
cd ..
```

3. **Start the Application**
```bash
npm run dev
```

This will start both frontend (http://localhost:5173) and backend (http://localhost:3001)

## Quick Usage Flow

### Step 1: Open Admin Dashboard
- Open http://localhost:5173/admin in one browser window
- This is for the event organizer/auctioneer
- **Tip**: Project this on a big screen for all participants to see

### Step 2: Create Teams (Users)
- Open http://localhost:5173/user in multiple browser windows/devices
- Each participant creates their team:
  - Enter team name (e.g., "Mumbai Warriors")
  - Enter owner name (your name)
  - Click "Create Team"
- Maximum 8 teams can register
- Each team gets ₹100 Crores budget

### Step 3: Start Auction (Admin)
- In admin dashboard, browse the 40 available players
- Click "Start Auction" on any player
- Player details appear on all screens in real-time

### Step 4: Place Bids (Users)
- On user dashboards, the current auction appears
- Enter bid amount or use quick buttons:
  - +1 Cr: Add 1 crore to current bid
  - +5 Cr: Add 5 crores to current bid
  - +10 Cr: Add 10 crores to current bid
- Click "Place Bid" to submit
- Your bid appears instantly on all screens

### Step 5: Sell Player (Admin)
- Watch bids come in real-time
- When satisfied with highest bid, click "SOLD!"
- Or click "Mark as UNSOLD" if no good bids
- Player is automatically added to winning team
- Budget is deducted automatically

### Step 6: Repeat for All Players
- Continue auctioning players one by one
- Each team builds their squad
- Monitor budgets and points in real-time

### Step 7: View Results
- Go to http://localhost:5173/results
- See team rankings by total points
- Winner is team with highest points!
- View detailed squad for each team

## Tips for Smooth Auction

1. **Screen Setup**:
   - Project admin dashboard on main screen
   - Participants use their own devices for user dashboard

2. **Internet**:
   - All devices must be on same network
   - Or deploy to cloud for remote participants

3. **Budget Management**:
   - Each team has ₹100 Crores total
   - Plan spending across all players
   - Can't bid more than remaining budget

4. **Points Strategy**:
   - Higher points = better team
   - Balance between expensive stars and budget players
   - All-rounders offer good value (batting + bowling)

5. **Auction Speed**:
   - Admin controls pace
   - Can pause between players
   - No time limits (fully manual control)

## Common Questions

**Q: How many players should each team get?**
A: No limit! Teams can buy as many as budget allows. Typically 8-15 players per team.

**Q: What if someone accidentally bids wrong amount?**
A: Admin can mark as unsold and restart auction for that player.

**Q: Can we modify player data?**
A: Yes! Edit `backend/data/players.json` to add/remove/modify players.

**Q: How to reset everything?**
A: Delete files in `backend/data/` except `players.json`, then restart server.

**Q: Can we use this remotely?**
A: Yes! Deploy to cloud services (see README for deployment guide).

## Keyboard Shortcuts

None currently - all actions via buttons for ease of use.

## Troubleshooting

**Problem**: Can't connect to server
**Solution**: Make sure backend is running (npm run server)

**Problem**: Bids not showing up
**Solution**: Check browser console for errors, refresh page

**Problem**: "Maximum teams reached"
**Solution**: Can't create more than 8 teams, delete `backend/data/teams.json` to reset

---

**Need Help?** Check the full README.md for detailed information.

**Ready to Start?** Run `npm run dev` and enjoy your IPL Auction! 🏏
