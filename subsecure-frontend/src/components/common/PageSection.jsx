export default function PageSection({ title, action, children }) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-navy-800 uppercase tracking-wide">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
