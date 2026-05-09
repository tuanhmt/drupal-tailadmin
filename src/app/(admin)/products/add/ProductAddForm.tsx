"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";
import {
  createProductAction,
  type TProductActionResult,
} from "../actions";

export function ProductAddForm() {
  const router = useRouter();
  const [status, setStatus] = useState(true);
  const [state, formAction] = useActionState<
    TProductActionResult | undefined,
    FormData
  >(createProductAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      if (state.id) {
        router.replace(`/products/${state.id}`);
      } else {
        router.replace("/products");
      }
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.ok && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-900/40 dark:bg-error-500/10 dark:text-error-400">
          {state.error}
        </div>
      )}

      <div>
        <Label htmlFor="title">
          Title <span className="text-error-500">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          type="text"
          required
          placeholder="Enter product title"
        />
      </div>

      <div>
        <Label htmlFor="body">Body</Label>
        <textarea
          id="body"
          name="body"
          rows={6}
          placeholder="Write product description"
          className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        />
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <input type="hidden" name="status" value={status ? "true" : "false"} />
        <Checkbox id="status" checked={status} onChange={setStatus} label="Published" />
      </div>

      <FormActions />
    </form>
  );
}

function FormActions() {
  const { pending } = useFormStatus();
  return (
    <div className="flex items-center gap-3">
      <Button size="sm" type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create Product"}
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/products">Cancel</Link>
      </Button>
    </div>
  );
}
