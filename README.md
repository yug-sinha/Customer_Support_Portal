# Customer Support Agentic App

Purpose: demo a customer-support agent platform where business users create/configure agents, chat with them, and review escalations/conversation history. Agents resolve queries when possible and escalate to humans when confidence or capability is insufficient. Over time, human resolutions reduce escalations by feeding back into the agent’s knowledge (design described below). Tech stack: FastAPI + Google Sheets (storage) + Gemini (LLM) + React/Vite/Tailwind.

## What’s here
- **Backend:** FastAPI (`backend/`) with endpoints for agents, chat, analytics, conversations, escalations. Sheets DB wrapper handles CRUD in Google Sheets.
- **Frontend:** React 19 + Vite + Tailwind (`frontend/`). Pages for dashboard, agents CRUD, chat interface, escalations review, conversation history.
- **LLM:** Gemini wrapper (`backend/app/core/llm.py`) for intent classification and responses with optional chat history.
- **Dummy tools:** snake_case tool names; actions are mocked (check_order_status, initiate_refund, send_email, create_support_ticket, apply_discount, get_customer_profile, update_order_address, notify_vendor). No real side effects.
- **Escalations & history:** escalated threads carry `status=escalated`; Escalations page shows full chat-style transcript with date filters.

## Design (aligned to prompt)
**Business user portal**
1. Configure agent (name/persona/system instructions).
2. Define persona/system instructions.
3. Knowledge base: not implemented; note shown to author careful system instructions.
4. Tool access: pick snake_case tools (all mocked).
5. Escalation rules: escalation threshold per agent; low confidence or explicit escalate triggers human handoff.
6. Metrics dashboard: total/resolved/escalated, agent cards.

**Core agent flow**
1. Classify intent: Informational, Transactional, Escalation.
2. Transactional: if tool enabled, return mock action; else say “can’t perform, escalate?” Informational: LLM with chat history. Explicit escalation: escalate immediately.
3. Confidence gate: if below threshold, escalate with summary.
4. Escalation queue: store transcript; status set to `escalated`.

**Reducing human escalations (design)**
1. Human resolution becomes ground truth.
2. Ground truth feeds knowledge base/vector DB (not implemented in this demo).
3. Future similar queries succeed via retrieval, lowering escalations.

## Prerequisites
- Python 3.11+ and Node 18+
- Google service account creds with Sheets/Drive access (JSON) via file or env.
- Gemini API key (optional for LLM).

## Backend setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill values below
```
`backend/.env`:
```
GEMINI_API_KEY=...
GOOGLE_SHEETS_CREDENTIALS_FILE=/abs/path/creds.json
# or GOOGLE_SHEETS_CREDENTIALS_JSON='{"type":"service_account", ...}'
GOOGLE_SPREADSHEET_ID=...   # target sheet ID
```
Run: `uvicorn app.main:app --reload --port 8000`

## Frontend setup
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## Key behaviors / notes
- Agents CRUD + delete (custom modal).
- Chat uses conversation IDs; escalations end the thread.
- Tools are snake_case; all mocked; unavailable tool => offer escalation.
- Escalations page: date filter, newest first, full chat-style transcript.
- Conversation history: date + status filters; resolve action; timestamps formatted.
- Storage: Google Sheets tables for agents/conversations/messages/escalations/metrics.
- CORS open for local dev.

## Primary endpoints
- `POST /chat/`
- `GET/POST/PUT/DELETE /agents/`
- `GET /analytics/` and `/analytics/overview`
- `GET /conversations/`, `/conversations/agent/{id}`, `/conversations/{id}/messages`, `/conversations/{id}/resolve`
- `GET /analytics/escalations`

## Limitations
- No real tool execution; tools are mocked. No capability checks/quotas or multi-step orchestration.
- No knowledge base/RAG ingestion or human-feedback loop; escalated resolutions are not fed back.
- Escalation UX is read-only; no assignment, status transitions, notes, notifications, or SLA tracking.
- Sheets latency/consistency; no auth/roles; permissive CORS.

## Quick dev checklist
- Backend on `:8000` with valid `.env`.
- Frontend dev server on `:5173`.
- Service account has Sheets/Drive access and target sheet exists or is creatable.
