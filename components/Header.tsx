import Link from "next/link";

 export default function Header() {
 
    return(
        <header className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
                <div className="w-8 h-8 rounded-md bg-white grid text-base-color place-items-center">أ</div>
                
                <span>Arabic Pronounciation</span>
            </Link>

            <nav className="ml-auto hidden md:flex items-center gap-6 text-sm text-slate-600">
                <a className="hover:text-slate-900" href="/">Home</a>
                <a className="hover:text-slate-900" href="#">How it works</a>
                <a className="hover:text-slate-900" href="#">Contact Us</a>
                <a className="hover:text-slate-900" href="#">Privacy Policy</a>
            </nav>
            </div>
        </header>
    )
}