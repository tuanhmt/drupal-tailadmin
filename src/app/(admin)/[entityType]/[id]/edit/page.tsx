"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Form from "@/components/form/Form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import Link from "next/link";
import { AUTH_PATHS } from "@/lib/auth/constants";

/**
 * Generic entity edit form page
 * Route: /(admin)/[entityType]/[id]/edit
 */
export default function EntityEditPage({
  params,
}: {
  params: Promise<{ entityType: string; id: string }>;
}) {
  const router = useRouter();
  const { entityType, id } = use(params);

  const [entity, setEntity] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchEntity = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiEntityType = getApiEntityType(entityType);
        const response = await fetch(
          `/api/${encodeURIComponent(apiEntityType)}?id=${id}`
        );

        if (!response.ok) {
          if (response.status === 401) {
            router.push(AUTH_PATHS.SIGNIN);
            return;
          }
          if (response.status === 404) {
            setError("Entity not found");
            return;
          }
          throw new Error("Failed to fetch entity");
        }

        const result = await response.json();
        const entityData = result.data;
        setEntity(entityData);

        // Pre-fill form with entity data
        const attributes = entityData.attributes || entityData;
        setFormData(attributes);
      } catch (err) {
        console.error("Error fetching entity:", err);
        setError("Failed to load entity. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchEntity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, entityType]);

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
      const response = await fetch(
        `/api/${encodeURIComponent(apiEntityType)}?id=${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: {
              type: apiEntityType,
              id: id,
              attributes: formData,
            },
          }),
        }
      );

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

        throw new Error(errorData.error || "Failed to update entity");
      }

      // Redirect to view page on success
      router.push(`/${entityType}/${id}/view`);
    } catch (err: any) {
      console.error("Error updating entity:", err);
      setError(err.message || "Failed to update entity. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Get editable fields (exclude system fields)
  const getEditableFields = (): string[] => {
    if (!entity) return [];
    const attributes = entity.attributes || entity;
    return Object.keys(attributes).filter(
      (key) =>
        !key.startsWith("_") &&
        key !== "id" &&
        key !== "type" &&
        key !== "uuid" &&
        key !== "drupal_internal__" &&
        !key.includes("target_id")
    );
  };

  // Determine input type for a field
  const getInputType = (field: string, value: any): string => {
    if (field.includes("email")) return "email";
    if (field.includes("password")) return "password";
    if (field.includes("date")) return "date";
    if (field.includes("time")) return "time";
    if (field.includes("url")) return "url";
    if (typeof value === "number") return "number";
    return "text";
  };

  // Check if field is a textarea
  const isTextarea = (field: string, value: any): boolean => {
    return (
      field.includes("body") ||
      field.includes("description") ||
      field.includes("summary") ||
      field.includes("comment") ||
      (typeof value === "string" && value.length > 100)
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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Loading..." />
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Loading entity...</p>
        </div>
      </div>
    );
  }

  if (error && !entity) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Error" />
        <div className="text-center py-12">
          <p className="text-red-500 dark:text-red-400">{error}</p>
          <Link href={`/${entityType}`} className="mt-4 inline-block">
            <Button>Back to List</Button>
          </Link>
        </div>
      </div>
    );
  }

  const editableFields = getEditableFields();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={`Edit ${getEntityLabel(entityType)}`} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Edit {getEntityLabel(entityType)}
          </h1>
          <Link href={`/${entityType}/${id}/view`}>
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
            {editableFields.map((field) => {
              const value = formData[field];
              const fieldError = validationErrors[field];
              const isTextareaField = isTextarea(field, value);

              return (
                <div key={field}>
                  <Label htmlFor={field}>
                    {field.charAt(0).toUpperCase() +
                      field.slice(1).replace(/_/g, " ")}
                  </Label>
                  {isTextareaField ? (
                    <TextArea
                      value={value || ""}
                      onChange={(val) => handleInputChange(field, val)}
                      rows={6}
                      error={!!fieldError}
                      hint={fieldError}
                    />
                  ) : (
                    <Input
                      type={getInputType(field, value)}
                      id={field}
                      name={field}
                      value={value || ""}
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
                    />
                  )}
                </div>
              );
            })}

            {editableFields.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No editable fields found for this entity type.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href={`/${entityType}/${id}/view`}>
                <Button type="button" variant="outline" disabled={saving}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
