export default function Footer() {
  return (
    <footer className="w-full border-t border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark py-8 mt-auto z-10 relative">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="text-sm text-muted-light dark:text-muted-dark">
          &copy; {new Date().getFullYear()} AnonGig. Escrow protected.
        </div>
        
        <div className="flex gap-6 text-sm font-medium text-muted-light dark:text-muted-dark">
          <a href="#" className="hover:text-foreground-light dark:hover:text-foreground-dark transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:text-foreground-light dark:hover:text-foreground-dark transition-colors">
            Escrow Policy
          </a>
          <a href="#" className="hover:text-foreground-light dark:hover:text-foreground-dark transition-colors">
            Privacy
          </a>
        </div>

      </div>
    </footer>
  );
}