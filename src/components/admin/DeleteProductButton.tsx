"use client";

import { useRef, useState, useTransition } from "react";
import { deleteProduct } from "@/app/admin/actions";

interface DeleteProductButtonProps {
  productId: string;
  productTitle: string;
  clickCount: number;
}

export default function DeleteProductButton({
  productId,
  productTitle,
  clickCount,
}: DeleteProductButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const hasClickHistory = clickCount > 0;

  function requestDelete() {
    if (hasClickHistory) {
      setIsOpen(true);
      return;
    }

    formRef.current?.requestSubmit();
  }

  function confirmDelete() {
    setIsOpen(false);
    startTransition(() => {
      formRef.current?.requestSubmit();
    });
  }

  return (
    <>
      <form ref={formRef} action={deleteProduct} className="hidden">
        <input type="hidden" name="id" value={productId} />
        <input type="hidden" name="confirm_delete" value="on" />
      </form>
      <button
        type="button"
        onClick={requestDelete}
        disabled={isPending}
        className="w-full rounded-lg bg-red-600 px-3 py-2 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Excluindo" : "Excluir"}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-black uppercase text-slate-950">Deseja excluir?</h3>
            <p className="mt-3 text-sm font-medium text-slate-600">
              O produto <strong>{productTitle}</strong> tem {clickCount} clique
              {clickCount === 1 ? "" : "s"} registrado{clickCount === 1 ? "" : "s"}.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Ao excluir, o produto sai da vitrine. O historico de cliques fica preservado, mas sem vinculo com o produto.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black uppercase text-slate-700"
              >
                Nao
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase text-white"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

