import { Injectable, inject, signal } from '@angular/core';
import { Conversation, type Mode, type Status } from '@elevenlabs/client';
import { ElevenService } from './eleven.service';
import { TranscriptLine } from './models';
import { SettingsStore } from './settings.store';

type Session = Awaited<ReturnType<typeof Conversation.startSession>>;

/** Wraps the @elevenlabs/client voice session and exposes it as signals. */
@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly eleven = inject(ElevenService);
  private readonly settings = inject(SettingsStore);
  private session: Session | null = null;

  readonly status = signal<Status>('disconnected');
  readonly mode = signal<Mode>('listening');
  readonly muted = signal(false);
  readonly lines = signal<TranscriptLine[]>([]);
  readonly conversationId = signal('');
  readonly error = signal('');

  async start(): Promise<void> {
    this.error.set('');
    this.lines.set([]);
    this.conversationId.set('');
    this.muted.set(false);
    try {
      // Ask for the mic first so a denial gives a clear message before connecting.
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      mic.getTracks().forEach((t) => t.stop());

      const conversationToken = await this.eleven.getConversationToken(this.settings.agentId());
      this.session = await Conversation.startSession({
        conversationToken,
        connectionType: 'webrtc',
        onStatusChange: ({ status }) => this.status.set(status),
        onModeChange: ({ mode }) => this.mode.set(mode),
        onMessage: ({ role, message }) => this.lines.update((l) => [...l, { role, message }]),
        onError: (message) => this.error.set(String(message)),
      });
      this.conversationId.set(this.session.getId());
    } catch (e) {
      this.session = null;
      this.status.set('disconnected');
      this.error.set(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Microphone access was denied. Allow it in the browser and try again.'
          : e instanceof Error
            ? e.message
            : String(e),
      );
    }
  }

  async end(): Promise<void> {
    await this.session?.endSession();
    this.session = null;
    this.status.set('disconnected');
  }

  toggleMute(): void {
    const next = !this.muted();
    this.session?.setMicMuted(next);
    this.muted.set(next);
  }
}
