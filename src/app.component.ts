import { Component, computed, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioRecorderService } from './services/audio-recorder.service';
import { GroqService } from './services/groq.service';
import { HistoryService, HistoryItem } from './services/history.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      
      <!-- Mobile Backdrop -->
      @if (sidebarOpen()) {
        <div 
          (click)="sidebarOpen.set(false)"
          class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-30 md:hidden transition-opacity">
        </div>
      }

      <!-- Left Sidebar Panel (ChatGPT Style) -->
      <aside 
        [class]="sidebarOpen() ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-80'"
        class="fixed md:static inset-y-0 left-0 z-40 w-80 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out shrink-0">
        
        <!-- Sidebar Header -->
        <div class="p-4 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <button 
            (click)="startNewTranscription()"
            class="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            <span>New Transcription</span>
          </button>
          
          <button 
            (click)="sidebarOpen.set(false)"
            class="md:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="p-3 border-b border-slate-800/50">
          <div class="relative">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text"
              [value]="searchQuery()"
              (input)="updateSearch($event)"
              placeholder="Search history..."
              class="w-full bg-slate-900 text-sm text-slate-200 placeholder-slate-500 pl-9 pr-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <!-- History List -->
        <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          @if (historyService.isLoading()) {
            <div class="flex items-center justify-center py-10 text-slate-500 text-sm">
              <svg class="animate-spin h-5 w-5 mr-2 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading history...
            </div>
          } @else if (filteredHistory().length === 0) {
            <div class="text-center py-10 text-slate-500 text-sm">
              @if (searchQuery()) {
                No matching transcriptions found.
              } @else {
                No transcriptions saved yet.<br>Record mic or upload a file to start!
              }
            </div>
          } @else {
            @for (item of filteredHistory(); track item.id) {
              <div 
                (click)="selectHistoryItem(item)"
                [class]="selectedHistoryId() === item.id ? 'bg-slate-800/90 text-white border-indigo-500/50 shadow-md' : 'hover:bg-slate-900/80 text-slate-300 border-transparent'"
                class="group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer">
                
                <div class="flex items-center gap-3 overflow-hidden pr-6">
                  <!-- Icon indicator -->
                  <div class="shrink-0 text-slate-400 group-hover:text-indigo-400 transition-colors">
                    @if (item.sourceType === 'upload') {
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    }
                  </div>

                  <div class="overflow-hidden">
                    <p class="text-sm font-medium truncate">{{ item.title }}</p>
                    <p class="text-xs text-slate-500 mt-0.5">{{ formatDate(item.timestamp) }}</p>
                  </div>
                </div>

                <!-- Delete item button -->
                <button 
                  (click)="deleteHistoryItem(item.id, $event)"
                  title="Delete transcription"
                  class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-all absolute right-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            }
          }
        </div>

        <!-- Sidebar Footer -->
        @if (historyService.historyItems().length > 0) {
          <div class="p-3 border-t border-slate-800/80 bg-slate-950">
            <button 
              (click)="clearAllHistory()"
              class="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear History</span>
            </button>
          </div>
        }
      </aside>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto">
        
        <!-- Header Navbar -->
        <header class="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button 
              (click)="sidebarOpen.set(!sidebarOpen())"
              class="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div class="flex items-center gap-2">
              <span class="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </span>
              <h1 class="text-xl font-bold tracking-wide text-white">Voice Scribe</h1>
            </div>
          </div>

          <div class="flex items-center gap-2">
            @if (historyService.supabaseService.isConfigured()) {
              <span class="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium">
                <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Supabase DB
              </span>
            } @else {
              <span class="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 flex items-center gap-1.5" title="Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.local to enable Supabase Cloud Database">
                <span class="h-2 w-2 rounded-full bg-indigo-400"></span>
                IndexedDB Local
              </span>
            }

            <span class="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 hidden sm:inline-block">
              Whisper Large v3
            </span>
          </div>
        </header>

        <!-- Main Body -->
        <main class="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
          
          <!-- Mode Tabs Selector -->
          <div class="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-center">
            <button 
              (click)="activeTab.set('record')"
              [class]="activeTab() === 'record' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'"
              class="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>Record Voice</span>
            </button>

            <button 
              (click)="activeTab.set('upload')"
              [class]="activeTab() === 'upload' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'"
              class="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload File</span>
            </button>
          </div>

          <!-- TAB 1: RECORD VOICE -->
          @if (activeTab() === 'record') {
            <div class="bg-slate-950/80 rounded-3xl p-8 border border-slate-800 shadow-2xl flex flex-col items-center justify-center text-center">
              
              <!-- Status indicator -->
              <div class="mb-6 h-8 flex items-center justify-center">
                @if (isProcessing()) {
                  <span class="text-indigo-400 font-medium animate-pulse flex items-center gap-2 bg-indigo-950/50 px-4 py-1.5 rounded-full border border-indigo-800/50">
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Transcribing audio...
                  </span>
                } @else if (audioRecorder.isRecording()) {
                  <span class="text-red-400 font-medium animate-pulse bg-red-950/50 px-4 py-1.5 rounded-full border border-red-800/50">
                    ● Recording in progress...
                  </span>
                } @else {
                  <span class="text-slate-400 text-sm">Tap button below to start recording</span>
                }
              </div>

              <!-- Main Record Button -->
              <div class="relative">
                @if (audioRecorder.isRecording()) {
                  <div class="absolute inset-0 rounded-full bg-red-500/30 animate-ping"></div>
                }

                <button 
                  (click)="toggleRecording()"
                  [disabled]="isProcessing()"
                  [class]="audioRecorder.isRecording() ? 'bg-red-600 hover:bg-red-500 shadow-red-600/50' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/40'"
                  class="relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/50 disabled:opacity-50 transform hover:scale-105 active:scale-95">
                  @if (audioRecorder.isRecording()) {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  }
                </button>
              </div>

              <!-- Timer Display -->
              <div class="mt-6 font-mono text-3xl text-slate-200 font-semibold tracking-wider">
                {{ formattedTime() }}
              </div>
            </div>
          }

          <!-- TAB 2: UPLOAD AUDIO FILE -->
          @if (activeTab() === 'upload') {
            <div class="bg-slate-950/80 rounded-3xl p-8 border border-slate-800 shadow-2xl flex flex-col items-center justify-center">
              
              <!-- Dropzone -->
              <div 
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onFileDrop($event)"
                (click)="fileInput.click()"
                [class]="isDragging() ? 'border-indigo-500 bg-indigo-950/20' : 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/50'"
                class="w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all">
                
                <input 
                  #fileInput 
                  type="file" 
                  accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac,.aac"
                  (change)="onFileSelected($event)" 
                  class="hidden" 
                />

                @if (!selectedFile()) {
                  <div class="p-4 bg-slate-900 rounded-full text-indigo-400 mb-4 border border-slate-800">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 class="text-base font-semibold text-slate-200 mb-1">Click or drag & drop audio file</h3>
                  <p class="text-xs text-slate-500">Supports MP3, WAV, M4A, WEBM, OGG, FLAC, AAC</p>
                } @else {
                  <div class="flex items-center gap-4 w-full max-w-md bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <div class="p-3 bg-indigo-600/20 text-indigo-400 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                    <div class="flex-1 overflow-hidden">
                      <p class="text-sm font-medium text-slate-200 truncate">{{ selectedFile()?.name }}</p>
                      <p class="text-xs text-slate-500">{{ formatFileSize(selectedFile()?.size || 0) }}</p>
                    </div>
                    <button 
                      (click)="clearSelectedFile($event)"
                      class="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                }
              </div>

              <!-- Upload & Process Button -->
              @if (selectedFile()) {
                <button 
                  (click)="transcribeSelectedFile()"
                  [disabled]="isProcessing()"
                  class="mt-6 w-full max-w-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                  @if (isProcessing()) {
                    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Transcribing File...</span>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Process & Transcribe Audio</span>
                  }
                </button>
              }
            </div>
          }

          <!-- TRANSCRIPTION RESULT DISPLAY -->
          <div class="bg-slate-950/80 rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-col gap-4">
            
            <div class="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h2 class="text-base font-semibold text-slate-200">
                  {{ activeItemTitle() || 'Transcription Output' }}
                </h2>
                @if (activeItemDate()) {
                  <p class="text-xs text-slate-500 mt-0.5">{{ activeItemDate() }}</p>
                }
              </div>

              @if (transcript()) {
                <div class="flex items-center gap-2">
                  <button 
                    (click)="copyToClipboard()" 
                    class="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 px-3 py-2 rounded-xl transition-all">
                    @if (copied()) {
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      <span class="text-green-400">Copied!</span>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Text</span>
                    }
                  </button>
                </div>
              }
            </div>

            <!-- Error message -->
            @if (error()) {
              <div class="p-4 bg-red-950/40 border border-red-800/50 rounded-2xl text-red-400 text-sm flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <p>{{ error() }}</p>
              </div>
            }

            <!-- Main Transcript Textbox -->
            <div class="min-h-[220px] max-h-[400px] overflow-y-auto bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60 text-slate-200 leading-relaxed text-sm whitespace-pre-wrap font-sans custom-scrollbar">
              @if (isProcessing()) {
                <div class="h-full flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
                  <svg class="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p class="animate-pulse">AI is converting your audio to text...</p>
                </div>
              } @else if (transcript()) {
                <p>{{ transcript() }}</p>
              } @else {
                <div class="h-full flex flex-col items-center justify-center py-12 text-slate-600 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <p>Your transcription results will appear here after recording or uploading an audio file.</p>
                </div>
              }
            </div>

            <!-- Meta metrics -->
            @if (transcript()) {
              <div class="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
                <span>{{ wordCount() }} words | {{ characterCount() }} characters</span>
                <span>Saved to history</span>
              </div>
            }
          </div>

        </main>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  `]
})
export class AppComponent {
  audioRecorder = inject(AudioRecorderService);
  groqService = inject(GroqService);
  historyService = inject(HistoryService);

  // UI State Signals
  sidebarOpen = signal(false);
  activeTab = signal<'record' | 'upload'>('record');
  searchQuery = signal('');
  selectedHistoryId = signal<string | null>(null);

  // Transcription State
  transcript = signal('');
  activeItemTitle = signal('');
  activeItemDate = signal('');
  isProcessing = signal(false);
  error = signal<string | null>(null);
  copied = signal(false);

  // File Upload State
  selectedFile = signal<File | null>(null);
  isDragging = signal(false);

  // Computed Timer formatting
  formattedTime = computed(() => {
    const totalSeconds = this.audioRecorder.recordingTime();
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  // Filtered History list based on search query
  filteredHistory = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const items = this.historyService.historyItems();
    if (!query) return items;
    return items.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.transcript.toLowerCase().includes(query)
    );
  });

  // Computed metrics
  wordCount = computed(() => {
    const text = this.transcript().trim();
    return text ? text.split(/\s+/).length : 0;
  });

  characterCount = computed(() => {
    return this.transcript().length;
  });

  // History Actions
  startNewTranscription() {
    this.selectedHistoryId.set(null);
    this.transcript.set('');
    this.activeItemTitle.set('');
    this.activeItemDate.set('');
    this.error.set(null);
    this.selectedFile.set(null);
    this.sidebarOpen.set(false);
  }

  selectHistoryItem(item: HistoryItem) {
    this.selectedHistoryId.set(item.id);
    this.transcript.set(item.transcript);
    this.activeItemTitle.set(item.title);
    this.activeItemDate.set(this.formatDate(item.timestamp));
    this.error.set(null);
    this.sidebarOpen.set(false);
  }

  async deleteHistoryItem(id: string, event: Event) {
    event.stopPropagation();
    await this.historyService.deleteHistoryItem(id);
    if (this.selectedHistoryId() === id) {
      this.startNewTranscription();
    }
  }

  async clearAllHistory() {
    if (confirm('Are you sure you want to clear all transcription history?')) {
      await this.historyService.clearAllHistory();
      this.startNewTranscription();
    }
  }

  updateSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  // Audio Recording Actions
  async toggleRecording() {
    this.error.set(null);
    this.copied.set(false);

    if (this.audioRecorder.isRecording()) {
      await this.stopAndTranscribe();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording() {
    try {
      this.selectedHistoryId.set(null);
      this.transcript.set('');
      this.activeItemTitle.set('');
      this.activeItemDate.set('');
      await this.audioRecorder.startRecording();
    } catch (err) {
      this.error.set('Could not access microphone. Please ensure permissions are granted.');
      console.error(err);
    }
  }

  private async stopAndTranscribe() {
    try {
      this.isProcessing.set(true);
      const recordingDuration = this.audioRecorder.recordingTime();
      const audioData = await this.audioRecorder.stopRecording();
      
      const result = await this.groqService.transcribeAudio(audioData.blob);
      
      this.transcript.set(result);
      this.activeItemTitle.set('Voice Recording');
      this.activeItemDate.set(this.formatDate(Date.now()));

      // Save to IndexedDB History
      const savedItem = await this.historyService.addHistoryItem({
        transcript: result,
        sourceType: 'recording',
        duration: recordingDuration
      });
      this.selectedHistoryId.set(savedItem.id);

    } catch (err: any) {
      this.error.set(err?.message || 'Failed to transcribe audio. Please try again.');
      console.error(err);
    } finally {
      this.isProcessing.set(false);
    }
  }

  // File Upload Actions
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|webm|ogg|flac|aac)$/i.test(file.name)) {
        this.selectedFile.set(file);
      } else {
        this.error.set('Invalid file type. Please upload an audio file.');
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  clearSelectedFile(event: Event) {
    event.stopPropagation();
    this.selectedFile.set(null);
  }

  async transcribeSelectedFile() {
    const file = this.selectedFile();
    if (!file) return;

    try {
      this.isProcessing.set(true);
      this.error.set(null);
      this.transcript.set('');
      this.activeItemTitle.set('');
      this.activeItemDate.set('');

      const result = await this.groqService.transcribeAudio(file, file.name);
      
      this.transcript.set(result);
      this.activeItemTitle.set(file.name);
      this.activeItemDate.set(this.formatDate(Date.now()));

      // Save to IndexedDB History
      const savedItem = await this.historyService.addHistoryItem({
        transcript: result,
        sourceType: 'upload',
        fileName: file.name,
        fileSize: file.size
      });
      this.selectedHistoryId.set(savedItem.id);

    } catch (err: any) {
      this.error.set(err?.message || 'Failed to transcribe audio file. Please try again.');
      console.error(err);
    } finally {
      this.isProcessing.set(false);
    }
  }

  // Utilities
  copyToClipboard() {
    const text = this.transcript();
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return 'Today at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}