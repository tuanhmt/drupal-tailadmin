"use client";

import { useTransition } from "react";
import { deleteProductAction } from "../actions";

export function DeleteProductButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (pending) return;
    if (!confirm("Delete this product? This cannot be undone.")) return;

    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deleteProductAction(fd);
    });
  }

  return (
    <button
      type="button"
      className="btn danger"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
