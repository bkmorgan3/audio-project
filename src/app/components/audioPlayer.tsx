"use client"

import React, { useState, useRef, useEffect } from 'react'


export default function AudioPlayer() {
    const [audioFile, setAudioFile] = useState<File | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if(event.target.files && event.target.files.length > 0) {
            setAudioFile(event.target.files[0])
        }
    }

    const initializeAudioContext = () => {
        if(!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        return audioContextRef.current
    }

    const playAudio = async () => {
        if(!audioFile) return

        const audioContext = initializeAudioContext()
        const reader = new FileReader()

        reader.onload = async (e) => {
            if(e.target?.result instanceof ArrayBuffer) {
                try {
                    const audioBuffer = await audioContext.decodeAudioData(e.target.result)
                    const source = audioContext.createBufferSource()
                    source.buffer = audioBuffer
                    source.connect(audioContext.destination)
                    source.start(0)
                } catch(e) {
                    console.error('error decoding audio data', e)
                }
            }
        }
        reader.readAsArrayBuffer(audioFile)
    }

    return (
        <div>
           <input type="file" accept="audio/*" onChange={handleFileChange} />
           {audioFile && (
            <button onClick={playAudio}>Play</button>
           )}
        </div>
    )
}