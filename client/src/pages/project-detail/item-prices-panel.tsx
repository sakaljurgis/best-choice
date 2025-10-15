import { FormEvent, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
  useCreateItemPriceMutation,
  useDeleteItemPriceMutation,
  useItemPricesQuery,
  useUpdateItemPriceMutation
} from '../../query/item-prices';
import type { PriceCondition } from '../../api/item-prices';
import { formatRelativeTime } from '../../utils/relative-time';

const getSourceDomainLabel = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return 'Source';
  }

  const normalizeHostname = (hostname: string) =>
    hostname.replace(/^www\./i, '') || hostname;

  try {
    const parsed = new URL(trimmed);
    const hostname = normalizeHostname(parsed.hostname);
    return hostname.length ? hostname : parsed.hostname || 'Source';
  } catch {
    try {
      const parsed = new URL(`https://${trimmed}`);
      const hostname = normalizeHostname(parsed.hostname);
      return hostname.length ? hostname : parsed.hostname || trimmed;
    } catch {
      const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//i, '');
      const slashIndex = withoutProtocol.indexOf('/');
      const candidate = (
        slashIndex === -1 ? withoutProtocol : withoutProtocol.slice(0, slashIndex)
      ).trim();
      return candidate.length ? candidate : trimmed;
    }
  }
};

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
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingCondition, setEditingCondition] = useState<PriceCondition>('new');
  const [editingAmount, setEditingAmount] = useState('');
  const [editingCurrency, setEditingCurrency] = useState('EUR');
  const [editingSourceUrl, setEditingSourceUrl] = useState('');
  const [editingNote, setEditingNote] = useState('');

  const pricesQuery = useItemPricesQuery(itemId, true);
  const createPriceMutation = useCreateItemPriceMutation(itemId, projectId);
  const deletePriceMutation = useDeleteItemPriceMutation(itemId, projectId);
  const updatePriceMutation = useUpdateItemPriceMutation(itemId, projectId);

  const prices = pricesQuery.data?.data ?? [];
  const sortedPrices = useMemo(
    () => [...prices].sort((first, second) => first.amount - second.amount),
    [prices]
  );
  const errorMessage = useMemo(
    () =>
      formError ??
      actionError ??
      (createPriceMutation.isError ? createPriceMutation.error.message : null) ??
      (deletePriceMutation.isError ? deletePriceMutation.error.message : null) ??
      (updatePriceMutation.isError ? updatePriceMutation.error.message : null),
    [
      formError,
      actionError,
      createPriceMutation.isError,
      createPriceMutation.error,
      deletePriceMutation.isError,
      deletePriceMutation.error,
      updatePriceMutation.isError,
      updatePriceMutation.error
    ]
  );

  const resetEditingState = () => {
    setEditingPriceId(null);
    setEditingCondition('new');
    setEditingAmount('');
    setEditingCurrency('EUR');
    setEditingSourceUrl('');
    setEditingNote('');
    updatePriceMutation.reset();
  };

  const startEditingPrice = (price: (typeof prices)[number]) => {
    setFormError(null);
    setActionError(null);
    updatePriceMutation.reset();
    setEditingPriceId(price.id);
    setEditingCondition(price.condition);
    setEditingAmount(price.amount.toFixed(2));
    setEditingCurrency(price.currency.toUpperCase());
    setEditingSourceUrl(price.sourceUrl ?? '');
    setEditingNote(price.note ?? '');
  };

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

  const handleCancelEditing = () => {
    setActionError(null);
    resetEditingState();
  };

  const handleUpdatePrice = async () => {
    if (!editingPriceId) {
      return;
    }

    setActionError(null);

    const trimmedAmount = editingAmount.trim();
    const parsedAmount = Number(trimmedAmount);

    if (trimmedAmount === '' || !Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setActionError('Amount must be a non-negative number.');
      return;
    }

    const trimmedCurrency = editingCurrency.trim().toUpperCase();

    if (!trimmedCurrency) {
      setActionError('Currency is required.');
      return;
    }

    setEditingCurrency(trimmedCurrency);

    const trimmedSourceUrl = editingSourceUrl.trim();
    const trimmedNote = editingNote.trim();

    try {
      await updatePriceMutation.mutateAsync({
        priceId: editingPriceId,
        payload: {
          condition: editingCondition,
          amount: parsedAmount,
          currency: trimmedCurrency,
          sourceUrl: trimmedSourceUrl ? trimmedSourceUrl : null,
          note: trimmedNote ? trimmedNote : null
        }
      });

      resetEditingState();
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
              ) : sortedPrices.length ? (
                sortedPrices.map((price) => {
                  const lastUpdated = price.updatedAt ?? price.createdAt;
                  const isEditing = editingPriceId === price.id;
                  const sourceLabel =
                    price.sourceUrl !== null && price.sourceUrl !== undefined
                      ? getSourceDomainLabel(price.sourceUrl)
                      : null;

                  return (
                    <tr key={price.id}>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <>
                            <label className="sr-only" htmlFor={`price-edit-condition-${price.id}`}>
                              Condition
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                id={`price-edit-condition-${price.id}`}
                                type="checkbox"
                                checked={editingCondition === 'new'}
                                onChange={(event) =>
                                  setEditingCondition(event.target.checked ? 'new' : 'used')
                                }
                                className="h-4 w-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-slate-700">New</span>
                            </div>
                          </>
                        ) : (
                          <span className="capitalize text-slate-800">{price.condition}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <>
                            <label className="sr-only" htmlFor={`price-edit-amount-${price.id}`}>
                              Amount
                            </label>
                            <input
                              id={`price-edit-amount-${price.id}`}
                              type="number"
                              min={0}
                              step="0.01"
                              value={editingAmount}
                              onChange={(event) => setEditingAmount(event.target.value)}
                              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="129.99"
                              required
                            />
                          </>
                        ) : (
                          <span className="text-slate-800">{price.amount.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <>
                            <label className="sr-only" htmlFor={`price-edit-currency-${price.id}`}>
                              Currency
                            </label>
                            <input
                              id={`price-edit-currency-${price.id}`}
                              type="text"
                              value={editingCurrency}
                              onChange={(event) =>
                                setEditingCurrency(event.target.value.toUpperCase())
                              }
                              maxLength={3}
                              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm uppercase shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="EUR"
                              required
                            />
                          </>
                        ) : (
                          <span className="text-slate-800">{price.currency}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <>
                            <label
                              className="sr-only"
                              htmlFor={`price-edit-source-url-${price.id}`}
                            >
                              Source URL
                            </label>
                            <input
                              id={`price-edit-source-url-${price.id}`}
                              type="url"
                              value={editingSourceUrl}
                              onChange={(event) => setEditingSourceUrl(event.target.value)}
                              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="https://shop.example.com/deal"
                            />
                          </>
                        ) : price.sourceUrl ? (
                          <a
                            href={price.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                            title={price.sourceUrl}
                          >
                            {sourceLabel}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <>
                            <label className="sr-only" htmlFor={`price-edit-note-${price.id}`}>
                              Notes
                            </label>
                            <textarea
                              id={`price-edit-note-${price.id}`}
                              value={editingNote}
                              onChange={(event) => setEditingNote(event.target.value)}
                              rows={1}
                              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="Includes extra grip kit"
                            />
                          </>
                        ) : price.note ? (
                          price.note
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {lastUpdated ? (
                          formatRelativeTime(lastUpdated)
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleUpdatePrice}
                              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-blue-400"
                              disabled={updatePriceMutation.isPending}
                            >
                              {updatePriceMutation.isPending ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditing}
                              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={updatePriceMutation.isPending}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingPrice(price)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={updatePriceMutation.isPending}
                            >
                              <Pencil aria-hidden className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePrice(price.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={
                                (deletePriceMutation.isPending && pendingDeletionId === price.id) ||
                                updatePriceMutation.isPending
                              }
                            >
                              <Trash2 aria-hidden className="h-4 w-4" />
                            </button>
                          </div>
                        )}
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
                  <div className="flex items-center gap-2">
                    <input
                      id={`price-condition-${itemId}`}
                      type="checkbox"
                      checked={condition === 'new'}
                      onChange={(event) => setCondition(event.target.checked ? 'new' : 'used')}
                      className="h-4 w-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">New</span>
                  </div>
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
