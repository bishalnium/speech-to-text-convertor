import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface HistoryItem {
  id: string;
  title: string;
  transcript: string;
  timestamp: number;
  duration?: number;
  sourceType: 'recording' | 'upload';
  fileName?: string;
  fileSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private dbName = 'VoiceScribeDB';
  private storeName = 'transcriptions';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  supabaseService = inject(SupabaseService);

  // Signal for reactive UI updates
  historyItems = signal<HistoryItem[]>([]);
  isLoading = signal<boolean>(true);

  constructor() {
    this.initDB().then(() => {
      this.loadHistory();
    }).catch(err => {
      console.error('Failed to initialize IndexedDB:', err);
      this.isLoading.set(false);
    });
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async loadHistory(): Promise<HistoryItem[]> {
    this.isLoading.set(true);

    // 1. Try loading from Supabase Cloud DB if configured
    if (this.supabaseService.isConfigured()) {
      const cloudItems = await this.supabaseService.fetchTranscriptions();
      if (cloudItems && cloudItems.length > 0) {
        this.historyItems.set(cloudItems);
        this.isLoading.set(false);
        // Async update local IndexedDB cache
        this.syncIndexedDBCache(cloudItems);
        return cloudItems;
      }
    }

    // 2. Fall back to local IndexedDB
    try {
      if (!this.db) {
        await this.initDB();
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev');

        const items: HistoryItem[] = [];
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            items.push(cursor.value);
            cursor.continue();
          } else {
            this.historyItems.set(items);
            this.isLoading.set(false);
            resolve(items);
          }
        };

        request.onerror = () => {
          this.isLoading.set(false);
          reject(request.error);
        };
      });
    } catch (error) {
      this.isLoading.set(false);
      console.error('Error loading history:', error);
      return [];
    }
  }

  async addHistoryItem(itemData: {
    transcript: string;
    sourceType: 'recording' | 'upload';
    duration?: number;
    fileName?: string;
    fileSize?: number;
  }): Promise<HistoryItem> {
    if (!this.db) {
      await this.initDB();
    }

    let title = itemData.fileName || '';
    if (!title) {
      const cleanText = itemData.transcript.trim();
      title = cleanText.length > 35 ? cleanText.substring(0, 35) + '...' : cleanText || 'Voice Recording';
    }

    const newItem: HistoryItem = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title,
      transcript: itemData.transcript,
      timestamp: Date.now(),
      duration: itemData.duration,
      sourceType: itemData.sourceType,
      fileName: itemData.fileName,
      fileSize: itemData.fileSize
    };

    // Save to Supabase Cloud DB if configured
    if (this.supabaseService.isConfigured()) {
      await this.supabaseService.insertTranscription(newItem);
    }

    // Save to IndexedDB
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(newItem);

      request.onsuccess = () => {
        this.historyItems.update(prev => [newItem, ...prev]);
        resolve(newItem);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async deleteHistoryItem(id: string): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    if (this.supabaseService.isConfigured()) {
      await this.supabaseService.deleteTranscription(id);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.historyItems.update(prev => prev.filter(item => item.id !== id));
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearAllHistory(): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    if (this.supabaseService.isConfigured()) {
      await this.supabaseService.clearAllTranscriptions();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        this.historyItems.set([]);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async syncIndexedDBCache(items: HistoryItem[]) {
    if (!this.db) return;
    try {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      items.forEach(item => store.put(item));
    } catch (e) {
      console.warn('Failed to sync IndexedDB cache:', e);
    }
  }
}
