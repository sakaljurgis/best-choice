import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '../query/query-client';

function AppProviders({ children }: PropsWithChildren) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
}

export default AppProviders;
