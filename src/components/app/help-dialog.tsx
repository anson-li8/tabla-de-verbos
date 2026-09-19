"use client";

// ─────────────────────────────────────────────────────────────
// HelpDialog — "?" shortcut cheatsheet. Opens from the header
// button or the "?" key (handled in page.tsx). Lists every
// keyboard power tool the app supports.
// ─────────────────────────────────────────────────────────────

import { CornerDownLeft, Keyboard, MoveVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** one shortcut row: keys on the left, what they do on the right */
function ShortcutRow({
  keys,
  label,
  note,
}: {
  keys: string[];
  label: string;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-4 py-2.5">
      <span className="flex w-36 shrink-0 flex-wrap gap-1.5">
        {keys.map((k) => (
          <kbd
            key={k}
            className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border bg-muted/70 px-2 font-mono text-[11px] font-medium text-foreground shadow-xs"
          >
            {k}
          </kbd>
        ))}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">
          {label}
        </span>
        {note && (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {note}
          </span>
        )}
      </span>
    </div>
  );
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="keyboard shortcuts help"
          className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <Keyboard className="size-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl italic">
            <Keyboard className="size-5 text-primary" aria-hidden="true" />
            atajos de teclado
          </DialogTitle>
          <DialogDescription>
            power tools for fast practice — works everywhere in the app
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y">
          <ShortcutRow
            keys={["1", "2"]}
            label="switch modes"
            note="1 · tables — 2 · practice (T / P also work)"
          />
          <ShortcutRow
            keys={["?"]}
            label="toggle this cheatsheet"
          />
          <ShortcutRow
            keys={["Enter"]}
            label="submit your answer"
            note="practice mode — then press it again to continue"
          />
          <ShortcutRow
            keys={["Enter"]}
            label="walk the chart, then check it"
            note="tables mode — español → english → next row, check at the end"
          />
          <ShortcutRow
            keys={["↑", "↓"]}
            label="jump between rows"
            note="tables mode — same language, previous / next row"
          />
          <ShortcutRow
            keys={["←", "→"]}
            label="move between cells"
            note="tables mode — only at caret boundaries, so typing is untouched"
          />
        </div>

        <p className="flex items-start gap-2 rounded-lg bg-accent px-3 py-2.5 text-xs text-accent-foreground">
          <CornerDownLeft
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          accents count — tap the á é í ó ú keys under the answer box, or
          keep typing with your own keyboard layout
        </p>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <MoveVertical className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          installed as an app, Tabla de Verbos works fully offline — questions
          are generated right on your device
        </p>
      </DialogContent>
    </Dialog>
  );
}
