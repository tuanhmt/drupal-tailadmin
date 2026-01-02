import type { Metadata } from "next"
import { drupal } from "@/lib/drupal"
import PageBreadcrumb from "@/components/common/PageBreadCrumb"
import type { DrupalNode } from "next-drupal"
import { ArticleTeaser } from "@/components/drupal/ArticleTeaser"
import { getAccessToken } from "@/lib/auth/oauth2/get-access-token"

export const metadata: Metadata = {
  description: "A Next.js site powered by a Drupal backend.",
}

export default async function BlogPage() {
  let articles: DrupalNode[] = []

  const accessToken = await getAccessToken();

  try {
    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    articles = await drupal.getResourceCollection<DrupalNode[]>(
      "node--article",
      {
        params: {
          "filter[status]": 1,
          "fields[node--article]": "title,path,field_image,uid,created",
          include: "field_image,uid",
          sort: "-created",
        },
        withAuth: accessToken,
      }
    )
  } catch (error) {
    console.error("Error fetching articles:", error)
    // articles will remain an empty array, which will show the "No articles found" message
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Blog" />

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          Blog Articles
        </h1>

        {articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No articles found. Make sure your Drupal site is accessible and
              has article content.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleTeaser key={article.id} node={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

