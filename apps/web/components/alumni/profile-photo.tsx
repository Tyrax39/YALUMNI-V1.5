"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { downloadProfilePhoto } from "@/lib/api";

type ProfilePhotoProps = {
  accessToken: string;
  displayName: string;
  hasPhoto: boolean;
  sizeClassName: string;
  updatedAt?: string | null;
  userId: string;
};

export function ProfilePhoto({
  accessToken,
  displayName,
  hasPhoto,
  sizeClassName,
  updatedAt,
  userId
}: ProfilePhotoProps) {
  const [photoState, setPhotoState] = useState<{ key: string; objectUrl: string } | null>(null);
  const initials = useMemo(() => initialsForName(displayName), [displayName]);
  const photoKey = hasPhoto ? `${userId}:${updatedAt ?? ""}` : null;
  const objectUrl = photoState?.key === photoKey ? photoState.objectUrl : null;

  useEffect(() => {
    let isMounted = true;
    let nextObjectUrl: string | null = null;

    if (!photoKey) {
      return () => undefined;
    }

    downloadProfilePhoto(accessToken, userId)
      .then((blob) => {
        nextObjectUrl = URL.createObjectURL(blob);
        if (isMounted) {
          setPhotoState({ key: photoKey, objectUrl: nextObjectUrl });
        } else {
          URL.revokeObjectURL(nextObjectUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPhotoState((current) => (current?.key === photoKey ? null : current));
        }
      });

    return () => {
      isMounted = false;
      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [accessToken, photoKey, userId]);

  return (
    <div
      aria-label={`${displayName} profile photo`}
      className={`${sizeClassName} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-sm font-bold text-primary`}
    >
      {objectUrl ? (
        <Image
          alt=""
          className="h-full w-full object-cover"
          fill
          sizes="96px"
          src={objectUrl}
          unoptimized
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function initialsForName(displayName: string) {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "YA";
  }

  return parts.map((part) => part[0]?.toUpperCase()).join("");
}
