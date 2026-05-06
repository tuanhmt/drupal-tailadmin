"use client";

import { useTransition } from "react";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { deleteProductAction } from "../actions";

export function DeleteProductButton({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const { isOpen, openModal, closeModal } = useModal();

  function onConfirmDelete() {
    if (pending) return;

    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      try {
        await deleteProductAction(fd);
      } finally {
        closeModal();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={className ?? "inline-flex items-center justify-center rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-60"}
        onClick={openModal}
        disabled={pending}
      >
        {pending ? "Deleting..." : "Delete"}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={pending ? () => {} : closeModal}
        className="max-w-[520px] p-5 lg:p-8"
      >
        <h4 className="mb-3 text-title-sm font-semibold text-gray-800 dark:text-white/90">
          Delete product?
        </h4>
        <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
          This action cannot be undone. The product and related references may no
          longer be accessible.
        </p>

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={closeModal}
            disabled={pending}
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Deleting..." : "Yes, delete"}
          </button>
        </div>
      </Modal>
    </>
  );
}
