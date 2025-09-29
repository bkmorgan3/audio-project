export default async function AudioLayout({children}: {children: React.ReactNode}) {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="border-b border-lime-400">header</header>
            <main>{children}</main>
            <footer>footer</footer>
        </div>
    )
}