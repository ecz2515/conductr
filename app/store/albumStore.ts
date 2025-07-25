import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Album = {
  id: string;
  image: string;
  conductor?: string;
  orchestra?: string;
  release_date?: string;
  uri?: string;
  composer?: string;
  work_title?: string;
  movementTitles?: string[];
};

type SearchContext = {
  originalQuery: string;
  canonical: {
    composer: string;
    work: string;
    movement?: string;
    movementNumber?: string;
    catalog?: string;
  };
};

type AlbumStore = {
  albums: Album[];
  searchContext: SearchContext | null;
  setAlbums: (albums: Album[]) => void;
  setSearchContext: (context: SearchContext) => void;
  getAlbumsByIds: (ids: string[]) => Album[];
  getSearchContext: () => SearchContext | null;
};

export const useAlbumStore = create<AlbumStore>()(
  persist(
    (set, get) => ({
      albums: [],
      searchContext: null,
      setAlbums: (albums) => {
        console.log('setAlbums called with:', albums);
        set({ albums });
      },
      setSearchContext: (context) => {
        console.log('setSearchContext called with:', context);
        set({ searchContext: context });
      },
        getAlbumsByIds: (ids) => {
    const state = get();
    console.log('getAlbumsByIds called with ids:', ids);
    console.log('Current state albums length:', state.albums.length);
    
    // If albums array is empty, try to load from localStorage manually
    if (state.albums.length === 0 && typeof window !== 'undefined') {
      console.log('Albums array is empty, manually checking localStorage...');
      const stored = localStorage.getItem('conductr-albums');
      console.log('Stored albums from localStorage:', stored);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          console.log('Parsed localStorage data:', parsed);
          if (parsed.state && parsed.state.albums) {
            console.log('Found albums in localStorage state:', parsed.state.albums);
            set({ albums: parsed.state.albums });
            const filtered = parsed.state.albums.filter((a: Album) => ids.includes(a.id));
            console.log('Filtered albums from localStorage:', filtered);
            return filtered;
          }
        } catch (e) {
          console.error('Failed to parse stored albums:', e);
        }
      } else {
        console.log('No albums found in localStorage');
      }
    }
    
    const filtered = state.albums.filter((a) => ids.includes(a.id));
    console.log('Returning filtered albums from state:', filtered);
    return filtered;
  },
      getSearchContext: () => {
        const state = get();
        console.log('getSearchContext called, current state:', state);
        console.log('searchContext from state:', state.searchContext);
        return state.searchContext;
      },
    }),
    {
      name: 'conductr-albums',
    }
  )
);
