import AudioPlayer from "@/app/components/audioPlayer"

export default async function TranscribePage() {
    return <div className="container mx-auto px-4 py-12 text-yellow ">
        <h1>Hello, Please upload a file to get started</h1>
        <div>
            <AudioPlayer />
        </div>
    </div>
}