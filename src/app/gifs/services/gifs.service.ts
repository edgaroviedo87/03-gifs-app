import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';

import { environment } from '@env/environment';
import { GifMapper } from '../mapper/gif.mapper';

import type { GiphyResponse } from '../interfaces/giphy.interface';
import type { Gif } from '../interfaces/gif.interface';

const loadFromLocalStorage = (): Record<string, Gif[]> => {
    const history = localStorage.getItem('searchHistory');
    return history ? JSON.parse(history) : {};
}

@Injectable({
  providedIn: 'root'
})
export class GifsService {
  private http = inject(HttpClient);

  trendingGifs = signal<Gif[]>([]);
  trendingGifsLoading = signal(true);

  searchHistory = signal<Record<string, Gif[]>>(loadFromLocalStorage());
  searchHistoryKeys = computed( () => Object.keys(this.searchHistory()) );

  constructor() {
    this.loadTrendingGifs();
  }

  saveGifsToLocalStorage = effect( () => {
    localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory()));
  });

  loadTrendingGifs() {
    return this.http.get<GiphyResponse>(`${ environment.giphyUrl }/gifs/trending`, {
      params: {
        api_key: environment.giphyApiKey,
        limit: '20',
      }
    }).subscribe( (resp) => {
      const gifs = GifMapper.mapGiphyItemsToGifs(resp.data);
      this.trendingGifs.set(gifs);
      this.trendingGifsLoading.set(false);
    });
  }

  searchGifs(query: string): Observable<Gif[]> {

    return this.http.get<GiphyResponse>(`${ environment.giphyUrl }/gifs/search`, {
      params: {
        api_key: environment.giphyApiKey,
        limit: '20',
        q: query
      }
    }).pipe(
      map( ({data}) => data ),
      map( (items) => GifMapper.mapGiphyItemsToGifs(items) ),

      // TODO: Historial
      tap( items => {
        this.searchHistory.update( (history) => ({
            ...history,
            [query.toLowerCase()]: items
        }));
      }),
    );
  }

  getHistoryGifs( query : string ): Gif[] {
    return this.searchHistory()[query] ?? [];
  }

}
