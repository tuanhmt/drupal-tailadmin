import Image from "next/image"
import { Link } from "@/components/navigation/Link"
import { absoluteUrl, formatDate } from "@/lib/utils"
import type { DrupalNode } from "next-drupal"

interface ArticleTeaserProps {
  node: DrupalNode
}

export function ArticleTeaser({ node, ...props }: ArticleTeaserProps) {
  return (
    <article {...props}
      key={node.id}
      className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-800"
    >
    <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
      {node.title}
    </h2>

    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
      {formatDate(node.created)}
    </p>

    <p className="mb-4 text-gray-600 dark:text-gray-300 line-clamp-3">
      {node.body?.summary}
      {node.body?.summary && node.body?.summary.length >= 150 && "..."}
    </p>

    {node.path?.alias && (
      <Link
        href={node.path.alias}
        className="inline-flex items-center text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
      >
        Read more →
      </Link>
    )}
  </article>
  )
}
