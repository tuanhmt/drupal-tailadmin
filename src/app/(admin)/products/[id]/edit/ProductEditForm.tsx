"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  updateProductAction,
  type TProductActionResult,
} from "../../actions";

interface InitialValues {
  id: string;
  title: string;
  body: string;
  status: boolean;
}

export function ProductEditForm({ initial }: { initial: InitialValues }) {
  const router = useRouter();
  const [state, formAction] = useFormState<
    TProductActionResult | undefined,
    FormData
  >(updateProductAction, undefined);

  // Navigate to the detail page on a successful save.
  useEffect(() => {
    if (state?.ok) {
      router.replace(`/products/${initial.id}`);
      router.refresh();
    }
  }, [state, router, initial.id]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={initial.id} />

      {state && !state.ok && (
        <div className="alert error">{state.error}</div>
      )}

      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="input"
          defaultValue={initial.title}
        />
      </div>

      <div className="field">
        <label htmlFor="body">Body</label>
        <textarea
          id="body"
          name="body"
          className="textarea"
          defaultValue={initial.body}
        />
      </div>

      <div className="field">
        <label
          htmlFor="status"
          style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
        >
          <input
            id="status"
            name="status"
            type="checkbox"
            defaultChecked={initial.status}
          />
          <span>Published</span>
        </label>
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}
