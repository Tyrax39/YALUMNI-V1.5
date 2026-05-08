import { PrototypeFeaturePage } from "@/components/platform/prototype-feature-page";

type ContributionReceiptPageProps = {
  params: Promise<{
    receiptId: string;
  }>;
};

export default async function ContributionReceiptPage({ params }: ContributionReceiptPageProps) {
  const { receiptId } = await params;

  return <PrototypeFeaturePage recordId={receiptId} screenKey="contributionReceipt" />;
}

