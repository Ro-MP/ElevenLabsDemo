import { Component, computed, inject, signal } from '@angular/core';
import { ConversationService } from './core/conversation.service';
import { ElevenService } from './core/eleven.service';
import { ConversationDetails } from './core/models';
import { SettingsStore } from './core/settings.store';

const SENTIMENT_LEVELS = ['very negative', 'negative', 'neutral', 'positive', 'very positive'];
const HEADLINE_FIELDS = ['sentiment_rating', 'sentiment_summary'];

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly settings = inject(SettingsStore);
  protected readonly convo = inject(ConversationService);
  private readonly eleven = inject(ElevenService);

  protected readonly busy = signal(false);
  protected readonly setupError = signal('');
  protected readonly analyzing = signal(false);
  protected readonly analysisError = signal('');
  protected readonly result = signal<ConversationDetails | null>(null);

  protected readonly inCall = computed(() => this.convo.status() === 'connected' || this.convo.status() === 'connecting');
  protected readonly ready = computed(() => !!this.settings.apiKey() && !!this.settings.agentId());

  private readonly collected = computed(() => this.result()?.analysis?.data_collection_results ?? {});

  /** One of the 5 rating levels, or 'unknown' if the model answered something else. */
  protected readonly sentiment = computed(() => {
    const raw = String(this.collected()['sentiment_rating']?.value ?? '').trim().toLowerCase();
    return SENTIMENT_LEVELS.includes(raw) ? raw : 'unknown';
  });
  /** Headline summary, e.g. "User reports slowness and the final invoice has errors." */
  protected readonly summary = computed(() => {
    const value = this.collected()['sentiment_summary']?.value;
    return typeof value === 'string' && value.trim() ? value.trim() : (this.result()?.analysis?.transcript_summary ?? '');
  });
  protected readonly dataItems = computed(() =>
    Object.values(this.collected())
      .filter((d) => !HEADLINE_FIELDS.includes(d.data_collection_id))
      .map((d) => ({
        id: d.data_collection_id,
        value: d.value == null || d.value === '' ? '—' : String(d.value),
        rationale: d.rationale,
      })),
  );
  protected readonly criteria = computed(() => Object.values(this.result()?.analysis?.evaluation_criteria_results ?? {}));

  protected onKey(event: Event): void {
    this.settings.setApiKey((event.target as HTMLInputElement).value);
  }

  protected onAgent(event: Event): void {
    this.settings.setAgentId((event.target as HTMLInputElement).value);
  }

  protected async createAgent(): Promise<void> {
    this.busy.set(true);
    this.setupError.set('');
    try {
      this.settings.setAgentId(await this.eleven.createDemoAgent());
    } catch (e) {
      this.setupError.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async startCall(): Promise<void> {
    this.result.set(null);
    this.analysisError.set('');
    await this.convo.start();
  }

  protected async endCall(): Promise<void> {
    const id = this.convo.conversationId();
    await this.convo.end();
    if (!id) return;
    this.analyzing.set(true);
    try {
      this.result.set(await this.eleven.waitForAnalysis(id));
    } catch (e) {
      this.analysisError.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.analyzing.set(false);
    }
  }
}
