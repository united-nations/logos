import Link from "next/link";

export default function NotFound() {
    return (
        <main className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="text-center space-y-4">
                <h1 className="text-6xl font-bold text-foreground">404</h1>
                <p className="text-lg text-muted-foreground">Page not found</p>
                <Link
                    href="/"
                    className="inline-block mt-4 px-6 py-2 bg-un-blue text-white rounded-md hover:bg-un-blue/90 transition-colors"
                >
                    Back to Logo Selector
                </Link>
            </div>
        </main>
    );
}
