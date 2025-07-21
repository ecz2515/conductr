# Conductr

**Classical music playlist builder for Spotify**

Conductr is a web application that helps classical music enthusiasts create curated playlists. It intelligently extracts only the relevant movements from albums, even when they contain multiple symphonies or works.

## The Problem

Spotify’s search and catalog system is fundamentally flawed for classical music discovery, especially for conductors and serious listeners. Unlike pop music, classical pieces have complex structures: a single work is split into multiple movements, and crucial metadata—composer, conductor, soloists, and ensemble—is inconsistently embedded across albums. Spotify’s algorithm treats “Mahler 1” as a loose keyword, so searching for “Mahler 1” returns not only Symphony No. 1, but also Symphonies 2, 3, 4, and every track or album that mentions a “1” or “Mahler” in any context. On top of this, recordings are scattered across compilations, partial albums, and playlist fodder, often with missing or scrambled movement order and little distinction between complete performances and random excerpts. For conductors preparing for score study, this means sifting through dozens of incomplete, duplicate, or misattributed results just to assemble a set of full, authentic performances for comparison. Conductr tackles this mess head-on by leveraging the Spotify API and specialized parsing to identify, de-duplicate, and group complete performances by piece, conductor, and ensemble—even when Spotify’s own metadata is ambiguous. The result: with a single search, you get a curated playlist of real, complete recordings of the exact work you need, dramatically reducing the time and frustration of building a score study playlist by hand.

## The Solution

Conductr solves this by automatically identifying and extracting only the relevant movements from any album. Whether you're studying a specific symphony movement or comparing different interpretations of the same piece, Conductr creates focused playlists in seconds instead of hours.

## Features

- **Smart Search**: Search by composer, work, movement, or nickname (e.g., "Mahler 2", "Shosty 7 mvt 3")
- **Track Extraction**: Automatically identifies and extracts only the relevant movements from compilation albums
- **Classical Music Focus**: Built specifically for classical music with expert-level understanding
- **Modern UI**: Clean, responsive design with smooth animations
- **Spotify Integration**: Seamless OAuth flow and playlist creation
- **Fast & Efficient**: Optimized for quick playlist generation

## How It Works

1. **Search**: Enter any classical piece (e.g., "Beethoven 5", "Tchaikovsky Nutcracker")
2. **Select**: Choose from curated album recommendations
3. **Reorder**: Arrange your selected recordings in preferred order
4. **Customize**: Optionally edit playlist name and description
5. **Create**: Extracts only relevant tracks and creates your Spotify playlist

## Quick Start

### Prerequisites

- Node.js 18+ 
- Spotify Developer Account
- OpenAI API Key

### 1. Clone the Repository

```bash
git clone <repository-url>
cd conductr
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Spotify OAuth Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Public Spotify Client ID (for frontend)
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/playlist/create

# OpenAI API Key (for AI track extraction)
OPENAI_API_KEY=your_openai_api_key
```

### 4. Get API Keys

#### Spotify API Setup
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://127.0.0.1:3000/playlist/create` to Redirect URIs
4. Copy Client ID and Client Secret

#### OpenAI API Setup
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Development

### Project Structure

```
conductr/
├── app/
│   ├── api/                    # API routes
│   │   ├── canonicalize/       # Search query processing
│   │   ├── extract-tracks/     # Track extraction
│   │   ├── search/             # Spotify album search
│   │   └── spotify-token/      # OAuth token exchange
│   ├── playlist/
│   │   └── create/             # Playlist creation page
│   ├── reorder/                # Album reordering page
│   ├── store/                  # State management
│   └── page.tsx                # Main search page
├── public/                     # Static assets
└── package.json
```

### Key Technologies

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **OpenAI API** - Track extraction
- **Spotify Web API** - Music data and playlist creation

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Usage Examples

### Search Queries
- `"Beethoven 5"` → Symphony No. 5 in C minor
- `"Mahler 2"` → Symphony No. 2 "Resurrection"
- `"Shosty 7 mvt 3"` → Shostakovich Symphony No. 7, Movement 3
- `"Tchaikovsky Nutcracker"` → The Nutcracker Suite
- `"Mozart 40"` → Symphony No. 40 in G minor

### Track Extraction
When you select albums like "Beethoven: Symphonies Nos. 1-9", Conductr will:
- Identify only the movements for your requested symphony
- Extract tracks 9-12 for Beethoven Symphony No. 2
- Skip other symphonies in the compilation
- Create a focused playlist with just the relevant movements

## Configuration

### Customizing Track Extraction
Edit `app/api/extract-tracks/route.ts` to modify the extraction logic for different strategies.

### Styling
The app uses Tailwind CSS. Customize colors and styling in `app/globals.css`.

### Environment Variables
All configuration is handled through environment variables in `.env.local`.

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms
The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Spotify Web API for music data
- OpenAI for track extraction
- Next.js team for the framework
- Classical music community for inspiration

## Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/your-repo/conductr/issues) page
2. Create a new issue with detailed information
3. Include your search query and any error messages

---

**Built for classical musicians**

*Not affiliated with Spotify*
