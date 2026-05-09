import React from "react";

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
  headerActions?: React.ReactNode;
  bodyClassName?: string;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  headerActions,
  bodyClassName = "space-y-6",
}) => {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 ${className}`}
    >
      {/* Card Header */}
      <div
        className={
          headerActions
            ? "flex flex-col justify-between gap-5 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center dark:border-gray-800"
            : "border-b border-gray-200 px-6 py-5 dark:border-gray-800"
        }
      >
        <div>
          <h3
            className={
              headerActions
                ? "text-lg font-semibold text-gray-800 dark:text-white/90"
                : "text-base font-medium text-gray-800 dark:text-white/90"
            }
          >
            {title}
          </h3>
          {desc && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {desc}
            </p>
          )}
        </div>
        {headerActions ? <div className="flex gap-3">{headerActions}</div> : null}
      </div>

      {/* Card Body */}
      <div>
        <div className={bodyClassName}>{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
