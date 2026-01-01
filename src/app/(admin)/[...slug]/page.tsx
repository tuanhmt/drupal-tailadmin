import { draftMode } from "next/headers"
import { notFound } from "next/navigation"
import { getDraftData } from "next-drupal/draft"
import { Article } from "@/components/drupal/Article"
import { drupal } from "@/lib/drupal"
import type { Metadata, ResolvingMetadata } from "next"
import type { DrupalNode, JsonApiParams, JsonApiWithAuthOption } from "next-drupal"
import { getAccessToken } from "@/lib/auth-fetch"

async function getNode(slug: string[], options?: JsonApiParams & JsonApiWithAuthOption) {
  const path = `/${slug.join("/")}`

  const params: JsonApiParams = {}

  const draftData = await getDraftData()

  if (draftData.path === path) {
    params.resourceVersion = draftData.resourceVersion
  }

  // Translating the path also allows us to discover the entity type.
  const translatedPath = await drupal.translatePath(path, {
    ...params,
    ...options,
  })

  if (!translatedPath) {
    throw new Error("Resource not found", { cause: "NotFound" })
  }

  const type = translatedPath.jsonapi?.resourceName!
  const uuid = translatedPath.entity.uuid

  if (type === "node--article") {
    params.include = "field_image,uid"
  }

  const resource = await drupal.getResource<DrupalNode>(type, uuid, {
    ...params,
    ...options,
  })

  if (!resource) {
    throw new Error(
      `Failed to fetch resource: ${translatedPath?.jsonapi?.individual}`,
      {
        cause: "DrupalError",
      }
    )
  }

  return resource
}

type NodePageParams = {
  slug: string[]
}
type NodePageProps = {
  params: Promise<NodePageParams>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function NodePage(props: NodePageProps) {
  const params = await props.params

  const { slug } = params

  const draft = await draftMode()
  const isDraftMode = draft.isEnabled

  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error("Not authenticated")
  }

  let node
  try {
    node = await getNode(slug, {
      withAuth: accessToken,
    })
  } catch (error) {
    // If getNode throws an error, tell Next.js the path is 404.
    notFound()
  }

  // If we're not in draft mode and the resource is not published, return a 404.
  if (!isDraftMode && node?.status === false) {
    notFound()
  }

  return (
    <>
      {node.type === "node--article" && <Article node={node} />}
    </>
  )
}
