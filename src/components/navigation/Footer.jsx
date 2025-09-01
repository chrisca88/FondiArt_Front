export default function Footer(){
  return (
    <footer className="border-t mt-10 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between">
        <span>© {new Date().getFullYear()} FondiArt</span>
        <a href="#">Privacidad & Términos</a>
      </div>
    </footer>
  )
}
