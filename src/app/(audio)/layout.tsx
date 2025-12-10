// import Link from "next/link";

export default async function AudioLayout({children}: {children: React.ReactNode}) {
    return (
        <div className="flex min-h-screen flex-col">
            {/* <header className="border-b border-lime-400">
                <div className="container flex items-center justify-between h-16 mx-auto px-4 gap-8">
                    <Link href="/">Nothing</Link>
                <nav className="hidden md:flex border-red-200 gap-6">
                    <Link className="text-sm" href="/transcribe">Nothing</Link>
                    <Link className="text-sm" href="/results">Nothing</Link>
                    <Link className="text-sm" href="/favorites">Nothing</Link>
                </nav>

                </div>
            </header> */}
            <main>{children}</main>
            <footer>footer</footer>
        </div>
    )
}