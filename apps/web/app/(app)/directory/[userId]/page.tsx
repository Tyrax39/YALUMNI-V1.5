import { DirectoryProfileDetail } from "@/components/alumni/directory-profile-detail";

type DirectoryProfilePageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function DirectoryProfilePage({ params }: DirectoryProfilePageProps) {
  const { userId } = await params;

  return <DirectoryProfileDetail userId={userId} />;
}
