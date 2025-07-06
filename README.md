# 🎼 Conductr - Classical Music Playlist Generator

A Next.js web application that helps conductors and classical musicians quickly generate playlists of multiple recordings of classical pieces using AI-powered music parsing and the Spotify Web API.

## Features

- **AI-Powered Music Parsing**: Natural language understanding of classical music queries
- **Spotify Integration**: Real-time search and playlist creation
- **Intelligent Filtering**: Automatically identifies classical music recordings
- **Dynamic Results**: Work-type specific columns (concerto, symphony, solo, chamber)
- **Professional Design**: Clean, musical interface with Tailwind CSS

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- Spotify Developer account and app

## Setup Instructions

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd conductr
npm install
```

### 2. Set up Spotify Developer App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create App"
3. Fill in:
   - **App Name**: Conductr
   - **App Description**: Classical Music Playlist Generator
   - **Redirect URI**: `http://127.0.0.1:3000/api/auth/callback/spotify`
   - **Website**: `http://127.0.0.1:3000`
4. Save your Client ID and Client Secret

### 3. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-proj-...`)

### 4. Configure Environment Variables

I see you've already updated `.env.local.example` with your keys. Now create the actual environment file:

```bash
cp .env.local.example .env.local
```

Your `.env.local` should look like this:

```env
# === Spotify OAuth Configuration ===
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=

# === AI Key Configuration ===
OPENAI_API_KEY=

# === AI Service Selection ===
AI_SERVICE=openai
```

### 5. Update Spotify App Settings

⚠️ **Important**: In your Spotify app dashboard, make sure the redirect URI is set to:
`http://127.0.0.1:3000/callback`

### 6. Start the Development Server

```bash
npm run dev
```

The app will be available at: http://127.0.0.1:3000

## Testing Guide

### Basic Flow Test

1. **Open the app** at http://127.0.0.1:3000
2. **Initial greeting**: You should see "What piece would you like to compile recordings of today?"

### Test AI Music Parsing

Try these example queries:

#### Simple Queries:
- "Beethoven 5th symphony"
- "Mozart piano concerto 21"
- "Bach Brandenburg concerto 3"

#### Complex Queries:
- "Mahler Symphony No. 1 in D major third movement"
- "Chopin piano sonata 2 in B flat minor"
- "Vivaldi Four Seasons Spring"

#### Expected Behavior:
- AI should parse and standardize the input
- App should show confirmation: "Just to confirm — do you mean [Composer] – [Work]?"
- Click "Yes, that's correct" to proceed

### Test Spotify Search

After confirming a piece:
1. **Search results**: Should show real Spotify recordings
2. **Table columns**: Should adapt based on work type:
   - **Concerto**: Soloist, Conductor, Orchestra, Duration, Year
   - **Symphony**: Conductor, Orchestra, Duration, Year
   - **Solo**: Performer, Duration, Year
3. **Select recordings**: Check boxes next to desired recordings
4. **Create playlist button**: Should appear when recordings are selected

### Test Playlist Creation

1. **Click "Create Playlist"**: Should prompt for Spotify login
2. **Spotify OAuth**: Click "Connect with Spotify"
3. **Authorization**: Should redirect to Spotify, then back to app
4. **Playlist creation**: Should create actual playlist in your Spotify account

### Troubleshooting

#### Common Issues:

**"Spotify client configuration missing"**
- Check your `.env.local` file has the correct Spotify keys
- Restart the dev server after changing environment variables

**"Failed to parse musical input"**
- Check your OpenAI API key is correct
- Verify you have credits in your OpenAI account

**"Spotify search failed"**
- Verify Spotify Client ID and Secret are correct
- Check if Spotify API is accessible from your network

**OAuth redirect issues**
- Ensure redirect URI in Spotify app matches exactly: `http://127.0.0.1:3000/callback`
- Use `127.0.0.1` instead of `localhost` for consistency

#### Debug Steps:

1. **Check browser console** for error messages
2. **Verify environment variables** are loaded:
   ```bash
   # In your terminal
   echo $OPENAI_API_KEY
   echo $NEXT_PUBLIC_SPOTIFY_CLIENT_ID
   ```
3. **Test API endpoints** directly:
   - Visit http://127.0.0.1:3000/api/parse-music (should return method not allowed)
   - Check network tab for failed requests

### Example Test Scenarios

#### Scenario 1: Symphony Search
1. Input: "Beethoven Symphony No. 9"
2. Expected: AI parses to "Beethoven – Symphony No. 9 in D minor"
3. Confirm: Click "Yes, that's correct"
4. Results: Multiple recordings with conductor/orchestra columns
5. Select: Choose 2-3 recordings
6. Create: Make playlist named "Beethoven - Symphony No. 9"

#### Scenario 2: Concerto Search
1. Input: "Mozart piano concerto 23"
2. Expected: AI parses to "Mozart – Piano Concerto No. 23 in A major"
3. Results: Table shows soloist, conductor, orchestra columns
4. Create: Playlist with selected recordings

#### Scenario 3: Ambiguous Input
1. Input: "Mahler 1st symphony"
2. Expected: AI asks for clarification about movements
3. Results: Either all movements or specific movement based on response

## Architecture

### API Routes
- `/api/parse-music` - AI-powered music parsing
- `/api/spotify-search` - Server-side Spotify search
- `/api/spotify-token` - OAuth token exchange

### Key Components
- `ChatInterface` - Main chat UI
- `RecordingsTable` - Dynamic results table
- `ConfirmationDialog` - Musical confirmation
- `SpotifyLogin` - OAuth authentication
- `PlaylistCreator` - Playlist creation interface

### Services
- `aiService.ts` - OpenAI integration
- `spotifyApi.ts` - Spotify Web API wrapper
- `musicParser.ts` - Music parsing utilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
