"use client";

import { useMemo, useState } from "react";
import { runPython } from "@/src/lib/pyRunner";
import type {
  ChatMessage,
  KnowledgeState,
  NoviceAgentResponse,
} from "@/src/lib/types";

const BUBBLE_SORT_START_MESSAGE =
  "Let's start a lesson: please learn to implement bubble sort in Python slowly. " +
  "First, explain your understanding in beginner terms and propose a tiny first draft.";

const DEFAULT_TASK =
  "You are a novice learner being taught to write bubble sort in Python. Learn slowly, ask questions, and improve incrementally.";

const INITIAL_CODE = `# Python draft from the novice learner
# Edit this script or teach the learner to improve it.
`;

export default function Home() {
  const [task, setTask] = useState(DEFAULT_TASK);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [codeDraft, setCodeDraft] = useState(INITIAL_CODE);
  const [knowledgeState, setKnowledgeState] = useState<KnowledgeState | null>(
    null,
  );
  const [chatLoading, setChatLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [lessonStarted, setLessonStarted] = useState(false);

  const canSend = useMemo(
    () => input.trim().length > 0 && !chatLoading,
    [input, chatLoading],
  );

  async function callChatApi(userContent: string) {
    const userMessage: ChatMessage = { role: "user", content: userContent };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setChatLoading(true);
    setChatError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          messages: updatedMessages,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        const errorMessage =
          typeof json?.error === "string" ? json.error : "Chat request failed.";
        const details =
          typeof json?.details === "string" ? `\nDetails: ${json.details}` : "";
        const hint = typeof json?.hint === "string" ? `\nHint: ${json.hint}` : "";
        const raw = typeof json?.raw === "string" ? `\nRaw: ${json.raw}` : "";
        throw new Error(`${errorMessage}${details}${hint}${raw}`);
      }

      const agent = json as NoviceAgentResponse;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: agent.assistantMessage },
      ]);
      setCodeDraft(agent.codeDraft);
      setKnowledgeState(agent.knowledgeState);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setChatError(message);
    } finally {
      setChatLoading(false);
    }
  }

  async function onSend() {
    const content = input.trim();
    if (!content || chatLoading) return;
    setInput("");
    await callChatApi(content);
  }

  async function onStartLesson() {
    if (chatLoading) return;
    setLessonStarted(true);
    setMessages([]);
    setKnowledgeState(null);
    setChatError(null);
    setInput(BUBBLE_SORT_START_MESSAGE);
  }

  async function onRunCode() {
    setRunLoading(true);
    setStdout("");
    setStderr("");
    try {
      const result = await runPython(codeDraft);
      setStdout(result.stdout);
      setStderr(result.stderr);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStderr(`Run failed unexpectedly.\n${message}`);
    } finally {
      setRunLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-4 text-zinc-900 md:p-6">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="flex min-h-[80vh] flex-col rounded-xl border border-zinc-300 bg-white">
          <div className="border-b border-zinc-200 p-4">
            <h1 className="text-xl font-semibold">Teachable Novice Agent</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Left: teacher chat. Right: evolving Python draft and runtime.
            </p>
            <label className="mt-3 block text-sm font-medium" htmlFor="task">
              Task
            </label>
            <textarea
              id="task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="mt-1 h-24 w-full rounded-md border border-zinc-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
            <button
              type="button"
              onClick={onStartLesson}
              disabled={chatLoading}
              className="mt-3 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Start bubble sort lesson
            </button>
            {lessonStarted ? (
              <p className="mt-2 text-xs text-zinc-600">
                Starter prompt loaded. Edit it if you want, then click Send.
              </p>
            ) : null}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No messages yet. Start the lesson or send your first teaching
                message.
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "ml-auto bg-blue-600 text-white"
                      : "bg-zinc-200 text-zinc-900"
                  }`}
                >
                  <p className="mb-1 text-xs opacity-75">
                    {message.role === "user" ? "Teacher" : "Novice Learner"}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-zinc-200 p-4">
            <details className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm">
              <summary className="cursor-pointer font-medium">
                Debug knowledge state
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
                {JSON.stringify(knowledgeState, null, 2)}
              </pre>
            </details>

            {chatError ? (
              <p className="mb-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
                {chatError}
              </p>
            ) : null}

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onSend();
                  }
                }}
                placeholder="Teach the learner..."
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
              <button
                type="button"
                onClick={() => void onSend()}
                disabled={!canSend}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {chatLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </section>

        <section className="flex min-h-[80vh] flex-col rounded-xl border border-zinc-300 bg-white">
          <div className="border-b border-zinc-200 p-4">
            <h2 className="text-lg font-semibold">Python Draft</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Single-file script mode with client-side Pyodide execution.
          </p>
        </div>

          <div className="flex-1 p-4">
            <textarea
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              className="h-full min-h-[300px] w-full rounded-md border border-zinc-300 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
              spellCheck={false}
            />
          </div>

          <div className="border-t border-zinc-200 p-4">
            <button
              type="button"
              onClick={() => void onRunCode()}
              disabled={runLoading}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-400"
            >
              {runLoading ? "Running..." : "Run"}
            </button>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <h3 className="mb-1 text-sm font-semibold">stdout</h3>
                <pre className="min-h-20 whitespace-pre-wrap text-xs text-zinc-700">
                  {stdout || "(empty)"}
                </pre>
              </div>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <h3 className="mb-1 text-sm font-semibold">stderr</h3>
                <pre className="min-h-20 whitespace-pre-wrap text-xs text-red-700">
                  {stderr || "(empty)"}
                </pre>
              </div>
            </div>
          </div>
        </section>
        </div>
      </main>
  );
}
