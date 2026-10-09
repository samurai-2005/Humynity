export default function Footer() {
  return (
    <footer className="w-full border-t border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark py-8 mt-auto z-10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-light dark:text-muted-dark">
        <div>
          &copy; {new Date().getFullYear()} <strong className="text-foreground-light dark:text-foreground-dark font-semibold">Humynity</strong>. 100% Protected Escrow Authorization.
        </div>

        <div className="flex flex-wrap items-center gap-6 font-medium">
          <a
            href="#"
            className="hover:text-foreground-light dark:hover:text-foreground-dark transition-colors"
          >
            Escrow SLA Policy
          </a>
          <a
            href="#"
            className="hover:text-foreground-light dark:hover:text-foreground-dark transition-colors"
          >
            Anonymity Standard
          </a>
          <a
            href="#"
            className="hover:text-foreground-light dark:hover:text-foreground-dark transition-colors"
          >
            Specialist Terms
          </a>
        </div>
      </div>
    </footer>
  );
}