import YTMusic from "ytmusic-api";
import { SearchDropdownList, SearchResponse } from "../types";

const ytmusic = new YTMusic();
const initPromise = ytmusic.initialize();

export const search = async <T extends SearchDropdownList["value"]>(
  search: string,
  filterBy: T,
): Promise<SearchResponse<T>> => {
  await initPromise;
  try {
    let response;

    switch (filterBy) {
      case "artists":
        response = (await ytmusic.searchArtists(search)) as SearchResponse<T>;
        break;
      case "songs":
        response = (await ytmusic.searchSongs(search)) as SearchResponse<T>;
        break;
      case "albums":
        response = (await ytmusic.searchAlbums(search)) as SearchResponse<T>;
        break;
      case "videos":
        response = (await ytmusic.searchVideos(search)) as SearchResponse<T>;
        break;
      case "playlists":
        response = (await ytmusic.searchPlaylists(search)) as SearchResponse<T>;
        break;
      case "all":
      default:
        response = (await ytmusic.search(search)) as SearchResponse<T>;
        break;
    }

    return response;
  } catch (error) {
    throw new SearchError(`Failed to search for "${search}" with filter "${filterBy}"`, error);
  }
};

export class SearchError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "SearchError";
  }
}
