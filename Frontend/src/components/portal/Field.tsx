function Field({ label, children }) {
  return (
    <div className="bg-gray-50 dark:bg-portal-neutral rounded-0 px-4 py-3">
      <span className="block text-sm text-gray-500 dark:text-portal-text-muted mb-1">{label}</span>
      <span className="block text-gray-900 dark:text-portal-text-strong font-medium">{children}</span>
    </div>
  );
}
export { Field };
