import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function FlagBadge({ flagged, compact = false }: { flagged: boolean; compact?: boolean }) {
  if (flagged) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-signal-rose/30 bg-signal-rose/15 px-2.5 py-1 text-xs font-medium text-signal-rose">
        <AlertTriangle size={13} strokeWidth={2.5} />
        {!compact && "Flagged"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hull-600 bg-hull-800 px-2.5 py-1 text-xs font-medium text-hull-300">
      <CheckCircle2 size={13} strokeWidth={2.5} />
      {!compact && "Nominal"}
    </span>
  );
}
