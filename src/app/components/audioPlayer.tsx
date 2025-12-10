"use client";

import React, { useEffect, useRef, useState } from "react";

export const AudioPlayer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // playback bookkeeping
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [duration, setDuration] = useState<number>(0);

  // offset in seconds into the buffer when paused / before starting
  const offsetRef = useRef<number>(0);
  // when started, we record audioContext.currentTime so we can compute elapsed
  const startedAtRef = useRef<number>(0);

  const animationRef = useRef<number | null>(null);
  const isSeekingRef = useRef(false); // dragging flag

  function getAudioContext() {
    if (typeof window === 'undefined') return null 

    const Ctx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext}).webkitAudioContext 

    return Ctx ? new Ctx() : null
  }




  // Initialize audio context once
  useEffect(() => {
      audioContextRef.current = getAudioContext()
    // cleanup on unmount
    return () => {
      animationRef.current && cancelAnimationFrame(animationRef.current);
      try {
        sourceRef.current?.disconnect();
      } catch {}
      // don't close AudioContext automatically (optional)
    };
  }, []);

  // Resize canvas to container width (responsive)
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(container.clientWidth);
      const h = Math.floor(200); // static height; you can make this prop

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // also resize offscreen
      if (offscreenRef.current) {
        offscreenRef.current.width = canvas.width;
        offscreenRef.current.height = canvas.height;

        const offCtx = offscreenRef.current.getContext("2d");

        if (offCtx && audioBuffer) {
            offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawWaveformToOffscreen(audioBuffer, offCtx, canvas.width / dpr, canvas.height / dpr);
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBuffer]);

  // Utility: format seconds as mm:ss
  const formatTime = (t: number) => {
    if (!isFinite(t) || t < 0) t = 0;
    const mm = Math.floor(t / 60)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor(t % 60)
      .toString()
      .padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Handle file upload & decode
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioContextRef.current) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result;
      if (!(result instanceof ArrayBuffer)) return;
      try {
        const ctx = audioContextRef.current!;
        // decode audio data
        const decoded = await ctx.decodeAudioData(result.slice(0));
        setAudioBuffer(decoded);
        setDuration(decoded.duration);
        offsetRef.current = 0;
        // prepare offscreen canvas
        if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
        const canvas = canvasRef.current;
        const off = offscreenRef.current;
        if (!canvas || !off) return;
        const dpr = window.devicePixelRatio || 1;
        off.width = canvas.width;
        off.height = canvas.height;
        const offCtx = off.getContext("2d");
        if (!offCtx) return;
        offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawWaveformToOffscreen(decoded, offCtx, canvas.width / dpr, canvas.height / dpr);
        // draw initial frame to visible canvas
        drawFrame();
      } catch (err) {
        console.error("decode error", err);
      }
    };
    reader.readAsArrayBuffer(file);
    // reset input so same file re-selecting works
    e.currentTarget.value = "";
  };

  // Draw waveform into offscreen canvas (static)
  const drawWaveformToOffscreen = (buffer: AudioBuffer, ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0b0b0b"; // dark background
    ctx.fillRect(0, 0, width, height);

    // choose channel (mix if multiple)
    const channel = 0;
    let data = buffer.getChannelData(channel);
    // if more channels exist, mix down to first for waveform clarity (optional)
    if (buffer.numberOfChannels > 1) {
      // create a mixed copy
      const tmp = new Float32Array(buffer.length);
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const cd = buffer.getChannelData(ch);
        for (let i = 0; i < cd.length; i++) tmp[i] += cd[i] / buffer.numberOfChannels;
      }
      data = tmp;
    }

    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#00ff88";
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      const start = i * step;
      const end = Math.min(start + step, data.length);
      for (let j = start; j < end; j++) {
        const datum = data[j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      const y1 = (1 + min) * amp;
      const y2 = (1 + max) * amp;
      ctx.moveTo(i, y1);
      ctx.lineTo(i, y2);
    }
    ctx.stroke();

    // subtle center line
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, amp);
    ctx.lineTo(width, amp);
    ctx.stroke();
  };

  // Compute current playback time in seconds (taking playbackRate into account)
  const getCurrentTime = (): number => {
    const ctx = audioContextRef.current;
    if (!ctx || !audioBuffer) return offsetRef.current;
    if (!isPlaying) {
      return offsetRef.current;
    } else {
      const elapsed = (ctx.currentTime - startedAtRef.current) * playbackRate;
      const pos = offsetRef.current + elapsed;
      return Math.min(pos, audioBuffer.duration);
    }
  };

  // Draw the visible canvas: static waveform from offscreen + overlay progress + playhead
  const drawFrame = () => {
    const canvas = canvasRef.current;
    const off = offscreenRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    // draw static waveform from offscreen (if available)
    if (off) {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(off, 0, 0, w, h);
    } else {
      // fallback - solid background
      ctx.fillStyle = "#0b0b0b";
      ctx.fillRect(0, 0, w, h);
    }

    // if we have audioBuffer, draw played overlay and playhead
    if (audioBuffer) {
      const pos = getCurrentTime();
      const progress = Math.max(0, Math.min(1, pos / audioBuffer.duration));
      const playedX = progress * w;

      // played overlay (semi-transparent)
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)"; // darken unplayed, or change to lighten played
      // We'll darken the unplayed portion to make played segment pop:
      ctx.fillRect(playedX, 0, w - playedX, h);

      // draw a bright played line near left edge optionally
      ctx.fillStyle = "rgba(0,255,136,0.06)";
      ctx.fillRect(0, 0, playedX, h);

      // playhead (vertical line)
      ctx.strokeStyle = "#ff6b6b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playedX, 0);
      ctx.lineTo(playedX, h);
      ctx.stroke();

      // small circle indicator at center (optional)
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.arc(playedX, h / 2, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  // Animation loop when playing
  const startAnimation = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const loop = () => {
      drawFrame();
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    // draw final frame
    drawFrame();
  };

  // Create and start source from offsetRef.current
  const startPlayback = () => {
    const ctx = audioContextRef.current;
    const buffer = audioBuffer;
    if (!ctx || !buffer) return;
    // stop any old source
    try {
      sourceRef.current?.stop();
    } catch {}
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    source.connect(ctx.destination);

    // start from offsetRef.current
    const offset = Math.max(0, Math.min(offsetRef.current, buffer.duration));
    // start at time 0 (immediate), with buffer offset
    source.start(0, offset);
    source.onended = () => {
      // when natural end occurs, set states accordingly
      // Note: onended can fire because we manually stop too; check playing flag later
      setIsPlaying(false);
      offsetRef.current = 0; // reset to start (or set to duration to indicate ended)
      stopAnimation();
    };

    sourceRef.current = source;
    startedAtRef.current = ctx.currentTime;
    setIsPlaying(true);
    // start anim loop
    startAnimation();
  };

  // Stop playback and update offsetRef with the current position
  const stopPlayback = () => {
    const ctx = audioContextRef.current;
    if (!ctx || !audioBuffer) return;
    try {
      sourceRef.current?.stop();
    } catch {}
    // compute new offset based on elapsed time
    const elapsed = (ctx.currentTime - startedAtRef.current) * playbackRate;
    offsetRef.current = Math.max(0, Math.min(audioBuffer.duration, offsetRef.current + elapsed));
    setIsPlaying(false);
    stopAnimation();
  };

  const togglePlay = async () => {
    // resume audio context if needed (autoplay policy)
    if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume();
    }
    if (!audioBuffer) return;
    if (isPlaying) {
      stopPlayback();
    } else {
      // if at end, reset to 0
      if (offsetRef.current >= audioBuffer.duration - 0.001) {
        offsetRef.current = 0;
      }
      startPlayback();
    }
  };

  // When playbackRate changes while playing, we must restart source to apply new rate
  useEffect(() => {
    if (!isPlaying) return;
    // restart at current logical position
    const ctx = audioContextRef.current;
    if (!ctx || !audioBuffer) return;
    // compute current position before restarting
    const currentPos = getCurrentTime();
    offsetRef.current = currentPos;
    try {
      sourceRef.current?.stop();
    } catch {}
    // small tick to allow stop to propagate could be helpful, but we'll immediately create new source:
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = playbackRate;
    source.connect(ctx.destination);
    source.start(0, offsetRef.current);
    startedAtRef.current = ctx.currentTime;
    source.onended = () => {
      setIsPlaying(false);
      offsetRef.current = 0;
      stopAnimation();
    };
    sourceRef.current = source;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackRate]);

  // Canvas pointer event handling for seeking / dragging
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dragging = false;

    const getRelativeX = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      return Math.max(0, Math.min(rect.width, clientX - rect.left));
    };

    const pointerDown = (evt: PointerEvent) => {
      if (!audioBuffer) return;
      dragging = true;
      isSeekingRef.current = true;
      canvas.setPointerCapture(evt.pointerId);
      seekToClientX(getRelativeX(evt.clientX), true);
    };

    const pointerMove = (evt: PointerEvent) => {
      if (!dragging || !audioBuffer) return;
      seekToClientX(getRelativeX(evt.clientX), true);
    };

    const pointerUp = (evt: PointerEvent) => {
      if (!dragging || !audioBuffer) return;
      dragging = false;
      isSeekingRef.current = false;
      canvas.releasePointerCapture(evt.pointerId);
      seekToClientX(getRelativeX(evt.clientX), false);
    };

    canvas.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBuffer, isPlaying, playbackRate]);

   // Convert clientX on canvas to time and optionally start/stop playback or just set offset
  const seekToClientX = (clientX: number, isDrag: boolean) => {
    const canvas = canvasRef.current;
    const buffer = audioBuffer;
    if (!canvas || !buffer) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX));
    const progress = x / rect.width;
    const newTime = progress * buffer.duration;

    // If playing: restart source at newTime
    if (isPlaying) {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      try {
        sourceRef.current?.stop();
      } catch {}
      offsetRef.current = newTime;
      // start new source
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      source.connect(ctx.destination);
      source.start(0, offsetRef.current);
      startedAtRef.current = ctx.currentTime;
      source.onended = () => {
        setIsPlaying(false);
        offsetRef.current = 0;
        stopAnimation();
      };
      sourceRef.current = source;
      // ensure animation running
      if (!animationRef.current) startAnimation();
    } else {
      // not playing: just update offset and redraw frame
      offsetRef.current = newTime;
      drawFrame();
    }
  };

  // draw initial frame when audioBuffer loads or on manual redraw
  useEffect(() => {
    drawFrame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBuffer]);

  return (
    <section className="p-4">
      <div ref={containerRef} className="w-full">
        <div className="mb-2 flex items-center gap-4">
          <label className="cursor-pointer inline-flex items-center gap-2">
            <span className="px-3 py-1 bg-gray-800 text-white rounded">Upload</span>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFile}
              className="hidden"
            />
          </label>

          <button
            onClick={togglePlay}
            disabled={!audioBuffer}
            className="px-4 py-1 rounded border bg-white/5"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>

          <div className="flex items-center gap-2">
            <label className="text-sm">Speed</label>
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.05}
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              disabled={!audioBuffer}
              className="w-40"
            />
            <div className="w-12 text-sm text-right">{playbackRate.toFixed(2)}×</div>
          </div>

          <div className="ml-auto text-sm">
            {formatTime(getCurrentTime())} / {formatTime(duration)}
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full rounded border border-gray-700 bg-black cursor-pointer"
            style={{ height: 200 }}
          />
        </div>
      </div>
    </section>
  );
};

export default AudioPlayer;
