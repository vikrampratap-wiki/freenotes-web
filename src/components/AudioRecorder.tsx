import React, { useState, useRef, useEffect } from 'react';
import { AudioRecording } from '../types';
import { Mic, Square, Play, Pause, Trash2, Volume2, Clock } from 'lucide-react';

interface Props {
  recordings: AudioRecording[];
  onAddRecording: (recording: AudioRecording) => void;
  onDeleteRecording: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AudioRecorder: React.FC<Props> = ({
  recordings,
  onAddRecording,
  onDeleteRecording,
  isOpen,
  onClose,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, []);

  if (!isOpen) return null;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const newRec: AudioRecording = {
          id: 'rec_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
          url: audioUrl,
          duration: recordingTime,
          createdAt: Date.now(),
          name: `Lecture Memo ${recordings.length + 1}`,
        };

        onAddRecording(newRec);
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone access is required to record audio lectures.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const togglePlayAudio = (rec: AudioRecording) => {
    if (activePlayingId === rec.id) {
      currentAudioRef.current?.pause();
      setActivePlayingId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }

    const audio = new Audio(rec.url);
    currentAudioRef.current = audio;
    setActivePlayingId(rec.id);

    audio.onended = () => {
      setActivePlayingId(null);
    };

    audio.play().catch((err) => {
      console.error(err);
      setActivePlayingId(null);
    });
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed top-20 right-6 z-40 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-4 select-none">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600">
            <Mic size={16} />
          </div>
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
            Audio Lecture Recorder
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-1 rounded"
        >
          ✕
        </button>
      </div>

      {/* Recording Status & Action Button */}
      <div className="flex items-center justify-between my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="font-mono font-bold text-red-600 text-sm">
                {formatSeconds(recordingTime)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock size={13} /> Tap mic to start recording
            </span>
          )}
        </div>

        {isRecording ? (
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/20"
          >
            <Square size={13} fill="currentColor" /> Stop
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20"
          >
            <Mic size={13} /> Record
          </button>
        )}
      </div>

      {/* List of Previous Recordings */}
      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Saved Recordings ({recordings.length})
        </div>

        {recordings.length === 0 ? (
          <div className="text-xs text-slate-400 py-3 text-center">
            No audio notes recorded yet for this notebook.
          </div>
        ) : (
          recordings.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/60 transition-all text-xs"
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePlayAudio(rec)}
                  className={`p-1.5 rounded-lg ${
                    activePlayingId === rec.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-700 text-blue-600 hover:bg-blue-50'
                  }`}
                  title="Play / Pause"
                >
                  {activePlayingId === rec.id ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                    {rec.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {formatSeconds(rec.duration)} • {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDeleteRecording(rec.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                title="Delete Recording"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
