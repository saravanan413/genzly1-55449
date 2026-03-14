
import React, { useState, useRef } from 'react';
import { Mic, Square, Send } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoice: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoice, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const sendVoiceMessage = () => {
    if (audioBlob) {
      onSendVoice(audioBlob, recordingTime);
      setAudioBlob(null);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioBlob) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1" />
        <span className="text-sm text-gray-500">{formatTime(recordingTime)}</span>
        <button
          onClick={sendVoiceMessage}
          className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90"
        >
          <Send size={16} />
        </button>
        <button
          onClick={() => {
            setAudioBlob(null);
            setRecordingTime(0);
          }}
          className="p-2 bg-gray-300 text-gray-700 rounded-full hover:bg-gray-400"
        >
          <Square size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {isRecording && (
        <span className="text-sm text-red-500 animate-pulse">
          {formatTime(recordingTime)}
        </span>
      )}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
          isRecording 
            ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}
      >
        {isRecording ? <Square size={20} /> : <Mic size={20} />}
      </button>
    </div>
  );
};

export default VoiceRecorder;
