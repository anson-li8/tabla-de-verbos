"use client";

// ─────────────────────────────────────────────────────────────
// HelpDialog — "?" shortcut cheatsheet. Opens from the header
// button or the "?" key (handled in page.tsx). Lists every
// keyboard power tool the app supports, plus the local-data
// manager (export / import / wipe) — the app is fully static,
// so this is where learners control their own history.
// ─────────────────────────────────────────────────────────────

import {
  CornerDownLeft,
  Download,
  Keyboard,
  MoveVertical,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import {
  clearPracticeData,
  exportPracticeData,
  importPracticeData,
} from "@/components/practice/session-store";

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
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().slice(0, 10);

  const handleExport = () => {
    try {
      const json = exportPracticeData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tabla-de-verbos-backup-${today}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Backup downloaded",
        description:
          "Your sessions, streaks and freezes are in that file — import it on another device.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Couldn't build the backup",
        description: "Try again in a moment.",
      });
    }
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = importPracticeData(String(reader.result ?? ""));
      if (res.ok) {
        toast({
          title: "Backup restored",
          description: `${res.imported} entr${res.imported === 1 ? "y" : "ies"} imported — your records are up to date.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Import failed",
          description: res.error ?? "Couldn't read that file.",
        });
      }
    };
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: "Couldn't read that file! try again.",
      });
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    clearPracticeData();
    toast({
      title: "Practice history wiped",
      description:
        "Sessions, streaks and freezes are gone from this browser. ¡Empezamos de cero!",
    });
    onOpenChange(false);
  };

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
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl italic">
            <Keyboard className="size-5 text-primary" aria-hidden="true" />
            atajos de teclado
          </DialogTitle>
          <DialogDescription>
            keyboard shortcuts to improve your experience; works everywhere in the app
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y">
          <ShortcutRow
            keys={["1", "2", "3"]}
            label="switch modes"
            note="1 -> tables | 2 -> practice | 3 -> cards (T/P/C also work)"
          />
          <ShortcutRow
            keys={["?"]}
            label="toggle this cheatsheet"
          />
          <ShortcutRow
            keys={["Space"]}
            label="flip the flashcard"
            note="cards mode - also Enter, or just click the card"
          />
          <ShortcutRow
            keys={["←", "→"]}
            label="advance/go back the flashcard deck"
            note="cards mode"
          />
          <ShortcutRow
            keys={["S"]}
            label="hear the card in Spanish"
            note="cards mode - browser speech, works offline"
          />
          <ShortcutRow
            keys={["Enter"]}
            label="submit your answer"
            note="practice mode - then press it again to continue"
          />
          <ShortcutRow
            keys={["Enter"]}
            label="walk the chart, then check it"
            note="tables mode - español -> english -> next row, check at the end"
          />
          <ShortcutRow
            keys={["↑", "↓"]}
            label="jump between rows"
            note="tables mode - same language, previous / next row"
          />
          <ShortcutRow
            keys={["←", "→"]}
            label="move between cells"
            note="also in tables modes"
          />
        </div>

        <p className="flex items-start gap-2 rounded-lg bg-accent px-3 py-2.5 text-xs text-accent-foreground">
          <CornerDownLeft
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          accents count — tap the á é í ó ú keys under the answer box, or
          type with your own keyboard layout
        </p>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <MoveVertical className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          installed as an app, El Conjugador works fully offline — questions
          are generated right on your device
        </p>

        {/* ── local data manager (the app is 100% static) ── */}
        <section
          aria-label="your data"
          className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3.5"
        >
          <p className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            tus datos · 100% local
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            sessions, streaks &amp; mastery stay in this browser — no account,
            no server, nothing ever leaves your device. move your history
            wherever you like:
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              className="h-8 gap-1.5 rounded-lg px-3 font-mono text-[10px] uppercase tracking-[0.12em]"
            >
              <Download className="size-3.5" aria-hidden="true" />
              exportar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="h-8 gap-1.5 rounded-lg px-3 font-mono text-[10px] uppercase tracking-[0.12em]"
            >
              <Upload className="size-3.5" aria-hidden="true" />
              importar
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="import a backup file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = ""; // allow re-picking the same file
              }}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 rounded-lg border-destructive/25 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  borrar todo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display italic">
                    wipe your practice history?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Every session, streak, freeze and miss record stored in
                    this browser will be deleted. This can&apos;t be undone —
                    export a backup first if you might want it back.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg">
                    keep my data
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClear}
                    className="rounded-lg bg-destructive text-white hover:bg-destructive/90"
                  >
                    wipe everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
