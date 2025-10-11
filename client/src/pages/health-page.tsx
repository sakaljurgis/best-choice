import { useHealthQuery } from '../query/use-health-query';

function HealthPage() {
  const appName = import.meta.env.VITE_APP_NAME ?? 'BestChoice';
  const { data, isLoading, isError, error, refetch, isFetching } = useHealthQuery();

  const statusText = (() => {
    if (isLoading) {
      return 'loading...';
    }

    if (isError) {
      return 'unreachable';
    }

    return data?.status ?? 'unknown';
  })();

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-12 text-center text-slate-800">
      <h1 className="text-4xl font-semibold">{appName}</h1>
      <p className="text-lg">
        API status: <span className="font-medium text-blue-600">{statusText}</span>
      </p>
      <p className="text-sm text-slate-500">Service: {data?.service ?? 'n/a'}</p>
      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className="rounded-full bg-blue-600 px-5 py-2 text-white transition enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isFetching ? 'Refreshing…' : 'Refresh'}
      </button>
      {isError ? <p className="text-sm text-red-600">{(error as Error).message}</p> : null}
    </section>
  );
}

export default HealthPage;
