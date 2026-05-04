function MenuItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-2 rounded-md text-left
        transition
        ${active
          ? "bg-primary text-white"
          : "text-portal-muted-foreground dark:text-portal-text-muted hover:bg-white dark:hover:bg-portal-neutral hover:text-portal-foreground dark:hover:text-portal-text-strong"}
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  )
}
export { MenuItem };
