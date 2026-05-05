# Upload Storage

YALUMNI uploads now use a shared storage adapter for profile photos and
verification evidence.

## Local Development

```text
UPLOAD_STORAGE_PROVIDER=LOCAL
VERIFICATION_UPLOAD_DIR=.local/uploads/verification
PROFILE_PHOTO_UPLOAD_DIR=.local/uploads/profile-photos
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
```

S3 keys are stored under:

```text
{UPLOAD_STORAGE_PREFIX}/verification-evidence/...
{UPLOAD_STORAGE_PREFIX}/profile-photos/...
```

The bucket must remain private. The API streams objects only after the same
member/admin authorization checks used by local storage.

## Remaining Production Work

- Bucket policy and lifecycle retention review.
- Malware scanning for verification evidence.
- Image processing for profile photo thumbnails.
- CDN or signed URL strategy if traffic requires it.
