# Upload Storage

YALUMNI uploads now use a shared storage adapter for profile photos,
verification evidence, community post media, and contribution expense evidence.

## Local Development

```text
UPLOAD_STORAGE_PROVIDER=LOCAL
VERIFICATION_UPLOAD_DIR=.local/uploads/verification
PROFILE_PHOTO_UPLOAD_DIR=.local/uploads/profile-photos
COMMUNITY_POST_MEDIA_UPLOAD_DIR=.local/uploads/community-post-media
CONTRIBUTION_EXPENSE_EVIDENCE_UPLOAD_DIR=.local/uploads/contribution-expense-evidence
```

Local storage keeps relative keys on disk under the configured upload
directories. The API still permission-checks every download.

## S3-Compatible Private Storage

```text
UPLOAD_STORAGE_PROVIDER=S3
UPLOAD_STORAGE_PREFIX=yalumni
S3_ENDPOINT_URL=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
S3_REGION=
S3_CONNECT_TIMEOUT_SECONDS=3
S3_READ_TIMEOUT_SECONDS=10
S3_MAX_ATTEMPTS=3
```

S3 keys are stored under:

```text
{UPLOAD_STORAGE_PREFIX}/verification-evidence/...
{UPLOAD_STORAGE_PREFIX}/profile-photos/...
{UPLOAD_STORAGE_PREFIX}/community-post-media/...
{UPLOAD_STORAGE_PREFIX}/contribution-expense-evidence/...
```

The bucket must remain private. The API streams objects only after the same
member/admin authorization checks used by local storage.

S3 calls use bounded connection/read timeouts and standard retry behavior. Keep
the values positive and conservative so an unavailable storage provider cannot
hold API or owner-probe requests indefinitely.

## Remaining Production Work

- Bucket policy and lifecycle retention review.
- Malware scanning for verification and contribution expense evidence.
- Image processing for profile photo thumbnails.
- CDN or signed URL strategy if traffic requires it.
