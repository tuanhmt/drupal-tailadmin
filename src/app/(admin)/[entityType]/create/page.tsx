"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Form from "@/components/form/Form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import Link from "next/link";

/**
 * Generic entity create form page
 * Route: /(admin)/[entityType]/create
 */
export default function EntityCreatePage({
  params,
}: {
  params: Promise<{ entityType: string }>;
}) {
  const router = useRouter();
  const { entityType } = use(params);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Format entity type for API
  const getApiEntityType = (type: string): string => {
    if (type.startsWith("taxonomy/")) {
      const vocab = type.replace("taxonomy/", "");
      return `taxonomy_term--${vocab}`;
    }
    if (type === "users" || type === "user") {
      return "user--user";
    }
    if (type.endsWith("s") && type !== "users") {
      const singular = type.slice(0, -1);
      return `node--${singular}`;
    }
    return `node--${type}`;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setValidationErrors({});

    try {
      const apiEntityType = getApiEntityType(entityType);
      const response = await fetch(`/api/${encodeURIComponent(apiEntityType)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            type: apiEntityType,
            attributes: formData,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle validation errors from Drupal
        if (errorData.errors) {
          const errors: Record<string, string> = {};
          errorData.errors.forEach((err: any) => {
            const field = err.source?.pointer?.split("/").pop() || "general";
            errors[field] = err.detail || err.title || "Validation error";
          });
          setValidationErrors(errors);
          return;
        }

        throw new Error(errorData.error || "Failed to create entity");
      }

      const result = await response.json();
      const createdId = result.data?.id;

      // Redirect to view page on success
      if (createdId) {
        router.push(`/${entityType}/${createdId}/view`);
      } else {
        router.push(`/${entityType}`);
      }
    } catch (err: any) {
      console.error("Error creating entity:", err);
      setError(err.message || "Failed to create entity. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Get common fields for entity type
  const getCommonFields = (): string[] => {
    // Common fields for different entity types
    if (entityType.startsWith("taxonomy/")) {
      return ["name"];
    }
    if (entityType === "users" || entityType === "user") {
      return ["name", "mail", "pass"];
    }
    // For nodes, common fields
    return ["title", "body"];
  };

  // Determine input type for a field
  const getInputType = (field: string): string => {
    if (field.includes("email") || field === "mail") return "email";
    if (field.includes("password") || field === "pass") return "password";
    if (field.includes("date")) return "date";
    if (field.includes("time")) return "time";
    if (field.includes("url")) return "url";
    return "text";
  };

  // Check if field is a textarea
  const isTextarea = (field: string): boolean => {
    return (
      field.includes("body") ||
      field.includes("description") ||
      field.includes("summary") ||
      field.includes("comment")
    );
  };

  // Format entity type label
  const getEntityLabel = (type: string): string => {
    if (type.startsWith("taxonomy/")) {
      const vocab = type.replace("taxonomy/", "");
      return vocab.charAt(0).toUpperCase() + vocab.slice(1);
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const commonFields = getCommonFields();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={`Create ${getEntityLabel(entityType)}`} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Create {getEntityLabel(entityType)}
          </h1>
          <Link href={`/${entityType}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <Form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {commonFields.map((field) => {
              const value = formData[field] || "";
              const fieldError = validationErrors[field];
              const isTextareaField = isTextarea(field);

              return (
                <div key={field}>
                  <Label htmlFor={field}>
                    {field.charAt(0).toUpperCase() +
                      field.slice(1).replace(/_/g, " ")}
                    {field === "title" || field === "name" ? " *" : ""}
                  </Label>
                  {isTextareaField ? (
                    <TextArea
                      value={value}
                      onChange={(val) => handleInputChange(field, val)}
                      rows={6}
                      error={!!fieldError}
                      hint={fieldError}
                    />
                  ) : (
                    <Input
                      type={getInputType(field)}
                      id={field}
                      name={field}
                      value={value}
                      onChange={(e) =>
                        handleInputChange(
                          field,
                          e.target.type === "number"
                            ? parseFloat(e.target.value) || 0
                            : e.target.value
                        )
                      }
                      error={!!fieldError}
                      hint={fieldError}
                      required={field === "title" || field === "name"}
                    />
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href={`/${entityType}`}>
                <Button type="button" variant="outline" disabled={saving}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
