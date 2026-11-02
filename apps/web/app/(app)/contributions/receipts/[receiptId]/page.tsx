import { ContributionReceiptSurface } from "@/components/contributions/contribution-surfaces";

type ContributionReceiptPageProps = {
  params: Promise<{
    receiptId: string;
  }>;
};

export default async function ContributionReceiptPage({ params }: ContributionReceiptPageProps) {
  const { receiptId } = await params;

  return <ContributionReceiptSurface receiptId={receiptId} />;
}
