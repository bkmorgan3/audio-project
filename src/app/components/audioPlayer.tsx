"use client"

import { useEffect, useRef, useState } from "react";

export const AudioPlayer = () => {
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const sourceRef = useRef<AudioBufferSourceNode | null>(null)
    const animationRef = useRef<number | null>(null)

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
        console.log("drawing data here")
    }
    return <section>
        <div className="border border-red-600 flex flex-col" >
            <label className="cursor-pointer" htmlFor="file">Upload a song</label>
            <input onChange={handleFile} className="hidden" type="file" id="file" accept="audio/*" />
            {audioBuffer && (
                <button onClick={togglePlay} className="mt-2 border border-green-500 rounded px-4 py-1">
                    {isPlaying ? "Stop iiiit" : "Play"}
                </button>
            )}
        </div>
    </section>
}