export default function Loader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-discord-lighter" />
        <div className="absolute inset-0 rounded-full border-2 border-discord-blurple border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 text-discord-muted text-sm">{text}</p>
    </div>
  );
}
