import { ResourceDetail } from "@/components/resources/resource-surfaces";

type ResourcePageProps = {
  params: Promise<{
    resourceId: string;
  }>;
};

export default async function ResourcePage({ params }: ResourcePageProps) {
  const { resourceId } = await params;

  return <ResourceDetail resourceId={resourceId} />;
}
