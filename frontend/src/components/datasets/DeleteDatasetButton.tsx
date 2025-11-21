"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { Button, type ButtonProps } from "@/components/ui/button";

interface DeleteDatasetButtonProps {
  onConfirm: () => Promise<void> | void;
  disabled?: boolean;
  isProcessing?: boolean;
  label?: string;
  title: string;
  description: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

export function DeleteDatasetButton(props: DeleteDatasetButtonProps) {
  const {
    onConfirm,
    disabled = false,
    isProcessing = false,
    label = "Delete",
    title,
    description,
    variant = "destructive",
    size = "sm",
  } = props;

  const [open, setOpen] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);

  async function handleConfirm(): Promise<void> {
    if (disabled || confirming) return;

    try {
      setConfirming(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setConfirming(false);
    }
  }

  const isDisabled = disabled || confirming || isProcessing;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          disabled={isDisabled}
          hidden={isDisabled}
          className="inline-flex cursor-pointer items-center gap-1 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-4 w-4" />
          <span>{label}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={confirming}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="cursor-pointer"
            disabled={isDisabled}
          >
            {confirming || isProcessing ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
