'use client';

import React from 'react';
import Button from '@/components/Button';
import Link from 'next/link';

type PlaybackType = 'simultaneous' | 'ascending' | 'descending';

interface Note { name: string; frequency: number; }
interface Interval { name: string; semitones: number; }

const NOTES: Note[] = [
  { name: 'C4', frequency: 261.63 },
  { name: 'C#4', frequency: 277.18 },
  { name: 'D4', frequency: 293.66 },
  { name: 'D#4', frequency: 311.13 },
  { name: 'E4', frequency: 329.63 },
  { name: 'F4', frequency: 349.23 },
  { name: 'F#4', frequency: 369.99 },
  { name: 'G4', frequency: 392.0 },
  { name: 'G#4', frequency: 415.3 },
  { name: 'A4', frequency: 440.0 },
  { name: 'A#4', frequency: 466.16 },
  { name: 'B4', frequency: 493.88 },
];

const INTERVALS: Interval[] = [
  { name: 'Unison', semitones: 0 },
  { name: 'Minor 2nd', semitones: 1 },
  { name: 'Major 2nd', semitones: 2 },
  { name: 'Minor 3rd', semitones: 3 },
  { name: 'Major 3rd', semitones: 4 },
  { name: 'Perfect 4th', semitones: 5 },
  { name: 'Tritone', semitones: 6 },
  { name: 'Perfect 5th', semitones: 7 },
  { name: 'Minor 6th', semitones: 8 },
  { name: 'Major 6th', semitones: 9 },
  { name: 'Minor 7th', semitones: 10 },
  { name: 'Major 7th', semitones: 11 },
  { name: 'Octave', semitones: 12 },
];

let audioContext: AudioContext | null = null;
const getAudioContext = (): AudioContext => {
  if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioContext;
};

async function unlockAudio(): Promise<AudioContext> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.error('Failed to resume AudioContext', e);
      throw e;
    }
  }
  return ctx;
}

async function playNote(frequency: number, duration = 1): Promise<void> {
  const ctx = await unlockAudio();
  return new Promise((resolve, reject) => {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(frequency, now);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, now);
      const end = now + Math.max(0.05, duration);
      gain.gain.exponentialRampToValueAtTime(0.01, end);
      osc.start(now);
      osc.stop(end);
      osc.onended = () => resolve();
    } catch (e) {
      console.error('Audio playback error', e);
      reject(e);
    }
  });
}

async function playInterval(root: number, semitones: number, type: PlaybackType, duration = 1) {
  const second = root * Math.pow(2, semitones / 12);
  if (type === 'simultaneous') {
    await Promise.all([playNote(root, duration), playNote(second, duration)]);
  } else if (type === 'ascending') {
    await playNote(root, duration);
    await playNote(second, duration);
  } else {
    await playNote(second, duration);
    await playNote(root, duration);
  }
}

function getRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export default function IntervalTrainingPage() {
  const [score, setScore] = React.useState({ correct: 0, total: 0 });
  const [enabled, setEnabled] = React.useState<Interval[]>(INTERVALS.filter(i => ['Major 3rd', 'Perfect 5th', 'Perfect 4th'].includes(i.name)));
  const [currentInterval, setCurrentInterval] = React.useState<Interval | null>(null);
  const [currentNote, setCurrentNote] = React.useState<Note | null>(null);
  const [playback, setPlayback] = React.useState<PlaybackType>('simultaneous');
  const [selected, setSelected] = React.useState<Interval | null>(null);
  const [phase, setPhase] = React.useState<'guess' | 'result'>('guess');
  const [audioReady, setAudioReady] = React.useState(false);
  const [audioError, setAudioError] = React.useState<string | null>(null);

  const startQuestion = React.useCallback(async () => {
    const interval = getRandom(enabled);
    const note = getRandom(NOTES);
    setCurrentInterval(interval);
    setCurrentNote(note);
    setSelected(null);
    setPhase('guess');
    try {
      await playInterval(note.frequency, interval.semitones, playback);
    } catch (e) {
      // ignore, UI will show controls to retry
    }
  }, [enabled, playback]);

  const replay = React.useCallback(async () => {
    if (currentNote && currentInterval) {
      try {
        await playInterval(currentNote.frequency, currentInterval.semitones, playback);
      } catch (e) {
        // ignore
      }
    }
  }, [currentNote, currentInterval, playback]);

  const handleGuess = React.useCallback((ans: Interval) => {
    setSelected(ans);
    const correct = ans.name === currentInterval?.name;
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setPhase('result');
  }, [currentInterval]);

  React.useEffect(() => {
    // prepare first question lazily after mount; user will click Play First
  }, []);

  const scorePct = score.total ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Interval Training</h1>
          <div className="text-gray-600">Score: {score.correct}/{score.total} ({scorePct}%)</div>
        </div>
        <Link href="/" className="text-primary underline hover:text-red-700">Home</Link>
      </div>

      {!audioReady && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-3 flex items-center justify-between">
          <div>
            Enable audio to play intervals. Some browsers require a click before sound works.
            {audioError && <span className="ml-2 text-red-700">{audioError}</span>}
          </div>
          <Button
            variant="primary"
            onClick={async () => {
              try {
                await unlockAudio();
                await playNote(440, 0.15);
                setAudioReady(true);
                setAudioError(null);
              } catch (e) {
                setAudioError('Audio failed to start. Try clicking again.');
              }
            }}
          >
            Enable Sound
          </Button>
        </div>
      )}

      {/* Quiz section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
        {phase === 'guess' ? (
          <div className="space-y-4">
            <div className="text-lg font-medium">What interval was that?</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {enabled.map((it) => (
                <button key={it.name} className="px-3 py-2 rounded border hover:bg-gray-50 text-left" onClick={() => handleGuess(it)}>
                  {it.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="default" onClick={replay}>🔊 Replay</Button>
              {!currentInterval && (
                <Button variant="primary" onClick={startQuestion}>Play First</Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-4 rounded border ${selected?.name === currentInterval?.name ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="font-semibold mb-1">{selected?.name === currentInterval?.name ? '✓ Correct!' : '✗ Incorrect'}</div>
              <div className="text-sm text-gray-800">
                You guessed: <strong>{selected?.name}</strong><br />
                Correct answer: <strong>{currentInterval?.name}</strong>
              </div>
            </div>

            {currentNote && (
              <div>
                <div className="text-sm font-medium mb-2">Practice Mode — Root: {currentNote.name}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {INTERVALS.map((it) => (
                    <button
                      key={it.name}
                      className={`px-3 py-2 rounded border hover:bg-gray-50 text-left ${it.name === currentInterval?.name ? 'bg-primary/10 border-primary/30' : ''}`}
                      onClick={() => currentNote && playInterval(currentNote.frequency, it.semitones, playback)}
                    >
                      {it.name}{it.name === currentInterval?.name ? ' (Correct)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="primary" onClick={startQuestion}>Next Question</Button>
              <Button variant="default" onClick={replay}>🔊 Replay</Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <div className="font-semibold mb-2">Playback Style</div>
          <div className="flex gap-4 items-center">
            {(['simultaneous', 'ascending', 'descending'] as PlaybackType[]).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input type="radio" name="pb" value={t} checked={playback === t} onChange={() => setPlayback(t)} />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <div className="font-semibold mb-2">Enabled Intervals</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INTERVALS.map((it) => {
              const checked = enabled.some(e => e.name === it.name);
              const toggle = () => setEnabled(prev => {
                const on = prev.some(p => p.name === it.name);
                if (on && prev.length > 1) return prev.filter(p => p.name !== it.name);
                if (!on) return [...prev, it];
                return prev; // prevent turning off last one
              });
              return (
                <label key={it.name} className="flex items-center gap-2 text-sm border rounded px-2 py-1">
                  <input type="checkbox" checked={checked} onChange={toggle} />
                  {it.name}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
