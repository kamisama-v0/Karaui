"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogConfirmInput,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/motion/dialog";
import { Button } from "@/components/motion/button";
import { Input } from "@/components/motion/input";

const PROJECT = "karaui-docs";

export function DialogPreview() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Ada Lovelace");
  const [handle, setHandle] = useState("ada");
  const [draftName, setDraftName] = useState(name);
  const [draftHandle, setDraftHandle] = useState(handle);
  const [deleted, setDeleted] = useState(false);
  const formId = useId();

  return (
    <div className="flex min-h-[360px] w-full flex-col items-center justify-center gap-6">
      <div className="flex w-full max-w-xs items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">
          {name.slice(0, 1).toUpperCase() || "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            @{handle} · {deleted ? "no projects" : PROJECT}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (next) {
              setDraftName(name);
              setDraftHandle(handle);
            }
            setOpen(next);
          }}
        >
          <DialogTrigger variant="secondary">
            <Pencil className="size-4" aria-hidden="true" />
            Edit profile
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Update how you appear across the workspace. Changes save when
                you press Save.
              </DialogDescription>
            </DialogHeader>
            <form
              id={formId}
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setName(draftName.trim() || name);
                setHandle(draftHandle.trim() || handle);
                setOpen(false);
              }}
            >
              <Input label="Name" value={draftName} onChange={setDraftName} />
              <Input
                label="Username"
                value={draftHandle}
                onChange={setDraftHandle}
                autoCapitalize="off"
              />
            </form>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <Button type="submit" form={formId}>
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog confirmText={PROJECT}>
          <AlertDialogTrigger
            variant="outline"
            disabled={deleted}
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete project
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {PROJECT}?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the project, its deployments and
                environment variables. This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogConfirmInput />
            <AlertDialogFooter>
              <AlertDialogCancel />
              <AlertDialogAction onClick={() => setDeleted(true)}>
                Delete project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {deleted ? (
        <button
          type="button"
          onClick={() => setDeleted(false)}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Restore project
        </button>
      ) : null}
    </div>
  );
}
