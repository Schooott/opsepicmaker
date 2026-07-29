# Ops Epic Maker

A single-file wizard for drafting well-structured Jira epics for ops initiatives.

Paste or dictate a rough idea, let AI pre-fill the epic template fields, review and adjust them step by step, and copy the result (Jira wiki markup) into your ticket.

## Usage

Open `index.html` in Chrome or Edge. No installation, no build step.

- AI pre-fill requires an Anthropic API key (stored locally in the browser only).
- Voice dictation and audio recording use the browser's built-in speech recognition and microphone APIs.

## Privacy

Everything runs locally in the browser. Input text is only sent to the Anthropic API when you explicitly trigger the AI pre-fill.
