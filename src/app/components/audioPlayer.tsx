"use client"

import { useRef, useState } from "react";

export const AudioPlayer = () => {
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
    const audioContextRef = useRef(new AudioContext())
    console.log('a', audioBuffer)

    const handleFile = (event: React.ChangeEvent<HTMLInputElement> ) => {
        const track = event.target.files?.[0];
        if (track) {
            const reader = new FileReader();
            reader.onload = async e => {
                if (e.target?.result instanceof ArrayBuffer) {
                    try {
                        const buffer = await audioContextRef.current.decodeAudioData(e.target.result)
                        setAudioBuffer(buffer)
                    } catch(err) {
                        console.error('Error decoding audio', err)
                    }
                }
                
           }
           reader.readAsArrayBuffer(track)
        }
    }
    return <section>
        <div className="border border-red-600 flex flex-col" >
            <label htmlFor="file">Upload a song</label>
            <input onChange={handleFile} className="hidden" type="file" id="file" accept="audio/*" />
        </div>
    </section>
}