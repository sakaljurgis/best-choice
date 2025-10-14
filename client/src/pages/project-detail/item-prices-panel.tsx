import { FormEvent, useMemo, useState } from 'react';
import { useCreateItemPriceMutation, useItemPricesQuery } from '../../query/item-prices';
import type { PriceCondition } from '../../api/item-prices';

const priceConditionOptions: PriceCondition[] = ['new', 'used'];

interface ItemPricesPanelProps {
  itemId: string;
}

export function ItemPricesPanel({ itemId }: ItemPricesPanelProps) {
  const [condition, setCondition] = useState<PriceCondition>('new');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [sourceUrl, setSourceUrl] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const pricesQuery = useItemPricesQuery(itemId, true);
  const createPriceMutation = useCreateItemPriceMutation(itemId);

  const prices = pricesQuery.data?.data ?? [];
  const creationError = useMemo(
    () => formError ?? (createPriceMutation.isError ? createPriceMutation.error.message : null),
    [formError, createPriceMutation.isError, createPriceMutation.error]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

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
      setFormError((error as Error).message);
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <form
          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
          onSubmit={handleSubmit}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600" htmlFor={`price-condition-${itemId}`}>
                Condition
              </label>
              <select
                id={`price-condition-${itemId}`}
                value={condition}
                onChange={(event) => setCondition(event.target.value as PriceCondition)}
                className="rounded-md border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {priceConditionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600" htmlFor={`price-amount-${itemId}`}>
                Amount
              </label>
              <input
                id={`price-amount-${itemId}`}
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="rounded-md border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="129.99"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600" htmlFor={`price-currency-${itemId}`}>
              Currency
            </label>
            <input
              id={`price-currency-${itemId}`}
              type="text"
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              maxLength={3}
              className="uppercase rounded-md border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="USD"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600" htmlFor={`price-source-url-${itemId}`}>
              Source URL
            </label>
            <input
              id={`price-source-url-${itemId}`}
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              className="rounded-md border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="https://shop.example.com/deal"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600" htmlFor={`price-note-${itemId}`}>
              Notes
            </label>
            <textarea
              id={`price-note-${itemId}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="rounded-md border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Includes extra grip kit"
            />
          </div>

          {creationError ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{creationError}</p>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              disabled={createPriceMutation.isPending}
            >
              {createPriceMutation.isPending ? 'Adding…' : 'Add Price'}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {prices.map((price) => (
            <article
              key={price.id}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
            >
              <header className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">
                  {price.condition} • {price.amount.toFixed(2)} {price.currency}
                </span>
              </header>
              <dl className="mt-2 space-y-1 text-xs text-slate-600">
                {price.sourceUrl ? (
                  <div>
                    <dt className="font-medium text-slate-500">Source URL</dt>
                    <dd>
                      <a
                        href={price.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View source
                      </a>
                    </dd>
                  </div>
                ) : null}
                {price.note ? (
                  <div>
                    <dt className="font-medium text-slate-500">Notes</dt>
                    <dd>{price.note}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="font-medium text-slate-500">Created</dt>
                  <dd>{new Date(price.createdAt).toLocaleString()}</dd>
                </div>
                {price.updatedAt !== price.createdAt ? (
                  <div>
                    <dt className="font-medium text-slate-500">Updated</dt>
                    <dd>{new Date(price.updatedAt).toLocaleString()}</dd>
                  </div>
                ) : null}
              </dl>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
