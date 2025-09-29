export default async function TranscribePage() {
    return <div className="container mx-auto px-4 py-12 text-yellow ">
        <h1>Transcribe page</h1>
        <div className="border border-red-400">
            <label htmlFor="audio-file-input">Choose an audio file:</label> <br />
            <input type="file" id="audio-file-input" accept="audio/*"></input>
        </div>
    </div>
}