interface ErrorStateProps {
  title: string
  message: string
}

export const ErrorState = ({ title, message }: ErrorStateProps) => (
  <div role="alert" aria-live="assertive" className="rounded-panel border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
    <p className="font-semibold">{title}</p>
    <p className="mt-2">{message}</p>
  </div>
)
