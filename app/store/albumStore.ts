import { create } from "zustand";

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

type AlbumStore = {
  albums: Album[];
  setAlbums: (albums: Album[]) => void;
  getAlbumsByIds: (ids: string[]) => Album[];
};

export const useAlbumStore = create<AlbumStore>((set, get) => ({
  albums: [],
  setAlbums: (albums) => set({ albums }),
  getAlbumsByIds: (ids) =>
    get().albums.filter((a) => ids.includes(a.id)),
}));
