'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Music } from 'lucide-react';
import { Message, ParsedPiece, Recording } from '@/types';
import { parseMusicalInput, formatPieceForConfirmation } from '@/lib/musicParser';
import { searchSpotifyRecordings } from '@/lib/spotifyApi';
import RecordingsTable from './RecordingsTable';
import ConfirmationDialog from './ConfirmationDialog';
import SpotifyLogin from './SpotifyLogin';
import PlaylistCreator from './PlaylistCreator';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'What piece would you like to compile recordings of today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedPiece, setParsedPiece] = useState<ParsedPiece | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedRecordings, setSelectedRecordings] = useState<string[]>([]);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(null);
  const [showSpotifyLogin, setShowSpotifyLogin] = useState(false);
  const [showPlaylistCreator, setShowPlaylistCreator] = useState(false);
  const [conversationContext, setConversationContext] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check for stored Spotify access token
    console.log('🎵 [ChatInterface] Checking for stored Spotify token...');
    const token = localStorage.getItem('spotify_access_token');
    if (token) {
      console.log('✅ [ChatInterface] Found stored Spotify token');
      setSpotifyAccessToken(token);
    } else {
      console.log('ℹ️ [ChatInterface] No stored Spotify token found');
    }
  }, []);

  const addMessage = (type: 'user' | 'assistant', content: string) => {
    console.log(`💬 [ChatInterface] Adding ${type} message:`, content);
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    console.log('🚀 [ChatInterface] Starting message processing for:', userMessage);
    addMessage('user', userMessage);
    setInputValue('');
    setIsLoading(true);

    try {
      console.log('🤖 [ChatInterface] Calling AI parsing service...');
      console.log('🧠 [ChatInterface] Using conversation context:', conversationContext);
      // Parse the musical input
      const parsed = await parseMusicalInput(userMessage, conversationContext);
      console.log('📊 [ChatInterface] AI parsing result:', parsed);
      setParsedPiece(parsed);

      if (parsed.isComplete) {
        console.log('✅ [ChatInterface] Parsing successful, showing confirmation');
        const formattedPiece = formatPieceForConfirmation(parsed);
        // Update conversation context for future messages
        setConversationContext(`Currently discussing: ${parsed.composer} - ${parsed.work}`);
        console.log('🧠 [ChatInterface] Updated conversation context');
        addMessage('assistant', `Just to confirm — do you mean ${formattedPiece}?`);
        setShowConfirmation(true);
      } else {
        console.log('⚠️ [ChatInterface] Parsing incomplete, asking for clarification');
        addMessage('assistant', 'I\'m not quite sure I understand. Could you please specify the composer and work? For example, "Beethoven Symphony No. 5" or "Mozart Piano Concerto No. 21".');
      }
    } catch (error) {
      console.error('❌ [ChatInterface] Error in message processing:', error);
      addMessage('assistant', 'I\'m having trouble understanding that. Could you please try again with the composer and work name?');
    } finally {
      setIsLoading(false);
      console.log('🏁 [ChatInterface] Message processing complete');
    }
  };

  const handleConfirmPiece = async (confirmed: boolean, allMovements?: boolean) => {
    console.log('🎯 [ChatInterface] User confirmation:', confirmed ? 'YES' : 'NO', 'allMovements:', allMovements);
    setShowConfirmation(false);
    
    if (!confirmed || !parsedPiece) {
      console.log('❌ [ChatInterface] Piece not confirmed or missing, asking for new search');
      addMessage('assistant', 'No problem! Please tell me what piece you\'d like to search for.');
      return;
    }

    // Handle movement specification for symphonies
    if (parsedPiece.work.toLowerCase().includes('symphony') && !parsedPiece.movement && allMovements === false) {
      console.log('🎼 [ChatInterface] User wants to specify a movement');
      setConversationContext(`Waiting for movement specification for: ${parsedPiece.composer} - ${parsedPiece.work}`);
      addMessage('assistant', 'Please specify which movement you\'d like. For example, "3" or "third movement" or "III".');
      return;
    }

    // Update the parsed piece if they want all movements
    if (allMovements === true) {
      console.log('🎼 [ChatInterface] User wants all movements');
      setParsedPiece({ ...parsedPiece, movement: 'All movements' });
    }

    console.log('🔍 [ChatInterface] Starting Spotify search for:', parsedPiece);
    setIsLoading(true);
    const movementText = allMovements === true ? ' (all movements)' : '';
    addMessage('assistant', `Perfect! Let me search for recordings of that piece${movementText}...`);

    try {
      console.log('🎵 [ChatInterface] Calling Spotify search API...');
      const foundRecordings = await searchSpotifyRecordings(parsedPiece);
      console.log('📀 [ChatInterface] Spotify search results:', foundRecordings.length, 'recordings found');
      console.log('📀 [ChatInterface] Sample recordings:', foundRecordings.slice(0, 3));
      setRecordings(foundRecordings);
      
      if (foundRecordings.length > 0) {
        addMessage('assistant', `I found ${foundRecordings.length} recordings! Please select which ones you'd like to include in your playlist:`);
      } else {
        console.log('😞 [ChatInterface] No recordings found');
        addMessage('assistant', 'I couldn\'t find any recordings of that piece. Would you like to try a different search?');
      }
    } catch (error) {
      console.error('❌ [ChatInterface] Error in Spotify search:', error);
      addMessage('assistant', 'I\'m having trouble searching for recordings right now. Please try again.');
    } finally {
      setIsLoading(false);
      console.log('🏁 [ChatInterface] Spotify search complete');
    }
  };

  const handleRecordingSelection = (selectedIds: string[]) => {
    console.log('☑️ [ChatInterface] Recording selection updated:', selectedIds.length, 'recordings selected');
    setSelectedRecordings(selectedIds);
  };

  const handleCreatePlaylist = () => {
    console.log('🎶 [ChatInterface] Create playlist requested, selected recordings:', selectedRecordings.length);
    
    if (selectedRecordings.length === 0) {
      console.log('⚠️ [ChatInterface] No recordings selected');
      addMessage('assistant', 'Please select at least one recording to create a playlist.');
      return;
    }

    if (!spotifyAccessToken) {
      console.log('🔐 [ChatInterface] No Spotify token, showing login');
      addMessage('assistant', `Great! You've selected ${selectedRecordings.length} recordings. To create your playlist, I'll need you to log in with Spotify.`);
      setShowSpotifyLogin(true);
    } else {
      console.log('✅ [ChatInterface] Spotify token available, showing playlist creator');
      addMessage('assistant', `Perfect! You've selected ${selectedRecordings.length} recordings. Let's create your playlist.`);
      setShowPlaylistCreator(true);
    }
  };

  const handleSpotifyLogin = (accessToken: string) => {
    console.log('🔑 [ChatInterface] Spotify login successful, token received');
    setSpotifyAccessToken(accessToken);
    setShowSpotifyLogin(false);
    setShowPlaylistCreator(true);
  };

  const handlePlaylistCreated = (playlistId: string) => {
    console.log('🎉 [ChatInterface] Playlist created successfully with ID:', playlistId);
    setShowPlaylistCreator(false);
    addMessage('assistant', `Wonderful! Your playlist has been created successfully. You can now find it in your Spotify library. Would you like to search for recordings of another piece?`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white shadow-lg">
      {/* Header */}
      <div className="bg-conductr-dark text-white p-4 flex items-center gap-3">
        <Music className="w-8 h-8 text-conductr-gold" />
        <h1 className="text-xl font-bold">Conductr</h1>
        <span className="text-sm text-gray-300">Classical Music Playlist Generator</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.type === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="text-sm font-medium mb-1">
              {message.type === 'user' ? 'You' : 'Conductr'}
            </div>
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="chat-message assistant-message">
            <div className="text-sm font-medium mb-1">Conductr</div>
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-conductr-gold"></div>
              <span>Thinking...</span>
            </div>
          </div>
        )}

        {recordings.length > 0 && (
          <div className="space-y-4">
            <RecordingsTable
              recordings={recordings}
              workType={parsedPiece ? parsedPiece.work.toLowerCase().includes('concerto') ? 'concerto' : 'symphony' : 'other'}
              onSelectionChange={handleRecordingSelection}
            />
            {selectedRecordings.length > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={handleCreatePlaylist}
                  className="btn-primary"
                >
                  Create Playlist ({selectedRecordings.length} tracks)
                </button>
              </div>
            )}
          </div>
        )}

        {showSpotifyLogin && (
          <SpotifyLogin onLogin={handleSpotifyLogin} />
        )}

        {showPlaylistCreator && parsedPiece && (
          <PlaylistCreator
            selectedRecordings={recordings.filter(r => selectedRecordings.includes(r.id))}
            parsedPiece={parsedPiece}
            accessToken={spotifyAccessToken!}
            onPlaylistCreated={handlePlaylistCreated}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tell me what piece you'd like to find recordings of..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-conductr-gold"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && parsedPiece && (
        <ConfirmationDialog
          piece={parsedPiece}
          onConfirm={handleConfirmPiece}
        />
      )}
    </div>
  );
}