"use client";

import { useState, useTransition } from "react";
import { publishSupplierSheet, createShareLink } from "./actions";

export function SheetActions({
  sheetId,
  status,
}: {
  sheetId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPublish = () => {
    setError(null);
    startTransition(async () => {
      try {
        await publishSupplierSheet(sheetId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      }
    });
  };

  const onShare = () => {
    setError(null);
    startTransition(async () => {
      try {
        const token = await createShareLink(sheetId);
        setShareUrl(`${window.location.origin}/share/${token}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      }
    });
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex gap-2">
        {status !== "published" && (
          <button
            type="button"
            onClick={onPublish}
            disabled={pending}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Publier
          </button>
        )}
        <button
          type="button"
          onClick={onShare}
          disabled={pending || status !== "published"}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Generer un lien
        </button>
      </div>
      {shareUrl && (
        <p className="break-all text-xs text-zinc-500">
          Lien partageable :{" "}
          <a className="underline" href={shareUrl}>
            {shareUrl}
          </a>
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
