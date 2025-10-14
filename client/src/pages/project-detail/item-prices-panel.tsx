import { FormEvent, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  useCreateItemPriceMutation,
  useDeleteItemPriceMutation,
  useItemPricesQuery
} from '../../query/item-prices';
import type { PriceCondition } from '../../api/item-prices';
import { formatRelativeTime } from '../../utils/relative-time';

const priceConditionOptions: PriceCondition[] = ['new', 'used'];

interface ItemPricesPanelProps {
  itemId: string;
  projectId: string | undefined;
}

export function ItemPricesPanel({ itemId, projectId }: ItemPricesPanelProps) {
  const [condition, setCondition] = useState<PriceCondition>('new');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [sourceUrl, setSourceUrl] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);

  const pricesQuery = useItemPricesQuery(itemId, true);
  const createPriceMutation = useCreateItemPriceMutation(itemId, projectId);
  const deletePriceMutation = useDeleteItemPriceMutation(itemId, projectId);

  const prices = pricesQuery.data?.data ?? [];
  const errorMessage = useMemo(
    () =>
      formError ??
      actionError ??
      (createPriceMutation.isError ? createPriceMutation.error.message : null) ??
      (deletePriceMutation.isError ? deletePriceMutation.error.message : null),
    [
      formError,
      actionError,
      createPriceMutation.isError,
      createPriceMutation.error,
      deletePriceMutation.isError,
      deletePriceMutation.error
    ]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setActionError(null);
    createPriceMutation.reset();

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setFormError('Amount must be a non-negative number.');
      return;
    }

    try {
      await createPriceMutation.mutateAsync({
        condition,
        amount: parsedAmount,
        currency: currency.trim().toUpperCase(),
        sourceUrl: sourceUrl.trim() ? sourceUrl.trim() : null,
        note: note.trim() ? note.trim() : null
      });

      setAmount('');
      setSourceUrl('');
      setNote('');
    } catch (error) {
      setActionError((error as Error).message);
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    setActionError(null);
    deletePriceMutation.reset();
    setPendingDeletionId(priceId);

    try {
      await deletePriceMutation.mutateAsync(priceId);
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setPendingDeletionId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-col gap-2 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Prices</h3>
          <p className="text-sm text-slate-500">
            Track new / used pricing to compare deals across sources.
          </p>
        </div>
        <span className="text-sm text-slate-500">
          {pricesQuery.isLoading
            ? 'Loading prices…'
            : prices.length
              ? `${prices.length} price point${prices.length === 1 ? '' : 's'}`
              : 'No prices recorded yet'}
        </span>
      </header>

      {pricesQuery.isError ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {(pricesQuery.error as Error).message}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Condition
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Currency
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Source
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Updated
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pricesQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-500">
                    Loading prices…
                  </td>
                </tr>
              ) : prices.length ? (
                prices.map((price) => {
                  const lastUpdated = price.updatedAt ?? price.createdAt;

                  return (
                    <tr key={price.id}>
                      <td className="px-4 py-3 capitalize text-slate-800">{price.condition}</td>
                      <td className="px-4 py-3 text-slate-800">{price.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-800">{price.currency}</td>
                      <td className="px-4 py-3 text-slate-800">
                        {price.sourceUrl ? (
                          <a
                            href={price.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            View source
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {price.note ? price.note : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {lastUpdated ? formatRelativeTime(lastUpdated) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeletePrice(price.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletePriceMutation.isPending && pendingDeletionId === price.id}
                        >
                          <Trash2 aria-hidden className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-500">
                    No prices recorded yet.
                  </td>
                </tr>
              )}
              <tr className="bg-slate-50">
                <td className="px-4 py-3">
                  <label className="sr-only" htmlFor={`price-condition-${itemId}`}>
                    Condition
                  </label>
                  <select
                    id={`price-condition-${itemId}`}
                    value={condition}
                    onChange={(event) => setCondition(event.target.value as PriceCondition)}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {priceConditionOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <label className="sr-only" htmlFor={`price-amount-${itemId}`}>
                    Amount
                  </label>
                  <input
                    id={`price-amount-${itemId}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="129.99"
                    required
                  />
                </td>
                <td className="px-4 py-3">
                  <label className="sr-only" htmlFor={`price-currency-${itemId}`}>
                    Currency
                  </label>
                  <input
                    id={`price-currency-${itemId}`}
                    type="text"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                    maxLength={3}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm uppercase shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="EUR"
                    required
                  />
                </td>
                <td className="px-4 py-3">
                  <label className="sr-only" htmlFor={`price-source-url-${itemId}`}>
                    Source URL
                  </label>
                  <input
                    id={`price-source-url-${itemId}`}
                    type="url"
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="https://shop.example.com/deal"
                  />
                </td>
                <td className="px-4 py-3">
                  <label className="sr-only" htmlFor={`price-note-${itemId}`}>
                    Notes
                  </label>
                  <textarea
                    id={`price-note-${itemId}`}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={1}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Includes extra grip kit"
                  />
                </td>
                <td className="px-4 py-3 text-slate-400">—</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                    disabled={createPriceMutation.isPending}
                  >
                    {createPriceMutation.isPending ? 'Adding…' : 'Add Price'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {errorMessage ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{errorMessage}</p>
        ) : null}
      </form>
    </div>
  );
}
