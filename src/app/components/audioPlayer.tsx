"use client"

import { useEffect, useRef, useState } from "react";

export const AudioPlayer = () => {
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    console.log('a', audioBuffer)

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
    return <section>
        <div className="border border-red-600 flex flex-col" >
            <label className="cursor-pointer" htmlFor="file">Upload a song</label>
            <input onChange={handleFile} className="hidden" type="file" id="file" accept="audio/*" />
            {audioBuffer && (
                <p className="mt-2 text-sm text-green-600">
                    Loaded {audioBuffer.duration.toFixed(2)} seconds of audio
                </p>
            )}
        </div>
    </section>
}