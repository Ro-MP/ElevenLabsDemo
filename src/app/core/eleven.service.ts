import { Injectable, inject } from '@angular/core';
import { ConversationDetails } from './models';
import { SettingsStore } from './settings.store';

const API = 'https://api.elevenlabs.io/v1';

const AGENT_PROMPT = `You are Alex, a feedback assistant for "Northwind Cloud", a software company that sells a SaaS platform (billing, dashboards and an API).
Your job is to be an intermediary: listen to users who want to share a complaint, a suggestion or a comment, and record it for the product team.
Ask one or two short follow-up questions (what happened, what impact it had, when it happened). Acknowledge the user's emotion before asking.
Do not solve tickets or promise dates or fixes: only listen, thank the user and confirm their feedback will be passed to the team.
Keep every reply under two sentences.`;

/** Body for POST /convai/agents/create: a feedback agent whose post-call analysis rates sentiment and summarizes it. */
const DEMO_AGENT = {
  name: 'Feedback sentiment demo agent',
  conversation_config: {
    agent: {
      language: 'en',
      first_message:
        "Hi, I'm Alex from Northwind Cloud. Do you have a complaint, a suggestion, or a comment you'd like to share?",
      prompt: { prompt: AGENT_PROMPT },
    },
  },
  platform_settings: {
    evaluation: {
      criteria: [
        {
          id: 'user_satisfied',
          name: 'user_satisfied',
          type: 'prompt',
          conversation_goal_prompt:
            'The user ended the conversation satisfied, or expressed a positive opinion about the product.',
        },
        {
          id: 'user_expressed_frustration',
          name: 'user_expressed_frustration',
          type: 'prompt',
          conversation_goal_prompt:
            'The user expressed frustration, anger or annoyance at any point in the conversation.',
        },
      ],
    },
    data_collection: {
      sentiment_rating: {
        type: 'string',
        description:
          "The user's overall sentiment about the product across the conversation. Answer with exactly one of: very negative, negative, neutral, positive, very positive.",
      },
      sentiment_summary: {
        type: 'string',
        description:
          'One sentence of at most 20 words, in third person, starting with "User", that states the main reason for the sentiment. Examples: "User highlights the system\'s efficiency." and "User reports slowness and the final invoice has errors."',
      },
      feedback_type: {
        type: 'string',
        description: 'The kind of feedback. Answer with exactly one of: complaint, suggestion, comment, mixed.',
      },
      main_topic: {
        type: 'string',
        description: 'The main topic of the feedback, in a few words (e.g. performance, billing, usability).',
      },
      dominant_emotion: {
        type: 'string',
        description: "The user's dominant emotion, e.g. happy, calm, confused, annoyed, angry, anxious.",
      },
    },
  },
};

@Injectable({ providedIn: 'root' })
export class ElevenService {
  private readonly settings = inject(SettingsStore);

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const key = this.settings.apiKey();
    if (!key) throw new Error('Enter your ElevenLabs API key first.');
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', ...init.headers },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  async createDemoAgent(): Promise<string> {
    const { agent_id } = await this.request<{ agent_id: string }>('/convai/agents/create', {
      method: 'POST',
      body: JSON.stringify(DEMO_AGENT),
    });
    return agent_id;
  }

  async getConversationToken(agentId: string): Promise<string> {
    const { token } = await this.request<{ token: string }>(
      `/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
    );
    return token;
  }

  /** Polls until the post-call analysis is ready (status "done" and analysis present). */
  async waitForAnalysis(
    conversationId: string,
    { intervalMs = 2000, timeoutMs = 90_000 } = {},
  ): Promise<ConversationDetails> {
    const deadline = Date.now() + timeoutMs;
    while (true) {
      const details = await this.request<ConversationDetails>(
        `/convai/conversations/${encodeURIComponent(conversationId)}`,
      );
      if (details.status === 'failed') throw new Error('ElevenLabs could not process this conversation.');
      if (details.status === 'done' && details.analysis) return details;
      if (Date.now() > deadline) throw new Error('Timed out waiting for the analysis. Try again in a moment.');
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}
