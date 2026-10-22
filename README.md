# ElevenLabsDemo

Demo rápida (Angular 21, **sin backend**) para conocer ElevenLabs: hablas por micrófono con un **ElevenLabs Agent** que hace de intermediario de quejas, sugerencias y comentarios, y al colgar obtienes la transcripción, una **calificación de sentimiento** y un resumen corto (p. ej. `Very negative – User reports slowness and the final invoice has errors.`).

## Cómo funciona

1. **Setup** – pegas tu API key y pulsas *Create demo agent* (`POST /v1/convai/agents/create`). El agente "Alex" (feedback de "Northwind Cloud", una empresa SaaS ficticia, en inglés) se crea con:
   - **Data Collection**: `sentiment_rating` (very negative / negative / neutral / positive / very positive), `sentiment_summary` (una frase), `feedback_type` (complaint / suggestion / comment / mixed), `main_topic`, `dominant_emotion`.
   - **Success Evaluation**: `user_satisfied`, `user_expressed_frustration`.
   - Si cambias la definición del agente en `eleven.service.ts`, vuelve a pulsar *Create demo agent* (los agentes ya creados conservan su configuración).
2. **Talk** – token WebRTC (`GET /v1/convai/conversation/token`) + `@elevenlabs/client` (`Conversation.startSession`). La transcripción llega en vivo por `onMessage`.
3. **Sentiment** – al terminar, se consulta `GET /v1/convai/conversations/{id}` hasta que `status = done` y `analysis` existe (el análisis es asíncrono).

El análisis es **por conversación**, no por turno. Scribe (speech-to-text) no ofrece sentimiento por sí solo; para sentimiento por turno haría falta un LLM externo.

## Correr

```bash
cd ElevenLabsDemo
npm install
npm start   # http://localhost:4200
```

Necesitas una API key de https://elevenlabs.io (la demo consume créditos de tu cuenta) y permitir el micrófono.
Prueba con una queja ("the dashboard is painfully slow and my last invoice had errors") y con un elogio ("I love how fast the new release is").

## Seguridad

La API key se usa directamente desde el navegador (guardada solo en `sessionStorage`). Es aceptable para una demo local; **no la despliegues públicamente**. En producción, un backend debe acuñar los tokens de conversación y hacer las llamadas REST.

## Estructura

- `src/app/core/eleven.service.ts` – REST (crear agente, token, polling del análisis) y definición del agente demo.
- `src/app/core/conversation.service.ts` – wrapper de `@elevenlabs/client` expuesto como signals.
- `src/app/core/settings.store.ts` – API key (sessionStorage) y agent id (localStorage).
- `src/app/app.{ts,html,css}` – UI de 3 pasos.
