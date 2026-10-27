import React, { type PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: PropsWithChildren) {
  return <html lang="vi">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="color-scheme" content="only light" />
      <ScrollViewStyleReset />
      <style dangerouslySetInnerHTML={{ __html: ':root { color-scheme: only light; } body { background: #fdfefb; }' }} />
    </head>
    <body>{children}</body>
  </html>;
}
