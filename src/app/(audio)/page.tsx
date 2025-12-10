import { AudioPlayer } from "../components/audioPlayer";

export default async function LandingPage() {
    return (
        <div className="text-center">Welcome to a page that is going to do something
            <AudioPlayer />
        </div>
    )
}