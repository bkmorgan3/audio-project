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
            cancelAnimationFrame(animationRef.current!)
            setIsPlaying(false)
        } else {
            const source = ctx.createBufferSource()
            const analyser = ctx.createAnalyser()

            source.buffer = audioBuffer;
            source.connect(analyser)
            analyser.connect(ctx.destination)

            analyser.fftSize = 2048;
            analyserRef.current = analyser
            sourceRef.current = source

            source.start()
            setIsPlaying(true)

            // 
            drawVisualizer()
            source.onended = () => {
                setIsPlaying(false)
                cancelAnimationFrame(animationRef.current!)
            }
        }
    }

    const drawVisualizer = () => {
      const canvas = canvasRef.current
      const analyser = analyserRef.current
      if(!canvas || !analyser) return

      const ctx = canvas.getContext('2d')
      const bufferLength = analyser.fftSize
      const dataArray = new Uint8Array(bufferLength)

      const draw = () => {
        analyser.getByteTimeDomainData(dataArray)
        ctx!.fillStyle = '#111'
        ctx!.fillRect(0,0,canvas.width, canvas.height)

        ctx!.lineWidth = 2
        ctx!.strokeStyle = '#00ff88'
        ctx!.beginPath()
        const sliceWidth = canvas.width / bufferLength
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0
            const y = (v * canvas.height) / 2

            if (i === 0) ctx!.moveTo(x,y)
            else ctx!.lineTo(x,y)

            x += sliceWidth
        }
        ctx!.lineTo(canvas.width, canvas.height / 2)
        ctx!.stroke()

        animationRef.current = requestAnimationFrame(draw)
      }
      draw()
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