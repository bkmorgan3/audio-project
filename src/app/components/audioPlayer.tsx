"use client"

import React, {useState, useRef, useEffect } from 'react'


export default function AudioPlayer() {
    const audioRef = useRef(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [audioFile, setAudioFile] = useState(null)
    const [fileURL, setFileURL] = useState(null)

    const handleFileChange = (event) => {
        const file = event?.target.files[0];
        if(file) {
            setAudioFile(file)
            setFileURL(URL.createObjectURL(file))
        }
    }

    return (
        <div>
            <input type="file" accept="audio/*" onChange={handleFileChange} />
            {audioFile && (
                <audio src={fileURL}></audio>
            )}
        </div>
    )
}