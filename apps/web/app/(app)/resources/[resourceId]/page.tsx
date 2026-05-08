import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type ResourcePageProps = {
  params: Promise<{
    resourceId: string;
  }>;
};

export default async function ResourcePage({ params }: ResourcePageProps) {
  const { resourceId } = await params;

  return <PrototypeFeaturePage recordId={resourceId} screenKey="resourceDetail" />;
}

