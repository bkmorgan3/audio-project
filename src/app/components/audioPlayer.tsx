"use client"

import { useEffect, useRef, useState } from "react";

export const AudioPlayer = () => {
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const sourceRef = useRef<AudioBufferSourceNode | null>(null)
    const animationRef = useRef<number | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioContextRef.current = new AudioContext()
        }
    },[])

    const handleFile = (event: React.ChangeEvent<HTMLInputElement> ) => {
        const track = event.target.files?.[0];
        if (!track || !audioContextRef.current) return

        const reader = new FileReader()
        reader.onload = async e => {
            const arrayBuffer = e.target?.result
            if (!(arrayBuffer instanceof ArrayBuffer)) return

            try {
                const ctx = audioContextRef.current!;
                const decoded = await ctx.decodeAudioData(arrayBuffer)
                setAudioBuffer(decoded)
                drawWaveform(decoded)
            } catch (err) {
                console.error("error decoding audio", err)
            }
        }
        reader.readAsArrayBuffer(track) 
    }

    const togglePlay = () => {
        const ctx = audioContextRef.current
        if (!ctx || !audioBuffer) return

        if (isPlaying) {
            sourceRef.current?.stop()
            setIsPlaying(false)
        } else {
            const source = ctx.createBufferSource()
            source.buffer = audioBuffer;
            source.connect(ctx.destination)
            sourceRef.current = source
            source.start()
            setIsPlaying(true)
            source.onended = () => {
                setIsPlaying(false)
            }
        }
    }

    const drawWaveform = (buffer: AudioBuffer) => {
      const canvas = canvasRef.current 
      if (!canvas) return 
      const ctx = canvas.getContext('2d')
      if (!ctx) return 

      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      ctx.fillStyle = '#111'
      ctx.fillRect(0, 0, width, height)

      const channelData = buffer.getChannelData(0)
      const step = Math.ceil(channelData.length / width)
      const amp = height / 2

      ctx.lineWidth = 1;
      ctx.strokeStyle = '#00ff88'
      ctx.beginPath()

      for (let i = 0; i < width; i++) {
        let min = 1.0
        let max = -1.0
        for (let j = 0; j < step; j++) {
            const datum = channelData[i * step + j]
            if (datum < min) min = datum 
            if (datum > max) max = datum
        }
        ctx.moveTo(i, (1 + min) * amp)
        ctx.lineTo(i, (1 + max) * amp)
      }
      ctx.stroke()
    }
    return <section>
        <div className="border border-red-600 flex flex-col" >
            <label className="cursor-pointer" htmlFor="file">Upload a song</label>
            <input onChange={handleFile} className="hidden" type="file" id="file" accept="audio/*" />
            {audioBuffer && (
                <button onClick={togglePlay} className="mt-2 border border-green-500 rounded px-4 py-1">
                    {isPlaying ? "Stop" : "Play"}
                </button>
            )}
        </div>
        <canvas 
        ref={canvasRef}
        width={600}
        height={200}
        className="border border-gray-700 rounded bg-black"
        />
    </section>
}