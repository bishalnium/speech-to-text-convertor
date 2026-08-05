import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HistoryItem } from './history.service';

declare const SUPABASE_URL: string;
declare const SUPABASE_ANON_KEY: string;

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private client: SupabaseClient | null = null;
  
  isConfigured = signal<boolean>(false);
  connectionError = signal<string | null>(null);

  constructor() {
    this.initSupabase();
  }

  private initSupabase() {
    try {
      const url = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const key = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';

      const isValidUrl = url && url.startsWith('http') && !url.includes('your-supabase-project');
      const isValidKey = key && key.length > 20 && !key.includes('your-supabase-anon-key');

      if (isValidUrl && isValidKey) {
        this.client = createClient(url, key);
        this.isConfigured.set(true);
        console.log('✓ Supabase Cloud Database initialized successfully.');
      } else {
        this.isConfigured.set(false);
        console.log('ℹ Supabase credentials not provided or using placeholders. Defaulting to IndexedDB.');
      }
    } catch (err: any) {
      console.error('Supabase initialization error:', err);
      this.isConfigured.set(false);
      this.connectionError.set(err?.message || 'Failed to initialize Supabase');
    }
  }

  async fetchTranscriptions(): Promise<HistoryItem[]> {
    if (!this.client) return [];

    try {
      const { data, error } = await this.client
        .from('transcriptions')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        transcript: row.transcript,
        timestamp: Number(row.timestamp),
        duration: row.duration,
        sourceType: row.source_type,
        fileName: row.file_name,
        fileSize: row.file_size
      }));
    } catch (err: any) {
      console.error('Supabase fetch error:', err);
      return [];
    }
  }

  async insertTranscription(item: HistoryItem): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { error } = await this.client
        .from('transcriptions')
        .insert([{
          id: item.id,
          title: item.title,
          transcript: item.transcript,
          timestamp: item.timestamp,
          duration: item.duration || null,
          source_type: item.sourceType,
          file_name: item.fileName || null,
          file_size: item.fileSize || null
        }]);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Supabase insert error:', err);
      return false;
    }
  }

  async deleteTranscription(id: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { error } = await this.client
        .from('transcriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Supabase delete error:', err);
      return false;
    }
  }

  async clearAllTranscriptions(): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { error } = await this.client
        .from('transcriptions')
        .delete()
        .neq('id', '');

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Supabase clear error:', err);
      return false;
    }
  }
}
